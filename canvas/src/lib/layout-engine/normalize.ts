/** @module normalize — Font weight, flex value, and padding normalization utilities */

import type { Pad } from "./types";

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

/** Map named font weights (e.g. "semibold") to their CSS numeric equivalents */
export function normalizeFontWeight(weight?: string): string {
    if (!weight) return "400";
    const lower = weight.toLowerCase().replace(/\s+/g, "");
    return FONT_WEIGHT_MAP[lower] ?? weight;
}

/** Normalize CSS alignItems values to internal enum */
export function normalizeAlignItems(ai?: string): "start" | "center" | "end" | "stretch" {
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

/** Normalize CSS justifyContent values to internal enum */
export function normalizeJustifyContent(jc?: string): "start" | "center" | "end" | "space_between" | "space_around" {
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

/** Expand padding shorthand (number or [v,h] or [t,r,b,l]) to { t, r, b, l } */
export function pad(p?: number | number[]): Pad {
    if (!p) return { t: 0, r: 0, b: 0, l: 0 };
    if (typeof p === "number") return { t: p, r: p, b: p, l: p };
    if (p.length === 2) return { t: p[0], r: p[1], b: p[0], l: p[1] };
    if (p.length === 4) return { t: p[0], r: p[1], b: p[2], l: p[3] };
    return { t: 0, r: 0, b: 0, l: 0 };
}
