/** @module types — Shared interfaces for the layout engine */

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
    // Animation
    animation?: string;
}

export interface FlatShape {
    shapeType: "pen-frame" | "pen-text" | "pen-icon" | "pen-image";
    x: number;
    y: number;
    w: number;
    h: number;
    props: Record<string, unknown>;
    sectionName?: string;
    parentIndex?: number;
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

export interface Pad { t: number; r: number; b: number; l: number; }

export interface MeasuredNode {
    node: PenNode;
    intrinsicW: number;
    intrinsicH: number;
    children: MeasuredNode[];
    isFillW: boolean;
    isFillH: boolean;
}
