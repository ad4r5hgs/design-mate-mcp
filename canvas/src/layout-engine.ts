/**
 * Layout Engine v4 — Canvas API Text Measurement
 *
 * Pass 1: measureNode (bottom-up)   → intrinsic { w, h } for every node
 * Pass 2: placeNode   (top-down)    → absolute { x, y, w, h } → FlatShape[]
 *
 * v4: Uses CanvasRenderingContext2D.measureText() for pixel-accurate
 * text measurement. Works for ANY text, ANY font, ANY weight, emoji, etc.
 */

export interface PenNode {
    type: "frame" | "text" | "ref" | "icon" | "image";
    width?: number | string;
    height?: number | string;
    fill?: string;
    opacity?: number;
    layout?: "none" | "vertical" | "horizontal";
    justifyContent?: "start" | "center" | "end" | "space_between" | "space_around";
    alignItems?: "start" | "center" | "end" | "stretch";
    gap?: number;
    padding?: number | number[];
    cornerRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    overflow?: "hidden" | "visible";
    name?: string;
    children?: PenNode[];
    content?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
    lineHeight?: number;
    color?: string;
    letterSpacing?: number;
    boxShadow?: string;
    backgroundImage?: string;
    // Component ref fields
    ref?: string;
    overrides?: Record<string, any>;
    props?: Record<string, any>;
    // Icon fields
    iconName?: string;
    iconColor?: string;
    iconStrokeWidth?: number;
    // Image fields
    src?: string;
    objectFit?: "cover" | "contain" | "fill";
}

export interface FlatShape {
    shapeType: "pen-frame" | "pen-text" | "pen-icon" | "pen-image";
    x: number;
    y: number;
    w: number;
    h: number;
    props: Record<string, unknown>;
    sectionName?: string;   // Which root section this shape belongs to
    parentIndex?: number;   // Index of parent frame in shapes[] (DFS order); undefined = root
}

export interface LayoutWarning {
    type: "text_overflow";
    message: string;
    nodeContent?: string;
    overflowPx: number;
}

export interface LayoutResult {
    shapes: FlatShape[];
    warnings: LayoutWarning[];
    computedBounds: Array<{ sectionName?: string; x: number; y: number; w: number; h: number }>;
}

// ─── Font Weight Normalization ───────────────────────────────────────────────
// CSS font-weight requires numeric values or standard keywords ("bold").
// Map common named weights (e.g. "semibold", "medium") to their CSS numeric
// equivalents so both the Canvas API (text measurement) and the browser
// renderer receive valid values.

const FONT_WEIGHT_MAP: Record<string, string> = {
    thin: "100",
    hairline: "100",
    extralight: "200",
    "ultra-light": "200",
    light: "300",
    normal: "400",
    regular: "400",
    medium: "500",
    semibold: "600",
    "demi-bold": "600",
    demibold: "600",
    bold: "700",
    extrabold: "800",
    "extra-bold": "800",
    "ultra-bold": "800",
    ultrabold: "800",
    black: "900",
    heavy: "900",
};

export function normalizeFontWeight(weight?: string): string {
    if (!weight) return "400";
    const lower = weight.toLowerCase().replace(/\s+/g, "");
    return FONT_WEIGHT_MAP[lower] ?? weight;
}

// ─── Flex Value Normalization ─────────────────────────────────────────────────
// The internal layout engine uses "start"/"end"/"space_between"/"space_around"
// but agents often pass CSS values like "flex-end" or "space-between".
// Normalize at the point of use so both conventions work.

function normalizeAlignItems(ai?: string): "start" | "center" | "end" | "stretch" {
    switch (ai) {
        case "flex-start": return "start";
        case "flex-end":   return "end";
        case "center":     return "center";
        case "stretch":    return "stretch";
        case "end":        return "end";
        case "start":      return "start";
        default:           return "start";
    }
}

function normalizeJustifyContent(jc?: string): "start" | "center" | "end" | "space_between" | "space_around" {
    switch (jc) {
        case "flex-start":    return "start";
        case "flex-end":      return "end";
        case "space-between": return "space_between";
        case "space-around":  return "space_around";
        case "center":        return "center";
        case "end":           return "end";
        case "space_between": return "space_between";
        case "space_around":  return "space_around";
        case "start":         return "start";
        default:              return "start";
    }
}

// ─── Padding ─────────────────────────────────────────────────────────────────

interface Pad { t: number; r: number; b: number; l: number; }

