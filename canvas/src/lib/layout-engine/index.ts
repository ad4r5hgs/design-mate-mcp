/**
 * @module layout-engine — Public API
 *
 * 2-pass flexbox layout engine:
 *   Pass 1: measure() — bottom-up intrinsic size computation
 *   Pass 2: place()   — top-down absolute position assignment
 *
 * Extending: add new node types by registering a measurer in measure.ts
 * and a placer in place.ts. No other files need to change.
 */

export type { PenNode, FlatShape, LayoutWarning, LayoutResult, MeasuredNode } from "./types";
export { normalizeFontWeight, pad } from "./normalize";

import { measure } from "./measure";
import { place } from "./place";
import type { PenNode, LayoutResult } from "./types";

/** Run both layout passes and return all shapes with computed bounds */
export function layoutTree(
    root: PenNode,
    originX: number,
    originY: number,
    containerW: number,
    containerH: number,
): LayoutResult {
    const shapes: import("./types").FlatShape[] = [];
    const warnings: import("./types").LayoutWarning[] = [];

    const measured = measure(root, containerW, containerH);
    place(measured, originX, originY, measured.intrinsicW, measured.intrinsicH, {
        shapes,
        warnings,
        isRoot: true,
        sectionName: undefined,
        parentContentW: containerW,
        parentShapeIndex: undefined,
        placeFn: place,
    });

    const computedBounds = shapes.map(s => ({
        sectionName: s.sectionName,
        x: Math.round(s.x),
        y: Math.round(s.y),
        w: Math.round(s.w),
        h: Math.round(s.h),
    }));

    return { shapes, warnings, computedBounds };
}
