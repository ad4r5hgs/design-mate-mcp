/**
 * Batch Handler — Processes batch WebSocket commands (create/update/delete).
 *
 * Orchestrates layout engine, component resolution, section registration,
 * and parent-child tree building for a batch of operations in one roundtrip.
 *
 * @module engine/batch-handler
 */

import {
  createShapeId,
  toRichText,
  type Editor,
  type TLShapeId,
  type TLGeoShape,
} from "tldraw";
import { layoutTree, pad, type PenNode, type LayoutResult } from "../lib/layout-engine";
import { resolveRefs } from "../lib/components";
import { PEN_FRAME_TYPE } from "../shapes/PenFrameUtil";
import { PEN_TEXT_TYPE } from "../shapes/PenTextUtil";
import {
  sectionNameMap,
  sectionShapesMap,
  shapeParentMap,
  shapeChildrenMap,
  clearSectionMaps,
  registerSection,
  persistSectionMap,
} from "./section-manager";
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

export interface BatchOperation {
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

export interface BatchCommand {
  type: "batch";
  operations: BatchOperation[];
  clearFirst?: boolean;
  requestId: string;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/** Process a batch of create/update/delete operations. */
export function handleBatch(editor: Editor, cmd: BatchCommand): Record<string, unknown> {
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

      // Canvas-scan fallback
      if (!targetShape) {
        targetShape = allPageShapes.find(s => s.type === PEN_FRAME_TYPE && (s.props as any).name === targetName);
        if (targetShape) {
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
              width: op.width || (p.width as number) || DEFAULT_FRAME_WIDTH,
              height: op.height || (p.height as number) || undefined,
              overflow: "hidden",
              children: p.children as PenNode[],
              boxShadow: p.boxShadow as string,
              backgroundImage: p.backgroundImage as string,
            };

            const resolvedRoot = resolveRefs(rootNode);

            const layoutResult: LayoutResult = layoutTree(
              resolvedRoot,
              op.x || 0,
              resolvedY,
              (op.width || (p.width as number) || DEFAULT_FRAME_WIDTH),
              (op.height || (p.height as number) || 0),
            );

            const createdIds: string[] = [];
            for (const flat of layoutResult.shapes) {
              const id = createFlatShape(editor, flat);
              createdIds.push(id);
            }

            // Build parent-child maps for resize propagation
            for (let i = 0; i < layoutResult.shapes.length; i++) {
              const flat = layoutResult.shapes[i];
              if (flat.parentIndex === undefined) continue;
              const childId = createdIds[i];
              const parentId = createdIds[flat.parentIndex];
              shapeParentMap.set(childId, parentId);
              if (!shapeChildrenMap.has(parentId)) shapeChildrenMap.set(parentId, []);
              shapeChildrenMap.get(parentId)!.push(childId);
            }

            if (p.name && createdIds.length > 0) {
              registerSection(createdIds[0], createdIds, p.name as string);
            }

            for (const w of layoutResult.warnings) {
              allWarnings.push({ ...w, section: p.name || op.ref });
            }

            const rootBounds = layoutResult.computedBounds.slice(0, Math.min(20, layoutResult.computedBounds.length));
            allComputedBounds.push(...rootBounds);

            if (op.ref) refMap.set(op.ref, createdIds[0] || "");
            results.push({
              op: "create", ref: op.ref, id: createdIds[0], ids: createdIds,
              shapeCount: createdIds.length,
              computedBounds: rootBounds.slice(0, 5),
            });
          } else if (op.type === "pen-frame") {
            const id = createShapeId();
            editor.createShape({
              id,
              type: PEN_FRAME_TYPE,
              x: op.x || 0,
              y: resolvedY,
              props: {
                w: op.width || DEFAULT_FRAME_WIDTH,
                h: op.height || DEFAULT_FRAME_HEIGHT,
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
                w: op.width || DEFAULT_TEXT_WIDTH,
                h: op.height || DEFAULT_TEXT_HEIGHT,
                content: (p.content as string) || "Text",
                fill: (p.fill as string) || (p.color as string) || "#000000",
                fontSize: (p.fontSize as number) || DEFAULT_FONT_SIZE,
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
                w: op.width || DEFAULT_GEO_WIDTH,
                h: op.height || DEFAULT_GEO_HEIGHT,
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

  try { editor.zoomToFit({ animation: { duration: ZOOM_ANIMATION_DURATION_MS } }); } catch { }
  return {
    requestId: cmd.requestId,
    results,
    refMap: Object.fromEntries(refMap),
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    computedBounds: allComputedBounds.length > 0 ? allComputedBounds.slice(0, 30) : undefined,
  };
}
