/**
 * Screenshot Handler — Captures PNG screenshots of canvas sections or the full canvas.
 *
 * Three modes:
 * - Full: Captures the entire canvas with padding
 * - Shapes: Captures specific shapes by ID
 * - Section: Crops a named section with 125% context (shows neighboring sections)
 *
 * @module engine/screenshot-handler
 */

import type { Editor } from "tldraw";
import { PEN_FRAME_TYPE } from "../shapes/PenFrameUtil";
import { sectionNameMap, persistSectionMap } from "./section-manager";

interface ScreenshotRequest {
  requestId: string;
  sectionName?: string;
  shapeIds?: string[];
  mode?: "section" | "full";
}

interface ScreenshotResult {
  requestId: string;
  image: string;
  width: number;
  height: number;
  mode: string;
  sectionName?: string;
  viewport?: { x: number; y: number; w: number; h: number };
  error?: string;
}

/** Handle a screenshot request and return the result to send over WebSocket. */
export async function handleScreenshot(editor: Editor, msg: ScreenshotRequest): Promise<ScreenshotResult> {
  const allShapes = editor.getCurrentPageShapes();
  if (allShapes.length === 0) {
    return { requestId: msg.requestId, image: "", width: 0, height: 0, mode: "error", error: "No shapes on canvas" };
  }

  const { sectionName, shapeIds, mode } = msg;

  // ── Mode: Full canvas ──────────────────────────────────────────────────────
  if (mode === "full" || (!sectionName && !shapeIds?.length)) {
    const result = await editor.toImage(allShapes, {
      format: "png",
      pixelRatio: 2,
      background: true,
      padding: 40,
    });

    const base64 = await blobToBase64(result.blob);
    return { requestId: msg.requestId, image: base64, width: result.width, height: result.height, mode: "full" };
  }

  // ── Mode: Specific shapes ──────────────────────────────────────────────────
  if (shapeIds?.length) {
    const idSet = new Set(shapeIds);
    const targetShapes = allShapes.filter(s => idSet.has(s.id));
    if (targetShapes.length === 0) {
      return { requestId: msg.requestId, image: "", width: 0, height: 0, mode: "error", error: "No shapes found for given IDs" };
    }
    const result = await editor.toImage(targetShapes, { format: "png", pixelRatio: 2, background: true, padding: 32 });
    const base64 = await blobToBase64(result.blob);
    return { requestId: msg.requestId, image: base64, width: result.width, height: result.height, mode: "shapes" };
  }

  // ── Mode: Section screenshot (cropped view) ────────────────────────────────
  if (!sectionName) {
    return { requestId: msg.requestId, image: "", width: 0, height: 0, mode: "error", error: "No sectionName or shapeIds provided" };
  }

  // 1. Find section frame (fast path: map lookup, fallback: canvas scan)
  const sectionShapeId = [...sectionNameMap.entries()].find(([, name]) => name === sectionName)?.[0];
  let sectionFrame = sectionShapeId ? allShapes.find(s => s.id === sectionShapeId) : undefined;

  if (!sectionFrame) {
    const fallback = allShapes.find(s => s.type === PEN_FRAME_TYPE && (s.props as any).name === sectionName);
    if (fallback) {
      sectionFrame = fallback;
      sectionNameMap.set(fallback.id, sectionName);
      persistSectionMap();
      console.log(`[sections] self-healed '${sectionName}' → ${fallback.id}`);
    }
  }

  if (!sectionFrame) {
    const known = [...new Set(sectionNameMap.values())].join(", ") || "none registered";
    return { requestId: msg.requestId, image: "", width: 0, height: 0, mode: "error", error: `Section '${sectionName}' not found. Known sections: ${known}` };
  }

  // 2. Compute section bounds
  const sectionPageBounds = editor.getShapePageBounds(sectionFrame);
  if (!sectionPageBounds) {
    return { requestId: msg.requestId, image: "", width: 0, height: 0, mode: "error", error: `Could not compute bounds for section '${sectionName}'` };
  }

  // 3. Compute 125% viewport (12.5% padding on each side)
  const padY = Math.max(40, Math.round(sectionPageBounds.h * 0.125));
  const padX = Math.max(20, Math.round(sectionPageBounds.w * 0.05));
  const viewport = {
    x: sectionPageBounds.x - padX,
    y: sectionPageBounds.y - padY,
    w: sectionPageBounds.w + padX * 2,
    h: sectionPageBounds.h + padY * 2,
  };

  // 4. Render ALL shapes (so neighboring sections appear)
  const fullResult = await editor.toImage(allShapes, { format: "png", pixelRatio: 2, background: true, padding: 40 });

  // 5. Compute full canvas bounds
  let fullMinX = Infinity, fullMinY = Infinity, fullMaxX = -Infinity, fullMaxY = -Infinity;
  for (const s of allShapes) {
    const b = editor.getShapePageBounds(s);
    if (b) {
      fullMinX = Math.min(fullMinX, b.x);
      fullMinY = Math.min(fullMinY, b.y);
      fullMaxX = Math.max(fullMaxX, b.x + b.w);
      fullMaxY = Math.max(fullMaxY, b.y + b.h);
    }
  }
  const canvasPadding = 40;
  const canvasBounds = {
    x: fullMinX - canvasPadding,
    y: fullMinY - canvasPadding,
    w: (fullMaxX - fullMinX) + canvasPadding * 2,
    h: (fullMaxY - fullMinY) + canvasPadding * 2,
  };

  // 6. Map viewport to pixel coordinates
  const PIXEL_RATIO = 2;
  const imgW = fullResult.width;
  const imgH = fullResult.height;
  const scaleX = (imgW * PIXEL_RATIO) / canvasBounds.w;
  const scaleY = (imgH * PIXEL_RATIO) / canvasBounds.h;

  const cropX = Math.max(0, Math.round((viewport.x - canvasBounds.x) * scaleX));
  const cropY = Math.max(0, Math.round((viewport.y - canvasBounds.y) * scaleY));
  const cropW = Math.min(Math.round(viewport.w * scaleX), imgW * PIXEL_RATIO - cropX);
  const cropH = Math.min(Math.round(viewport.h * scaleY), imgH * PIXEL_RATIO - cropY);

  // 7. Crop using offscreen canvas
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext("2d")!;

  const img = new Image();
  const fullBase64 = await blobToBase64(fullResult.blob);
  img.src = fullBase64;
  await new Promise<void>((resolve) => { img.onload = () => resolve(); });

  cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const croppedBase64 = cropCanvas.toDataURL("image/png");
  return {
    requestId: msg.requestId,
    image: croppedBase64,
    width: Math.round(cropW / PIXEL_RATIO),
    height: Math.round(cropH / PIXEL_RATIO),
    mode: "section",
    sectionName,
    viewport,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
