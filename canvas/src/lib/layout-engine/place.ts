/**
 * @module place — Pass 2 (top-down): assign absolute x, y, w, h to every node.
 *
 * Strategy map pattern: each node type registers its own placer.
 * To support a new node type, add one entry to `placers` — no existing
 * code needs to change.
 */

import type { MeasuredNode, FlatShape, LayoutWarning } from "./types";
import { pad, normalizeAlignItems, normalizeJustifyContent } from "./normalize";
import { DEFAULT_FONT_SIZE } from "../../engine/defaults";
import { measureText } from "./text-measure";

/** Shared context passed to every node placer */
interface PlaceContext {
    shapes: FlatShape[];
    warnings: LayoutWarning[];
    isRoot: boolean;
    sectionName?: string;
    parentContentW?: number;
    parentShapeIndex?: number;
    placeFn: typeof place;
}

/** Signature every node placer must satisfy */
type NodePlacerFn = (
    mn: MeasuredNode,
    x: number, y: number, w: number, h: number,
    ctx: PlaceContext,
) => void;

// ─── Per-type placers ─────────────────────────────────────────────────────────

function placeTextNode(
    mn: MeasuredNode,
    x: number, y: number, w: number, h: number,
    { shapes, warnings, sectionName, parentContentW }: PlaceContext,
): void {
    const n = mn.node;
    const isAutoWrapped = parentContentW && parentContentW > 0 && w >= parentContentW - 2;
    if (!isAutoWrapped) {
        const naturalMeasure = measureText(n, 0);
        const effectiveMaxW = parentContentW && parentContentW > 0 ? Math.min(w, parentContentW) : w;
        if (naturalMeasure.w > effectiveMaxW + 2) {
            warnings.push({
                type: "text_overflow",
                message: `Text "${(n.content || "").slice(0, 40)}..." natural width (${Math.round(naturalMeasure.w)}px) exceeds container (${Math.round(effectiveMaxW)}px) by ${Math.round(naturalMeasure.w - effectiveMaxW)}px. Wrap in a width:"fill" frame or shorten text.`,
                nodeContent: n.content,
                overflowPx: Math.round(naturalMeasure.w - effectiveMaxW),
            });
        }
    }
    shapes.push({
        shapeType: "pen-text",
        x, y, w, h,
        sectionName,
        props: {
            content: n.content || "",
            fill: n.color || n.fill || "#000000",
            fontSize: n.fontSize || DEFAULT_FONT_SIZE,
            fontFamily: n.fontFamily || "Inter, sans-serif",
            fontWeight: n.fontWeight || "normal",
            textAlign: n.textAlign || "left",
            lineHeight: n.lineHeight || 1.5,
            textGrowth: (typeof n.width === "number" || n.width === "fill" || (parentContentW && parentContentW > 0 && w >= parentContentW - 2)) ? "fixed-width" : "auto",
            animation: n.animation || "",
        },
    });
}

function placeIconNode(
    mn: MeasuredNode,
    x: number, y: number, _w: number, _h: number,
    { shapes, sectionName }: PlaceContext,
): void {
    const n = mn.node;
    const size = typeof n.width === "number" ? n.width : 24;
    shapes.push({
        shapeType: "pen-icon",
        x, y, w: size, h: size,
        sectionName,
        props: {
            iconName: n.iconName || "circle",
            color: n.iconColor || n.color || n.fill || "#000000",
            strokeWidth: n.iconStrokeWidth || 2,
            animation: n.animation || "",
        },
    });
}

function placeImageNode(
    mn: MeasuredNode,
    x: number, y: number, w: number, h: number,
    { shapes, sectionName, parentShapeIndex }: PlaceContext,
): void {
    const n = mn.node;
    shapes.push({
        shapeType: "pen-image",
        x, y, w, h,
        sectionName,
        parentIndex: parentShapeIndex,
        props: {
            src: n.src || "",
            objectFit: n.objectFit || "cover",
            cornerRadius: n.cornerRadius || 0,
            animation: n.animation || "",
        },
    });
}

