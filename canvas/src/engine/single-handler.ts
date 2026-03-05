/**
 * Single Handler — Processes individual (non-batch) WebSocket commands.
 *
 * Handles snapshot, clear, zoom_to_fit, export, and single create operations.
 * For batch create/update/delete, see batch-handler.ts.
 *
 * @module engine/single-handler
 */

import {
  createShapeId,
  type Editor,
  type TLGeoShape,
} from "tldraw";
import { layoutTree, type PenNode } from "../lib/layout-engine";
import { resolveRefs } from "../lib/components";
import { PEN_FRAME_TYPE } from "../shapes/PenFrameUtil";
import { PEN_TEXT_TYPE } from "../shapes/PenTextUtil";
import { clearSectionMaps, registerSection } from "./section-manager";
import { createFlatShape } from "./shape-factory";
import {
  DEFAULT_FRAME_WIDTH,
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_GEO_WIDTH,
  DEFAULT_GEO_HEIGHT,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_FONT_SIZE,
  ZOOM_ANIMATION_DURATION_MS,
} from "./defaults";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SingleCommand {
  type: string;
  requestId: string;
  [key: string]: unknown;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/** Handle a single (non-batch) WebSocket command. */
export function handleSingle(editor: Editor, cmd: SingleCommand): Record<string, unknown> {
  const base = { requestId: cmd.requestId };

  switch (cmd.type) {
    case "create": {
      const shape = cmd.shape as Record<string, unknown> | undefined;
      if (!shape) return { ...base, error: "Missing shape" };
      const id = createShapeId();
      const hasChildren = Array.isArray(shape.children) && (shape.children as unknown[]).length > 0;

      if (shape.type === "pen-frame" && hasChildren) {
        const rootNode: PenNode = {
          type: "frame",
          layout: (shape.layout as PenNode["layout"]) || "vertical",
          fill: shape.fill as string,
          cornerRadius: shape.cornerRadius as number,
          borderColor: shape.borderColor as string,
          borderWidth: shape.borderWidth as number,
          name: shape.name as string,
          gap: shape.gap as number,
          padding: shape.padding as number | number[],
          width: (shape.width as number) || DEFAULT_FRAME_WIDTH,
          height: (shape.height as number) || DEFAULT_FRAME_HEIGHT,
          children: shape.children as PenNode[],
        };

        const resolvedRoot = resolveRefs(rootNode);

        const layoutResult = layoutTree(
          resolvedRoot,
          (shape.x as number) || 0,
          (shape.y as number) || 0,
          (shape.width as number) || DEFAULT_FRAME_WIDTH,
          (shape.height as number) || DEFAULT_FRAME_HEIGHT,
        );

        const ids: string[] = [];
        for (const flat of layoutResult.shapes) {
          ids.push(createFlatShape(editor, flat));
        }
        if (shape.name && ids.length > 0) {
          registerSection(ids[0], ids, shape.name as string);
        }
        return { ...base, id: ids[0], ids };
      }

      if (shape.type === "pen-frame") {
        editor.createShape({
          id, type: PEN_FRAME_TYPE,
          x: (shape.x as number) || 0,
          y: (shape.y as number) || 0,
          props: {
            w: (shape.width as number) || DEFAULT_FRAME_WIDTH,
            h: (shape.height as number) || DEFAULT_FRAME_HEIGHT,
            name: (shape.name as string) || "",
            fill: (shape.fill as string) || "transparent",
            cornerRadius: (shape.cornerRadius as number) || 0,
            borderColor: (shape.borderColor as string) || "#e0e0e0",
            borderWidth: shape.borderWidth !== undefined ? (shape.borderWidth as number) : 1,
          },
        });
        return { ...base, id };
      }

      if (shape.type === "pen-text") {
        editor.createShape({
          id, type: PEN_TEXT_TYPE,
          x: (shape.x as number) || 0,
          y: (shape.y as number) || 0,
          props: {
            w: (shape.width as number) || DEFAULT_TEXT_WIDTH,
            h: (shape.height as number) || DEFAULT_TEXT_HEIGHT,
            content: (shape.content as string) || "Text",
            fill: (shape.fill as string) || "#000000",
            fontSize: (shape.fontSize as number) || DEFAULT_FONT_SIZE,
            fontFamily: (shape.fontFamily as string) || "Inter, sans-serif",
            fontWeight: (shape.fontWeight as string) || "normal",
            textAlign: (shape.textAlign as string) || "left",
            lineHeight: (shape.lineHeight as number) || 1.5,
            textGrowth: (shape.textGrowth as string) || "auto",
          },
        });
        return { ...base, id };
      }

      if (shape.type === "geo") {
        editor.createShape({
          id, type: "geo",
          x: (shape.x as number) || 0,
          y: (shape.y as number) || 0,
          props: {
            geo: ((shape.geo as string) || "rectangle") as TLGeoShape["props"]["geo"],
            w: (shape.width as number) || DEFAULT_GEO_WIDTH,
            h: (shape.height as number) || DEFAULT_GEO_HEIGHT,
            color: ((shape.color as string) || "black") as TLGeoShape["props"]["color"],
            fill: ((shape.fill as string) || "none") as TLGeoShape["props"]["fill"],
          },
        });
      }
      return { ...base, id };
    }

    case "snapshot": {
      const shapes = editor.getCurrentPageShapes().map(s => {
        const p = s.props as Record<string, unknown>;
        return { id: s.id, type: s.type, x: s.x, y: s.y, w: p.w, h: p.h, props: p };
      });
      return { ...base, shapes, bounds: editor.getViewportPageBounds() };
    }

    case "clear":
      editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
      clearSectionMaps();
      return { ...base, cleared: true };

    case "zoom_to_fit":
      editor.zoomToFit({ animation: { duration: ZOOM_ANIMATION_DURATION_MS } });
      return { ...base, zoomed: true };

    case "export":
      if (cmd.format === "json") {
        return { ...base, data: JSON.stringify(editor.getCurrentPageShapes(), null, 2) };
      }
      return { ...base, error: "Unsupported format" };

    default:
      return { ...base, error: `Unknown: ${cmd.type}` };
  }
}
