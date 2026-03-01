import { useCallback, useSyncExternalStore } from "react";
import {
  Tldraw,
  Editor,
  createShapeId,
  toRichText,
  TLShapeId,
  TLGeoShape,
} from "tldraw";
import "tldraw/tldraw.css";
import { PenFrameUtil, PEN_FRAME_TYPE } from "./shapes/PenFrameUtil";
import { PenTextUtil, PEN_TEXT_TYPE } from "./shapes/PenTextUtil";
import { PenIconUtil, PEN_ICON_TYPE } from "./shapes/PenIconUtil";
import { PenImageUtil, PEN_IMAGE_TYPE } from "./shapes/PenImageUtil";
import { layoutTree, pad, type PenNode, type FlatShape, type LayoutResult } from "./layout-engine";
import { resolveRefs } from "./components";
import { PropertiesPanel } from "./PropertiesPanel";
import { TopBar } from "./TopBar";
import { ChatDrawer } from "./ChatDrawer";
import { CustomToolbar } from "./CustomToolbar";
import { editorRef, hasSelectionStore, chatOpenStore, chatPanelWidthStore } from "./stores";

// ─────────────────────────────────────────────────────────────────────────────
// Custom shape utils + UI components
// ─────────────────────────────────────────────────────────────────────────────

const customShapeUtils = [PenFrameUtil, PenTextUtil, PenIconUtil, PenImageUtil];

// ChatDrawer is rendered outside of tldraw (in App) so it can be resizable
// and so the canvas container can adjust its right margin to accommodate it.
function InFrontOfTheCanvas() {
  return (
    <>
      <CustomToolbar />
      <PropertiesPanel />
    </>
  );
}

const customComponents = {
  InFrontOfTheCanvas,
  // Hide default tldraw UI elements
  StylePanel: null,       // color/style picker (AI generates all styling)
  MainMenu: null,         // hamburger menu
  PageMenu: null,         // multi-page UI
  HelpMenu: null,         // keyboard shortcuts help
  Toolbar: null,          // replaced by CustomToolbar (left-side vertical)
  QuickActions: null,     // undo/delete/duplicate bar — moved to TopBar
  NavigationPanel: null,  // zoom/pan controls — removes element behind left toolbar
  TopPanel: null,         // page/main-menu bar at canvas top — removes hamburger behind select tool
  // Note: Watermark cannot be removed without a tldraw business license
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BatchOperation {
  op: "create" | "update" | "delete";
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  ref?: string;
  id?: string;
  ids?: string[];
  parentId?: string;
  props?: Record<string, unknown>;
}

interface BatchCommand {
  type: "batch";
  operations: BatchOperation[];
  clearFirst?: boolean;
  requestId: string;
}

interface SingleCommand {
  type: string;
  requestId: string;
  [key: string]: unknown;
}

type CanvasCommand = SingleCommand | BatchCommand;

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

let activeWs: WebSocket | null = null;

export function App() {
  // React to chat panel open/width so the canvas right margin adjusts
  const chatOpen = useSyncExternalStore(chatOpenStore.subscribe, chatOpenStore.get);
  const chatWidth = useSyncExternalStore(chatPanelWidthStore.subscribe, chatPanelWidthStore.get);

  const handleMount = useCallback((editor: Editor) => {
    // Force dark mode — this widget is dark-mode only
    editor.user.updateUserPreferences({ colorScheme: "dark" });

    // Expose editor to TopBar action buttons (outside tldraw's React tree)
    editorRef.current = editor;
    editor.store.listen(() => {
      hasSelectionStore.set(editor.getSelectedShapeIds().length > 0);
    });

    connectWebSocket(editor);
    console.log("[app] mounted with:", customShapeUtils.map(u => u.type));
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#111111" }}>
      <TopBar />
      {/* tldraw canvas — offset below the 44px top bar; shrinks right when chat is open */}
      <div style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: chatOpen ? chatWidth : 0,
        bottom: 0,
        transition: "right 0.0s", // no animation — feels snappier during drag
      }}>
        <Tldraw onMount={handleMount} shapeUtils={customShapeUtils} components={customComponents} />
      </div>
      {/* ChatDrawer lives outside tldraw so it can be freely resized */}
      <ChatDrawer />
    </div>
  );
}