function placeFrameNode(
    mn: MeasuredNode,
    x: number, y: number, w: number, h: number,
    { shapes, warnings, isRoot, sectionName, placeFn }: PlaceContext,
): void {
    const n = mn.node;
    const currentSection = isRoot ? (n.name || sectionName) : sectionName;
    const p = pad(n.padding);
    const myIndex = shapes.length;

    shapes.push({
        shapeType: "pen-frame",
        x, y, w, h,
        sectionName: currentSection,
        parentIndex: undefined,
        props: {
            fill: n.fill || "transparent",
            cornerRadius: n.cornerRadius || 0,
            borderColor: n.borderColor || "#e0e0e0",
            borderWidth: n.borderWidth ?? 0,
            name: n.name || "",
            boxShadow: n.boxShadow || "",
            backgroundImage: n.backgroundImage || "",
            animation: n.animation || "",
            layout: n.layout || "vertical",
            gap: n.gap || 0,
            penPadding: JSON.stringify(n.padding ?? 0),
        },
    });

    if (mn.children.length === 0) return;

    const isHoriz = n.layout === "horizontal";
    const gap = n.gap || 0;
    const jc = normalizeJustifyContent(n.justifyContent);
    const ai = normalizeAlignItems(n.alignItems);

    const contentW = w - p.l - p.r;
    const contentH = h - p.t - p.b;

    const totalMain = mn.children.reduce((s, c) => s + (isHoriz ? c.intrinsicW : c.intrinsicH), 0);
    const totalGap = Math.max(0, mn.children.length - 1) * gap;

    let mainCursor = 0;
    let mainGap = gap;
    const freeSpace = (isHoriz ? contentW : contentH) - totalMain - totalGap;

    if (jc === "center") mainCursor = Math.max(0, freeSpace / 2);
    else if (jc === "end") mainCursor = Math.max(0, freeSpace);
    else if (jc === "space_between" && mn.children.length > 1) {
        mainGap = Math.max(gap, ((isHoriz ? contentW : contentH) - totalMain) / (mn.children.length - 1));
    } else if (jc === "space_around" && mn.children.length > 0) {
        const unitSpace = Math.max(0, freeSpace + totalGap) / (mn.children.length * 2);
        mainCursor = unitSpace;
        mainGap = unitSpace * 2;
    }

    for (const child of mn.children) {
        const childMainSize = isHoriz ? child.intrinsicW : child.intrinsicH;
        const childCrossSize = isHoriz ? child.intrinsicH : child.intrinsicW;
        const crossAvail = isHoriz ? contentH : contentW;

        let crossOffset = 0;
        let childCross = childCrossSize;
        if (ai === "center") crossOffset = Math.max(0, (crossAvail - childCrossSize) / 2);
        else if (ai === "end") crossOffset = Math.max(0, crossAvail - childCrossSize);
        else if (ai === "stretch") childCross = crossAvail;

        let cx: number, cy: number, cw: number, ch: number;
        if (isHoriz) {
            cx = x + p.l + mainCursor;
            cy = y + p.t + crossOffset;
            cw = child.intrinsicW;
            ch = childCross;
        } else {
            cx = x + p.l + crossOffset;
            cy = y + p.t + mainCursor;
            cw = childCross;
            ch = child.intrinsicH;
        }

        if (!isHoriz && child.isFillW) cw = contentW;

        placeFn(child, cx, cy, cw, ch, {
            shapes, warnings,
            isRoot: false,
            sectionName: currentSection,
            parentContentW: contentW,
            parentShapeIndex: myIndex,
            placeFn,
        });

        mainCursor += childMainSize + mainGap;
    }
}

// ─── Strategy map ─────────────────────────────────────────────────────────────
// Add a new node type here — no other file needs to change.

const placers: Record<string, NodePlacerFn> = {
    text: placeTextNode,
    icon: placeIconNode,
    image: placeImageNode,
    frame: placeFrameNode,
};

/** Pass 2: top-down absolute position assignment */
export function place(
    mn: MeasuredNode,
    x: number, y: number, w: number, h: number,
    ctx: PlaceContext,
): void {
    const fn = placers[mn.node.type] ?? placers.frame;
    fn(mn, x, y, w, h, ctx);
}
