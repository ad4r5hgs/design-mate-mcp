/** @module text-measure — Pixel-accurate text measurement via Canvas API */

import type { PenNode } from "./types";
import { normalizeFontWeight } from "./normalize";
import { DEFAULT_FONT_SIZE } from "../../engine/defaults";

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
    const size = node.fontSize || DEFAULT_FONT_SIZE;
    const family = node.fontFamily || "Inter, sans-serif";
    ctx.font = `${weight} ${size}px ${family}`;
}

function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
    return ctx.measureText(text).width;
}

/** Word-wrap text into lines that fit within maxWidth pixels */
function wordWrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (maxWidth <= 0) return [text];

    const paragraphs = text.split("\n");
    const allLines: string[] = [];

    for (const para of paragraphs) {
        if (para.length === 0) { allLines.push(""); continue; }

        const words = para.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) { allLines.push(""); continue; }

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
export function measureText(node: PenNode, maxWidth: number): { w: number; h: number } {
    const ctx = getCtx();
    setFont(ctx, node);

    const text = node.content || "";
    const lh = node.lineHeight || 1.5;
    const size = node.fontSize || DEFAULT_FONT_SIZE;
    const lineH = Math.ceil(size * lh);

    if (text.length === 0) return { w: 0, h: lineH };

    if (maxWidth > 0) {
        const lines = wordWrap(ctx, text, maxWidth);
        return { w: maxWidth, h: lines.length * lineH + 4 };
    }

    const paragraphs = text.split("\n");
    let widest = 0;
    for (const para of paragraphs) {
        widest = Math.max(widest, textWidth(ctx, para));
    }
    return { w: Math.ceil(widest) + 8, h: paragraphs.length * lineH + 4 };
}