// ── Section maps + localStorage persistence ──────────────────────────────────
// sectionNameMap:   rootShapeId → sectionName
// sectionShapesMap: rootShapeId → [all shape IDs created for that section]
// Both persisted to localStorage so they survive widget refreshes.

const SECTION_MAP_KEY    = "tldraw-mcp-section-map";
const SECTION_SHAPES_KEY = "tldraw-mcp-section-shapes";
const sectionNameMap   = new Map<string, string>();
const sectionShapesMap = new Map<string, string[]>();

// Parent-child relationship maps — rebuilt on each batch_design call.
// Used by propagateResize() to walk the tree when a user manually resizes a shape.
const shapeParentMap   = new Map<string, string>();   // childId  → parentId
const shapeChildrenMap = new Map<string, string[]>();  // parentId → [childIds in layout order]

function persistSectionMap(): void {
  try {
    localStorage.setItem(SECTION_MAP_KEY,    JSON.stringify(Object.fromEntries(sectionNameMap)));
    localStorage.setItem(SECTION_SHAPES_KEY, JSON.stringify(Object.fromEntries(sectionShapesMap)));
  } catch { /* quota exceeded or storage unavailable — non-fatal */ }
}

function restoreSectionMap(editor: Editor): void {
  try {
    const existingIds = new Set<string>(editor.getCurrentPageShapes().map(s => s.id as string));

    // Restore sectionNameMap — discard stale entries whose root shape no longer exists
    const storedNames = localStorage.getItem(SECTION_MAP_KEY);
    if (storedNames) {
      const parsed: Record<string, string> = JSON.parse(storedNames);
      let restored = 0;
      for (const [shapeId, name] of Object.entries(parsed)) {
        if (existingIds.has(shapeId)) { sectionNameMap.set(shapeId, name); restored++; }
      }
      if (restored > 0) console.log(`[sections] restored ${restored} section(s) from storage`);
    }

    // Restore sectionShapesMap — only restore entries whose root shape still exists
    const storedShapes = localStorage.getItem(SECTION_SHAPES_KEY);
    if (storedShapes) {
      const parsed: Record<string, string[]> = JSON.parse(storedShapes);
      for (const [rootId, ids] of Object.entries(parsed)) {
        if (existingIds.has(rootId)) sectionShapesMap.set(rootId, ids);
      }
    }
  } catch { /* ignore parse / storage errors */ }
}

function clearSectionMaps(): void {
  sectionNameMap.clear();
  sectionShapesMap.clear();
  shapeParentMap.clear();
  shapeChildrenMap.clear();
  persistSectionMap();
}

function registerSection(rootId: string, allIds: string[], name: string): void {
  sectionNameMap.set(rootId, name);
  sectionShapesMap.set(rootId, allIds);
  persistSectionMap();
}

// ─────────────────────────────────────────────────────────────────────────────
// Resize propagation — walks parent chain when user manually resizes a shape
// ─────────────────────────────────────────────────────────────────────────────

function propagateResize(editor: Editor, changedId: string): void {
  let currentId = changedId;
  let parentId  = shapeParentMap.get(currentId);

  while (parentId) {
    const parentShape = editor.getShape(parentId as TLShapeId);
    if (!parentShape) break;

    const pp = parentShape.props as any;
    const isHoriz = (pp.layout as string) === "horizontal";
    const gap: number = pp.gap || 0;
    const p = pad(JSON.parse(pp.penPadding || "0") as number | number[]);

    const childIds = shapeChildrenMap.get(parentId) || [];
    const children = childIds.map(id => editor.getShape(id as TLShapeId)).filter(Boolean);
    if (children.length === 0) break;

    let newH: number;

    if (isHoriz) {
      // Horizontal parent: height = max(child heights) + padding.t + padding.b
      const maxChildH = children.reduce((m, c) => Math.max(m, (c!.props as any).h as number), 0);
      newH = maxChildH + p.t + p.b;
    } else {
      // Vertical parent: height = sum(child heights) + gaps + padding
      const totalChildH = children.reduce((s, c) => s + ((c!.props as any).h as number), 0);
      const totalGap = Math.max(0, children.length - 1) * gap;
      newH = totalChildH + totalGap + p.t + p.b;

      // Reposition siblings in vertical order
      // Use mergeRemoteChanges so these writes don't re-trigger the user listener
      let cursor = p.t;
      editor.store.mergeRemoteChanges(() => {
        for (const child of children) {
          const newY = parentShape.y + cursor;
          if (Math.abs(child!.y - newY) > 0.5) {
            editor.updateShape({ id: child!.id, type: child!.type, y: newY });
          }
          cursor += (child!.props as any).h + gap;
        }
      });
    }

    // Update parent height if it changed
    const currentH = pp.h as number;
    if (Math.abs(newH - currentH) > 0.5) {
      editor.store.mergeRemoteChanges(() => {
        editor.updateShape({
          id: parentId as TLShapeId,
          type: parentShape.type,
          props: { ...parentShape.props, h: newH },
        });
      });
    }

    // Walk up to the next ancestor
    currentId = parentId;
    parentId  = shapeParentMap.get(currentId);
  }
}