export function pad(p?: number | number[]): Pad {
    if (!p) return { t: 0, r: 0, b: 0, l: 0 };
    if (typeof p === "number") return { t: p, r: p, b: p, l: p };
    if (p.length === 2) return { t: p[0], r: p[1], b: p[0], l: p[1] };
    if (p.length === 4) return { t: p[0], r: p[1], b: p[2], l: p[3] };
    return { t: 0, r: 0, b: 0, l: 0 };
}

// ─── Canvas-based text measurement ──────────────────────────────────────────
// Uses an offscreen canvas for pixel-accurate text width measurement.
// This is how real design tools (Figma, tldraw) measure text.

let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D {
    if (!_ctx) {
        _canvas = document.createElement("canvas");
        _ctx = _canvas.getContext("2d")!;
    }
    return _ctx;
}

function setFont(ctx: CanvasRenderingContext2D, node: PenNode): void {
    const weight = normalizeFontWeight(node.fontWeight);
    const size = node.fontSize || 16;
    const family = node.fontFamily || "Inter, sans-serif";
    ctx.font = `${weight} ${size}px ${family}`;
}

/** Measure the pixel width of a string using the Canvas API */
function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
    return ctx.measureText(text).width;
}

/**
 * Word-wrap text into lines that fit within maxWidth pixels.
 * Returns array of line strings.
 */
function wordWrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (maxWidth <= 0) return [text];

    const paragraphs = text.split("\n");
    const allLines: string[] = [];

    for (const para of paragraphs) {
        if (para.length === 0) {
            allLines.push("");
            continue;
        }

        const words = para.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) {
            allLines.push("");
            continue;
        }

        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + " " + words[i];
            if (textWidth(ctx, testLine) <= maxWidth) {
                currentLine = testLine;
            } else {
                allLines.push(currentLine);
                currentLine = words[i];
            }
        }
        allLines.push(currentLine);
    }

    return allLines;
}

/**
 * Measure text dimensions using pixel-accurate Canvas API.
 * - maxWidth > 0: word-wrap at maxWidth, return { w: maxWidth, h: wrappedHeight }
 * - maxWidth <= 0: single line per paragraph, w = widest line
 */
function measureText(node: PenNode, maxWidth: number): { w: number; h: number } {
    const ctx = getCtx();
    setFont(ctx, node);

    const text = node.content || "";
    const lh = node.lineHeight || 1.5;
    const size = node.fontSize || 16;
    const lineH = Math.ceil(size * lh);

    if (text.length === 0) return { w: 0, h: lineH };

    if (maxWidth > 0) {
        // Word-wrap at maxWidth
        const lines = wordWrap(ctx, text, maxWidth);
        // +4 height buffer to account for browser rendering differences
        return { w: maxWidth, h: lines.length * lineH + 4 };
    }

    // Auto-width: measure each paragraph as a single line
    const paragraphs = text.split("\n");
    let widest = 0;
    for (const para of paragraphs) {
        widest = Math.max(widest, textWidth(ctx, para));
    }
    // +8 width buffer, +4 height buffer for browser rendering differences
    return { w: Math.ceil(widest) + 8, h: paragraphs.length * lineH + 4 };
}

// ─── Measured node ───────────────────────────────────────────────────────────

interface MeasuredNode {
    node: PenNode;
    intrinsicW: number;
    intrinsicH: number;
    children: MeasuredNode[];
    isFillW: boolean;
    isFillH: boolean;
}

// ─── PASS 1: Measure (bottom-up) ────────────────────────────────────────────

