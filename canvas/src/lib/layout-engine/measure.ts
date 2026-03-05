/**
 * @module measure — Pass 1 (bottom-up): compute intrinsic size for every node.
 *
 * Strategy map pattern: each node type registers its own measurer.
 * To support a new node type, add one entry to `measurers` — no existing
 * code needs to change.
 */

import type { PenNode, MeasuredNode } from "./types";
import { pad } from "./normalize";
import { measureText } from "./text-measure";

/** Signature every node measurer must satisfy */
type NodeMeasurerFn = (
    node: PenNode,
    availW: number,
    availH: number,
    measureFn: typeof measure,
) => MeasuredNode;

// ─── Per-type measurers ───────────────────────────────────────────────────────

function measureTextNode(node: PenNode, availW: number, _availH: number): MeasuredNode {
    const isFillW = node.width === "fill";
    const isFillH = node.height === "fill";
    const fixedW = typeof node.width === "number" ? node.width : (isFillW ? availW : 0);
    const m = measureText(node, fixedW);
    const w = typeof node.width === "number" ? node.width : (isFillW ? availW : m.w);
    const h = typeof node.height === "number" ? node.height : m.h;
    return { node, intrinsicW: w, intrinsicH: h, children: [], isFillW, isFillH };
}

function measureIconNode(node: PenNode): MeasuredNode {
    const size = typeof node.width === "number" ? node.width : 24;
    return { node, intrinsicW: size, intrinsicH: size, children: [], isFillW: false, isFillH: false };
}

function measureImageNode(node: PenNode, availW: number, availH: number): MeasuredNode {
    const isFillW = node.width === "fill";
    const isFillH = node.height === "fill";
    const w = typeof node.width === "number" ? node.width : (isFillW ? availW : 200);
    const h = typeof node.height === "number" ? node.height : (isFillH ? availH : 150);
    return { node, intrinsicW: w, intrinsicH: h, children: [], isFillW, isFillH };
}

function measureFrameNode(
    node: PenNode,
    availW: number,
    availH: number,
    measureFn: typeof measure,
): MeasuredNode {
    const isFillW = node.width === "fill";
    const isFillH = node.height === "fill";
    const p = pad(node.padding);
    const gap = node.gap || 0;
    const isHoriz = node.layout === "horizontal";
    const kids = node.children || [];

    const contentAvailW = (typeof node.width === "number" ? node.width : availW) - p.l - p.r;
    const contentAvailH = (typeof node.height === "number" ? node.height : availH) - p.t - p.b;

    const measuredKids = kids.map(k => measureFn(k, contentAvailW, contentAvailH));

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
            for (const mk of measuredKids) {
                if (!mk.isFillW) continue;
                if (mk.node.type === "text") {
                    const m = measureText(mk.node, perFill);
                    mk.intrinsicH = typeof mk.node.height === "number" ? mk.node.height : m.h;
                    contentH = Math.max(contentH, mk.intrinsicH);
                } else {
                    const remeasured = measureFn(mk.node, perFill, contentAvailH);
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

        for (const mk of measuredKids) {
            if (mk.isFillW) mk.intrinsicW = contentAvailW;
        }

        // AUTO-WRAP: In vertical layouts, bare text nodes are implicitly
        // constrained to parent width (like CSS block-level text).
        for (const mk of measuredKids) {
            if (mk.node.type === "text" && !mk.isFillW && typeof mk.node.width !== "number" && contentAvailW > 0) {
                if (mk.intrinsicW > contentAvailW) {
                    const m = measureText(mk.node, contentAvailW);
                    mk.intrinsicW = contentAvailW;
                    mk.intrinsicH = m.h;
                } else {
                    mk.intrinsicW = Math.min(mk.intrinsicW, contentAvailW);
                }
            }
        }

        // Recalculate after wrapping
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
    const frameH = (typeof node.height === "number" && node.height > 0)
        ? Math.max(node.height, contentH + p.t + p.b)
        : (isFillH ? availH : contentH + p.t + p.b);

    return { node, intrinsicW: frameW, intrinsicH: frameH, children: measuredKids, isFillW, isFillH };
}

// ─── Strategy map ─────────────────────────────────────────────────────────────
// Add a new node type here — no other file needs to change.

const measurers: Record<string, NodeMeasurerFn> = {
    text: measureTextNode,
    icon: measureIconNode,
    image: measureImageNode,
    frame: measureFrameNode,
};

/** Pass 1: bottom-up intrinsic size computation */
export function measure(node: PenNode, availW: number, availH: number): MeasuredNode {
    const fn = measurers[node.type] ?? measurers.frame;
    return fn(node, availW, availH, measure);
}