function connectWebSocket(editor: Editor) {
  restoreSectionMap(editor);

  // Listen for user-initiated resize events and propagate to parent containers.
  // mergeRemoteChanges() in propagateResize() marks its writes as source:"remote",
  // so this listener (source:"user") won't re-trigger on our own updates.
  editor.store.listen(
    (entry) => {
      for (const [, change] of Object.entries(entry.changes.updated)) {
        const [from, to] = change as [any, any];
        // typeName is the record category ("shape", "page", "instance" …) — always "shape" for shapes.
        // type is the custom shape type ("pen-text", "pen-frame", "pen-icon").
        if (to.typeName !== "shape") continue;
        const shapeType: string = to.type ?? "";
        if (!["pen-frame", "pen-text", "pen-icon", "pen-image"].includes(shapeType)) continue;
        if (from.props?.w === to.props?.w && from.props?.h === to.props?.h) continue;
        if (!shapeParentMap.has(to.id as string)) continue;
        propagateResize(editor, to.id as string);
      }
    },
    { source: "user" },
  );

  if (activeWs) {
    activeWs.onclose = null;
    activeWs.close();
    activeWs = null;
  }

  const ws = new WebSocket("ws://localhost:4000");
  activeWs = ws;

  ws.onopen = () => console.log("[ws] connected");
  ws.onclose = () => {
    if (activeWs === ws) activeWs = null;
    setTimeout(() => connectWebSocket(editor), 2000);
  };

  ws.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data) as CanvasCommand;
      if (!msg.type || !msg.requestId) return;

      // Screenshot is async — handle separately
      if (msg.type === "screenshot") {
        try {
          const allShapes = editor.getCurrentPageShapes();
          if (allShapes.length === 0) {
            ws.send(JSON.stringify({ requestId: msg.requestId, error: "No shapes on canvas" }));
            return;
          }

          const sectionName = (msg as any).sectionName as string | undefined;
          const shapeIds = (msg as any).shapeIds as string[] | undefined;
          const mode = (msg as any).mode as string | undefined; // "section" | "full"

          // Mode "full" or no args → capture everything
          if (mode === "full" || (!sectionName && !shapeIds?.length)) {
            const result = await editor.toImage(allShapes, {
              format: "png",
              pixelRatio: 2,
              background: true,
              padding: 40,
            });

            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(result.blob);
            });
            ws.send(JSON.stringify({
              requestId: msg.requestId,
              image: base64,
              width: result.width,
              height: result.height,
              mode: "full",
            }));
            return;
          }

          // Section or shape-scoped screenshot
          if (shapeIds?.length) {
            // Specific shapes requested
            const idSet = new Set(shapeIds);
            const targetShapes = allShapes.filter(s => idSet.has(s.id));
            if (targetShapes.length === 0) {
              ws.send(JSON.stringify({ requestId: msg.requestId, error: "No shapes found for given IDs" }));
              return;
            }
            const result = await editor.toImage(targetShapes, { format: "png", pixelRatio: 2, background: true, padding: 32 });
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(result.blob);
            });
            ws.send(JSON.stringify({ requestId: msg.requestId, image: base64, width: result.width, height: result.height, mode: "shapes" }));
            return;
          }

          if (!sectionName) {
            ws.send(JSON.stringify({ requestId: msg.requestId, error: "No sectionName or shapeIds provided" }));
            return;
          }

          // ── SECTION SCREENSHOT (zoomed/cropped view) ──
          // 1. Find the section frame.
          //    Fast path: sectionNameMap lookup.
          //    Fallback: scan canvas for a pen-frame whose stored name prop matches
          //    (self-heals stale map entries from delete+recreate cycles).
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
            ws.send(JSON.stringify({ requestId: msg.requestId, error: `Section '${sectionName}' not found. Known sections: ${known}` }));
            return;
          }

          // 2. Get section bounds
          const sectionPageBounds = editor.getShapePageBounds(sectionFrame);
          if (!sectionPageBounds) {
            ws.send(JSON.stringify({ requestId: msg.requestId, error: `Could not compute bounds for section '${sectionName}'` }));
            return;
          }

          // 3. Compute the 125% viewport (12.5% padding on each side)
          const padY = Math.max(40, Math.round(sectionPageBounds.h * 0.125));
          const padX = Math.max(20, Math.round(sectionPageBounds.w * 0.05));
          const viewport = {
            x: sectionPageBounds.x - padX,
            y: sectionPageBounds.y - padY,
            w: sectionPageBounds.w + padX * 2,
            h: sectionPageBounds.h + padY * 2,
          };

          // 4. Render ALL shapes (so neighboring sections appear in the crop)
          const fullResult = await editor.toImage(allShapes, { format: "png", pixelRatio: 2, background: true, padding: 40 });

          // 5. Compute the full canvas bounds (same as what toImage used)
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
          const canvasPadding = 40; // same as toImage padding
          const canvasBounds = {
            x: fullMinX - canvasPadding,
            y: fullMinY - canvasPadding,
            w: (fullMaxX - fullMinX) + canvasPadding * 2,
            h: (fullMaxY - fullMinY) + canvasPadding * 2,
          };

          // 6. Map viewport to pixel coordinates in the full image.
          // fullResult.width/height are CSS pixel dimensions; the actual PNG blob is
          // PIXEL_RATIO× larger in each axis because toImage was called with pixelRatio: 2.
          // scaleX/scaleY must convert CSS page coords → physical image pixels.
          const PIXEL_RATIO = 2; // must match the pixelRatio used in toImage above
          const imgW = fullResult.width;  // CSS pixels
          const imgH = fullResult.height; // CSS pixels
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

          // Draw the full image onto a temporary Image element
          const img = new Image();
          const fullReader = new FileReader();
          const fullBase64 = await new Promise<string>((resolve, reject) => {
            fullReader.onloadend = () => resolve(fullReader.result as string);
            fullReader.onerror = reject;
            fullReader.readAsDataURL(fullResult.blob);
          });
          img.src = fullBase64;
          await new Promise<void>((resolve) => { img.onload = () => resolve(); });

          cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          const croppedBase64 = cropCanvas.toDataURL("image/png");
          ws.send(JSON.stringify({
            requestId: msg.requestId,
            image: croppedBase64,
            width: Math.round(cropW / PIXEL_RATIO),   // report CSS dimensions
            height: Math.round(cropH / PIXEL_RATIO),  // report CSS dimensions
            mode: "section",
            sectionName,
            viewport,
          }));
        } catch (err) {
          ws.send(JSON.stringify({ requestId: msg.requestId, error: `Screenshot failed: ${err}` }));
        }
        return;
      }

      const response = msg.type === "batch"
        ? handleBatch(editor, msg as BatchCommand)
        : handleSingle(editor, msg as SingleCommand);

      ws.send(JSON.stringify(response));
    } catch (err) {
      console.error("[ws] error:", err);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a flat shape on the canvas
// ─────────────────────────────────────────────────────────────────────────────

function createFlatShape(editor: Editor, flat: FlatShape): string {
  const id = createShapeId();

  if (flat.shapeType === "pen-frame") {
    editor.createShape({
      id,
      type: PEN_FRAME_TYPE,
      x: flat.x,
      y: flat.y,
      props: {
        w: flat.w,
        h: flat.h,
        name: (flat.props.name as string) || "",
        fill: (flat.props.fill as string) || "transparent",
        cornerRadius: (flat.props.cornerRadius as number) || 0,
        borderColor: (flat.props.borderColor as string) || "#e0e0e0",
        borderWidth: flat.props.borderWidth !== undefined ? (flat.props.borderWidth as number) : 1,
        boxShadow: (flat.props.boxShadow as string) || "",
        backgroundImage: (flat.props.backgroundImage as string) || "",
        layout: (flat.props.layout as string) || "vertical",
        gap: (flat.props.gap as number) || 0,
        penPadding: (flat.props.penPadding as string) || "0",
      },
    });
  } else if (flat.shapeType === "pen-text") {
    editor.createShape({
      id,
      type: PEN_TEXT_TYPE,
      x: flat.x,
      y: flat.y,
      props: {
        w: flat.w,
        h: flat.h,
        content: (flat.props.content as string) || "",
        fill: (flat.props.fill as string) || "#000000",
        fontSize: (flat.props.fontSize as number) || 16,
        fontFamily: (flat.props.fontFamily as string) || "Inter, sans-serif",
        fontWeight: (flat.props.fontWeight as string) || "normal",
        textAlign: (flat.props.textAlign as string) || "left",
        lineHeight: (flat.props.lineHeight as number) || 1.5,
        textGrowth: (flat.props.textGrowth as string) || "auto",
      },
    });
  } else if (flat.shapeType === "pen-icon") {
    editor.createShape({
      id,
      type: PEN_ICON_TYPE,
      x: flat.x,
      y: flat.y,
      props: {
        w: flat.w,
        h: flat.h,
        iconName: (flat.props.iconName as string) || "circle",
        color: (flat.props.color as string) || "#000000",
        strokeWidth: (flat.props.strokeWidth as number) || 2,
      },
    });
  } else if (flat.shapeType === "pen-image") {
    editor.createShape({
      id,
      type: PEN_IMAGE_TYPE,
      x: flat.x,
      y: flat.y,
      props: {
        w: flat.w,
        h: flat.h,
        src: (flat.props.src as string) || "",
        objectFit: (flat.props.objectFit as string) || "cover",
        cornerRadius: (flat.props.cornerRadius as number) || 0,
      },
    });
  }

  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH handler
// ─────────────────────────────────────────────────────────────────────────────

function handleBatch(editor: Editor, cmd: BatchCommand): Record<string, unknown> {
  const refMap = new Map<string, string>();
  const results: Array<Record<string, unknown>> = [];
  const allWarnings: Array<Record<string, unknown>> = [];
  const allComputedBounds: Array<Record<string, unknown>> = [];

  if (cmd.clearFirst) {
    editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
    clearSectionMaps();
  }

  // ── Helper: resolve y-anchors like "after:Navbar" ──
  function resolveY(op: BatchOperation): number {
    const rawY = op.y;
    if (typeof rawY === "number") return rawY;
    const yStr = String((op as any).y || (op.props as any)?.yAnchor || "");
    if (yStr.startsWith("after:")) {
      const targetName = yStr.slice(6);
      const allPageShapes = editor.getCurrentPageShapes();

      // Fast path: sectionNameMap lookup
      const targetShapeId = [...sectionNameMap.entries()].find(([, name]) => name === targetName)?.[0];
      let targetShape = targetShapeId ? allPageShapes.find(s => s.id === targetShapeId) : undefined;

      // Canvas-scan fallback: find pen-frame whose stored name prop matches
      if (!targetShape) {
        targetShape = allPageShapes.find(s => s.type === PEN_FRAME_TYPE && (s.props as any).name === targetName);
        if (targetShape) {
          // Self-heal the map so future lookups hit the fast path
          sectionNameMap.set(targetShape.id, targetName);
          persistSectionMap();
        }
      }

      if (targetShape) {
        const bounds = editor.getShapePageBounds(targetShape);
        if (bounds) return bounds.y + bounds.h;
      }
      console.warn(`[y-anchor] Section '${targetName}' not found, defaulting to y=0`);
      return 0;
    }
    return rawY || 0;
  }

  for (const op of cmd.operations) {
    try {
      switch (op.op) {
        case "create": {
          const p = op.props || {};
          const hasChildren = Array.isArray(p.children) && p.children.length > 0;
          const resolvedY = resolveY(op);

          if (op.type === "pen-frame" && hasChildren) {
            // ── HYBRID: flatten children tree into separate shapes ──
            const rootNode: PenNode = {
              type: "frame",
              layout: (p.layout as PenNode["layout"]) || "vertical",
              justifyContent: p.justifyContent as PenNode["justifyContent"],
              alignItems: p.alignItems as PenNode["alignItems"],
              gap: p.gap as number,
              padding: p.padding as number | number[],
              fill: p.fill as string,
              cornerRadius: p.cornerRadius as number,
              borderColor: p.borderColor as string,
              borderWidth: p.borderWidth as number,
              name: p.name as string,
              width: op.width || (p.width as number) || 400,
              height: op.height || (p.height as number) || 300,
              overflow: "hidden",
              children: p.children as PenNode[],
              boxShadow: p.boxShadow as string,
              backgroundImage: p.backgroundImage as string,
            };

            // Resolve component refs before layout
            const resolvedRoot = resolveRefs(rootNode);

            const layoutResult: LayoutResult = layoutTree(
              resolvedRoot,
              op.x || 0,
              resolvedY,
              (op.width || (p.width as number) || 400),
              (op.height || (p.height as number) || 300),
            );

            const createdIds: string[] = [];
            for (const flat of layoutResult.shapes) {
              const id = createFlatShape(editor, flat);
              createdIds.push(id);
            }

            // Build parent-child maps from the DFS parentIndex recorded in each FlatShape.
            // These enable propagateResize() to walk the tree on user-initiated resizes.
            for (let i = 0; i < layoutResult.shapes.length; i++) {
              const flat = layoutResult.shapes[i];
              if (flat.parentIndex === undefined) continue;
              const childId  = createdIds[i];
              const parentId = createdIds[flat.parentIndex];
              shapeParentMap.set(childId, parentId);
              if (!shapeChildrenMap.has(parentId)) shapeChildrenMap.set(parentId, []);
              shapeChildrenMap.get(parentId)!.push(childId);
            }

            // Register section: name + full shape ID list for cascade delete
            if (p.name && createdIds.length > 0) {
              registerSection(createdIds[0], createdIds, p.name as string);
            }

            // Collect warnings
            for (const w of layoutResult.warnings) {
              allWarnings.push({ ...w, section: p.name || op.ref });
            }

            // Collect computed bounds (top-level only to keep response small)
            const rootBounds = layoutResult.computedBounds.slice(0, Math.min(20, layoutResult.computedBounds.length));
            allComputedBounds.push(...rootBounds);

            if (op.ref) refMap.set(op.ref, createdIds[0] || "");
            results.push({
              op: "create", ref: op.ref, id: createdIds[0], ids: createdIds,
              shapeCount: createdIds.length,
              computedBounds: rootBounds.slice(0, 5),  // Return first 5 bounds inline
            });
          } else if (op.type === "pen-frame") {
            // Simple frame without children
            const id = createShapeId();
            editor.createShape({
              id,
              type: PEN_FRAME_TYPE,
              x: op.x || 0,
              y: resolvedY,
              props: {
                w: op.width || 400,
                h: op.height || 300,
                name: "",
                fill: (p.fill as string) || "transparent",
                cornerRadius: (p.cornerRadius as number) || 0,
                borderColor: (p.borderColor as string) || "#e0e0e0",
                borderWidth: p.borderWidth !== undefined ? (p.borderWidth as number) : 1,
              },
            });
            if (p.name) { registerSection(id, [id], p.name as string); }
            if (op.ref) refMap.set(op.ref, id);
            results.push({ op: "create", ref: op.ref, id });
          } else if (op.type === "pen-text") {
            const id = createShapeId();
            editor.createShape({
              id,
              type: PEN_TEXT_TYPE,
              x: op.x || 0,
              y: resolvedY,
              props: {
                w: op.width || 200,
                h: op.height || 24,
                content: (p.content as string) || "Text",
                fill: (p.fill as string) || (p.color as string) || "#000000",
                fontSize: (p.fontSize as number) || 16,
                fontFamily: (p.fontFamily as string) || "Inter, sans-serif",
                fontWeight: (p.fontWeight as string) || "normal",
                textAlign: (p.textAlign as string) || "left",
                lineHeight: (p.lineHeight as number) || 1.5,
                textGrowth: (p.textGrowth as string) || "auto",
              },
            });
            if (op.ref) refMap.set(op.ref, id);
            results.push({ op: "create", ref: op.ref, id });
          } else if (op.type === "geo") {
            const id = createShapeId();
            editor.createShape({
              id,
              type: "geo",
              x: op.x || 0,
              y: resolvedY,
              props: {
                geo: ((p.geo as string) || "rectangle") as TLGeoShape["props"]["geo"],
                w: op.width || 200,
                h: op.height || 200,
                color: ((p.color as string) || "black") as TLGeoShape["props"]["color"],
                fill: ((p.fill as string) || "none") as TLGeoShape["props"]["fill"],
                ...(p.text ? { richText: toRichText(p.text as string) } : {}),
              },
            });
            if (op.ref) refMap.set(op.ref, id);
            results.push({ op: "create", ref: op.ref, id });
          }
          break;
        }

        case "update": {
          let targetId = op.id || "";
          if (refMap.has(targetId)) targetId = refMap.get(targetId)!;
          const shape = editor.getShape(targetId as TLShapeId);
          if (!shape) { results.push({ op: "update", error: `Not found: ${targetId}` }); break; }

          const updates: Record<string, unknown> = {};
          if (op.x !== undefined) updates.x = op.x;
          if (op.y !== undefined) updates.y = op.y;

          const propUpdates: Record<string, unknown> = {};
          const p = op.props || {};
          if (op.width !== undefined) propUpdates.w = op.width;
          if (op.height !== undefined) propUpdates.h = op.height;
          for (const [key, value] of Object.entries(p)) {
            if (key === "width") propUpdates.w = value;
            else if (key === "height") propUpdates.h = value;
            else propUpdates[key] = value;
          }

          editor.updateShape({
            id: shape.id, type: shape.type,
            ...updates,
            props: { ...shape.props, ...propUpdates },
          });
          results.push({ op: "update", id: targetId });
          break;
        }

        case "delete": {
          const allIdsToDelete: string[] = [];
          for (const rawId of (op.ids || [])) {
            const resolvedId = refMap.get(rawId) || rawId;
            // If this is a section root, expand to ALL shapes in the section
            const sectionIds = sectionShapesMap.get(resolvedId);
            if (sectionIds) {
              allIdsToDelete.push(...sectionIds);
              sectionNameMap.delete(resolvedId);
              sectionShapesMap.delete(resolvedId);
            } else {
              allIdsToDelete.push(resolvedId);
            }
          }
          editor.deleteShapes(allIdsToDelete as TLShapeId[]);
          persistSectionMap();
          results.push({ op: "delete", deleted: allIdsToDelete.length });
          break;
        }
      }
    } catch (err) {
      results.push({ op: op.op, error: String(err) });
    }
  }

  try { editor.zoomToFit({ animation: { duration: 200 } }); } catch { }
  return {
    requestId: cmd.requestId,
    results,
    refMap: Object.fromEntries(refMap),
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    computedBounds: allComputedBounds.length > 0 ? allComputedBounds.slice(0, 30) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single command handler
// ─────────────────────────────────────────────────────────────────────────────

function handleSingle(editor: Editor, cmd: SingleCommand): Record<string, unknown> {
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
          width: (shape.width as number) || 400,
          height: (shape.height as number) || 300,
          children: shape.children as PenNode[],
        };

        // Resolve component refs before layout
        const resolvedRoot = resolveRefs(rootNode);

        const layoutResult = layoutTree(
          resolvedRoot,
          (shape.x as number) || 0,
          (shape.y as number) || 0,
          (shape.width as number) || 400,
          (shape.height as number) || 300,
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
            w: (shape.width as number) || 400,
            h: (shape.height as number) || 300,
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
            w: (shape.width as number) || 200,
            h: (shape.height as number) || 24,
            content: (shape.content as string) || "Text",
            fill: (shape.fill as string) || "#000000",
            fontSize: (shape.fontSize as number) || 16,
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
            w: (shape.width as number) || 200,
            h: (shape.height as number) || 200,
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
      editor.zoomToFit({ animation: { duration: 200 } });
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
