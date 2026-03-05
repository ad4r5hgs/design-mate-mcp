/**
 * Shape Factory — Creates tldraw shapes from layout engine output.
 *
 * Converts FlatShape records (absolute position + props) into actual
 * tldraw shapes on the canvas.
 *
 * Factory map pattern: each shape type registers its own creator function.
 * To add a new shape type, add one entry to `shapeCreators` — no existing
 * code needs to change.
 *
 * @module engine/shape-factory
 */

import { createShapeId, type Editor, type TLShapeId } from "tldraw";
import { PEN_FRAME_TYPE } from "../shapes/PenFrameUtil";
import { PEN_TEXT_TYPE } from "../shapes/PenTextUtil";
import { DEFAULT_FONT_SIZE } from "./defaults";
import { PEN_ICON_TYPE } from "../shapes/PenIconUtil";
import { PEN_IMAGE_TYPE } from "../shapes/PenImageUtil";
import type { FlatShape } from "../lib/layout-engine";

/** Signature every shape creator must satisfy */
type ShapeCreatorFn = (editor: Editor, id: TLShapeId, flat: FlatShape) => void;

// ─── Per-type creators ────────────────────────────────────────────────────────

function createFrameShape(editor: Editor, id: TLShapeId, flat: FlatShape): void {
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
      animation: (flat.props.animation as string) || "",
      layout: (flat.props.layout as string) || "vertical",
      gap: (flat.props.gap as number) || 0,
      penPadding: (flat.props.penPadding as string) || "0",
    },
  });
}

function createTextShape(editor: Editor, id: TLShapeId, flat: FlatShape): void {
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
      fontSize: (flat.props.fontSize as number) || DEFAULT_FONT_SIZE,
      fontFamily: (flat.props.fontFamily as string) || "Inter, sans-serif",
      fontWeight: (flat.props.fontWeight as string) || "normal",
      textAlign: (flat.props.textAlign as string) || "left",
      lineHeight: (flat.props.lineHeight as number) || 1.5,
      textGrowth: (flat.props.textGrowth as string) || "auto",
      animation: (flat.props.animation as string) || "",
    },
  });
}

function createIconShape(editor: Editor, id: TLShapeId, flat: FlatShape): void {
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
      animation: (flat.props.animation as string) || "",
    },
  });
}

function createImageShape(editor: Editor, id: TLShapeId, flat: FlatShape): void {
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
      animation: (flat.props.animation as string) || "",
    },
  });
}

// ─── Factory map ──────────────────────────────────────────────────────────────
// Add a new shape type here — no other code needs to change.

const shapeCreators: Record<string, ShapeCreatorFn> = {
  "pen-frame": createFrameShape,
  "pen-text": createTextShape,
  "pen-icon": createIconShape,
  "pen-image": createImageShape,
};

/** Create a tldraw shape from a FlatShape and return its ID. */
export function createFlatShape(editor: Editor, flat: FlatShape): string {
  const id = createShapeId();
  shapeCreators[flat.shapeType]?.(editor, id, flat);
  return id;
}