function measure(node: PenNode, availW: number, availH: number): MeasuredNode {
    const isFillW = node.width === "fill";
    const isFillH = node.height === "fill";

    if (node.type === "text") {
        const fixedW = typeof node.width === "number" ? node.width : (isFillW ? availW : 0);
        const m = measureText(node, fixedW);
        const w = typeof node.width === "number" ? node.width : (isFillW ? availW : m.w);
        const h = typeof node.height === "number" ? node.height : m.h;
        return { node, intrinsicW: w, intrinsicH: h, children: [], isFillW, isFillH };
    }

    if (node.type === "icon") {
        const size = typeof node.width === "number" ? node.width : 24;
        return { node, intrinsicW: size, intrinsicH: size, children: [], isFillW: false, isFillH: false };
    }

    if (node.type === "image") {
        const w = typeof node.width === "number" ? node.width : (isFillW ? availW : 200);
        const h = typeof node.height === "number" ? node.height : (isFillH ? availH : 150);
        return { node, intrinsicW: w, intrinsicH: h, children: [], isFillW, isFillH };
    }

    // Frame
    const p = pad(node.padding);
    const gap = node.gap || 0;
    const isHoriz = node.layout === "horizontal";
    const kids = node.children || [];

    const contentAvailW = (typeof node.width === "number" ? node.width : availW) - p.l - p.r;
    const contentAvailH = (typeof node.height === "number" ? node.height : availH) - p.t - p.b;

    // Measure children
    const measuredKids = kids.map(k => measure(k, contentAvailW, contentAvailH));

    let contentW = 0;
    let contentH = 0;
    const totalGap = Math.max(0, measuredKids.length - 1) * gap;

    if (isHoriz) {
        let nonFillW = 0;
        let fillCount = 0;
        for (const mk of measuredKids) {
            if (mk.isFillW) fillCount++;
            else nonFillW += mk.intrinsicW;
            contentH = Math.max(contentH, mk.intrinsicH);
        }
        contentW = nonFillW + totalGap;

        if (fillCount > 0) {
            const fillSpace = Math.max(0, contentAvailW - nonFillW - totalGap);
            const perFill = fillSpace / fillCount;
            for (const mk of measuredKids) {
                if (mk.isFillW) { mk.intrinsicW = perFill; contentW += perFill; }
            }
            // Re-measure fill-width children at their actual allocated width.
            // Text children: re-run measureText at perFill so they wrap correctly.
            // Frame children: recursively re-measure so internal text also sees perFill.
            for (const mk of measuredKids) {
                if (!mk.isFillW) continue;
                if (mk.node.type === "text") {
                    const m = measureText(mk.node, perFill);
                    mk.intrinsicH = typeof mk.node.height === "number" ? mk.node.height : m.h;
                    contentH = Math.max(contentH, mk.intrinsicH);
                } else {
                    // Frame (or other container) fill child — recurse so its internal
                    // text children are measured against perFill, not the parent availW.
                    const remeasured = measure(mk.node, perFill, contentAvailH);
                    mk.intrinsicH = remeasured.intrinsicH;
                    mk.children = remeasured.children;
                    contentH = Math.max(contentH, mk.intrinsicH);
                }
            }
        }
    } else {
        let nonFillH = 0;
        let fillCount = 0;
        for (const mk of measuredKids) {
            if (mk.isFillH) fillCount++;
            else nonFillH += mk.intrinsicH;
            contentW = Math.max(contentW, mk.intrinsicW);
        }
        contentH = nonFillH + totalGap;

        if (fillCount > 0) {
            const fillSpace = Math.max(0, contentAvailH - nonFillH - totalGap);
            const perFill = fillSpace / fillCount;
            for (const mk of measuredKids) {
                if (mk.isFillH) { mk.intrinsicH = perFill; contentH += perFill; }
            }
        }

        // Fill-width children in vertical layout
        for (const mk of measuredKids) {
            if (mk.isFillW) mk.intrinsicW = contentAvailW;
        }

        // AUTO-WRAP: In vertical layouts, bare text nodes are implicitly
        // constrained to parent width (like CSS block-level text).
        // This prevents horizontal overflow without requiring agents to
        // manually wrap text in width:"fill" frames.
        for (const mk of measuredKids) {
            if (mk.node.type === "text" && !mk.isFillW && typeof mk.node.width !== "number" && contentAvailW > 0) {
                if (mk.intrinsicW > contentAvailW) {
                    // Text exceeds parent — re-measure with word wrapping
                    const m = measureText(mk.node, contentAvailW);
                    mk.intrinsicW = contentAvailW;
                    mk.intrinsicH = m.h;
                } else {
                    // Text fits but should still be capped to parent width
                    // so it doesn't visually extend beyond the frame
                    mk.intrinsicW = Math.min(mk.intrinsicW, contentAvailW);
                }
            }
        }

        // Recalculate vertical content height after wrapping
        contentH = totalGap;
        for (const mk of measuredKids) {
            if (!mk.isFillH) contentH += mk.intrinsicH;
        }
        contentW = 0;
        for (const mk of measuredKids) {
            contentW = Math.max(contentW, mk.intrinsicW);
        }
    }

    const frameW = typeof node.width === "number" ? node.width
        : (isFillW ? availW : contentW + p.l + p.r);
    // Treat explicit numeric height as a minimum — let content expand the frame if taller.
    // This prevents children from being clipped when the AI underestimates section height.
    const frameH = typeof node.height === "number"
        ? Math.max(node.height, contentH + p.t + p.b)
        : (isFillH ? availH : contentH + p.t + p.b);

    return { node, intrinsicW: frameW, intrinsicH: frameH, children: measuredKids, isFillW, isFillH };
}

