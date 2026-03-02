/**
 * Resize Handler — Propagates user-initiated resizes through the shape tree.
 *
 * When a user manually resizes a shape, this walks up the parent chain
 * and adjusts parent heights + repositions siblings in vertical layouts.
 * Uses mergeRemoteChanges() so the updates don't re-trigger the user listener.
 *
 * @module engine/resize-handler
 */

import type { Editor, TLShapeId } from "tldraw";
import { pad } from "../lib/layout-engine";
import { shapeParentMap, shapeChildrenMap } from "./section-manager";

/** Walk up the parent chain from `changedId` and reflow ancestors. */
export function propagateResize(editor: Editor, changedId: string): void {
  let currentId = changedId;
  let parentId = shapeParentMap.get(currentId);

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
      const maxChildH = children.reduce((m, c) => Math.max(m, (c!.props as any).h as number), 0);
      newH = maxChildH + p.t + p.b;
    } else {
      const totalChildH = children.reduce((s, c) => s + ((c!.props as any).h as number), 0);
      const totalGap = Math.max(0, children.length - 1) * gap;
      newH = totalChildH + totalGap + p.t + p.b;

      // Reposition siblings in vertical order
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

    // Update parent height if changed
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

    currentId = parentId;
    parentId = shapeParentMap.get(currentId);
  }
}