// ─── PASS 2: Place (top-down) ───────────────────────────────────────────────

function place(
    mn: MeasuredNode,
    x: number,
    y: number,
    allocW: number,
    allocH: number,
    shapes: FlatShape[],
    warnings: LayoutWarning[],
    isRoot: boolean = false,
    sectionName?: string,
    parentContentW?: number,
    parentShapeIndex?: number,  // index of this node's parent in shapes[]; undefined = root
): void {
    const n = mn.node;
    const w = allocW;
    const h = allocH;

    if (n.type === "text") {
        // Only warn about width overflow when the text is NOT auto-wrapped.
        // In vertical layouts the measure pass word-wraps text to the parent content
        // width — so a text node allocated the full parent width (w ≈ parentContentW)
        // has already been handled. Reporting natural (unwrapped) width as overflow
        // in that case is a false positive that causes agents to shorten text
        // unnecessarily.
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
                fontSize: n.fontSize || 16,
                fontFamily: n.fontFamily || "Inter, sans-serif",
                fontWeight: n.fontWeight || "normal",
                textAlign: n.textAlign || "left",
                lineHeight: n.lineHeight || 1.5,
                textGrowth: (typeof n.width === "number" || n.width === "fill" || (parentContentW && parentContentW > 0 && w >= parentContentW - 2)) ? "fixed-width" : "auto",
            },
        });
        return;
    }

    if (n.type === "icon") {
        const size = typeof n.width === "number" ? n.width : 24;
        shapes.push({
            shapeType: "pen-icon",
            x, y, w: size, h: size,
            sectionName,
            props: {
                iconName: n.iconName || "circle",
                color: n.iconColor || n.color || n.fill || "#000000",
                strokeWidth: n.iconStrokeWidth || 2,
            },
        });
        return;
    }

    if (n.type === "image") {
        shapes.push({
            shapeType: "pen-image",
            x, y, w, h,
            sectionName,
            parentIndex: parentShapeIndex,
            props: {
                src: n.src || "",
                objectFit: n.objectFit || "cover",
                cornerRadius: n.cornerRadius || 0,
            },
        });
        return;
    }

    // Frame — resolve section name for tagging all children
    const currentSection = isRoot ? (n.name || sectionName) : sectionName;

    const p = pad(n.padding);
    const myIndex = shapes.length;  // capture own position before pushing
    shapes.push({
        shapeType: "pen-frame",
        x, y, w, h,
        sectionName: currentSection,
        parentIndex: parentShapeIndex,  // undefined for root frames
        props: {
            fill: n.fill || "transparent",
            cornerRadius: n.cornerRadius || 0,
            borderColor: n.borderColor || "#e0e0e0",
            borderWidth: n.borderWidth ?? 0,
            name: n.name || "",
            boxShadow: n.boxShadow || "",
            backgroundImage: n.backgroundImage || "",
            layout: n.layout || "vertical",             // stored for resize propagation
            gap: n.gap || 0,                            // stored for resize propagation
            penPadding: JSON.stringify(n.padding ?? 0), // stored for resize propagation
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

        place(child, cx, cy, cw, ch, shapes, warnings, false, currentSection, contentW, myIndex);
        mainCursor += childMainSize + mainGap;
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function layoutTree(
    root: PenNode,
    originX: number,
    originY: number,
    containerW: number,
    containerH: number,
): LayoutResult {
    const shapes: FlatShape[] = [];
    const warnings: LayoutWarning[] = [];
    const measured = measure(root, containerW, containerH);
    place(measured, originX, originY, measured.intrinsicW, measured.intrinsicH, shapes, warnings, true, undefined, containerW);

    // Compute bounding boxes for top-level shapes (root frame + its direct children)
    const computedBounds = shapes.map(s => ({
        sectionName: s.sectionName,
        x: Math.round(s.x),
        y: Math.round(s.y),
        w: Math.round(s.w),
        h: Math.round(s.h),
    }));

    return { shapes, warnings, computedBounds };
}
