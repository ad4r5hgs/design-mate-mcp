import React from "react";
import {
    HTMLContainer,
    Rectangle2d,
    ShapeUtil,
    TLBaseShape,
    T,
    TLResizeInfo,
} from "tldraw";
import { injectAnimationCSS } from "./animationPresets";

injectAnimationCSS();

// ─────────────────────────────────────────────────────────────────────────────
// Shape type — styled container (children are separate shapes)
// ─────────────────────────────────────────────────────────────────────────────

export const PEN_FRAME_TYPE = "pen-frame" as const;

export interface PenFrameProps {
    w: number;
    h: number;
    name: string;
    fill: string;          // hex color OR gradient string
    cornerRadius: number;
    borderColor: string;
    borderWidth: number;
    boxShadow: string;     // CSS box-shadow value
    backgroundImage: string; // URL for background image
    animation: string;     // CSS animation shorthand e.g. "pen-float 3s ease-in-out infinite"
    // Layout metadata — stored so resize propagation can reflow without re-running layout engine
    layout: string;        // "vertical" | "horizontal" | "none"
    gap: number;
    penPadding: string;    // JSON.stringify of padding value e.g. "32" or "[8,16,8,16]"
}

export type PenFrameShape = TLBaseShape<typeof PEN_FRAME_TYPE, PenFrameProps>;

// ─────────────────────────────────────────────────────────────────────────────
// ShapeUtil
// ─────────────────────────────────────────────────────────────────────────────

export class PenFrameUtil extends ShapeUtil<PenFrameShape> {
    static override type = PEN_FRAME_TYPE;

    static override props = {
        w: T.number,
        h: T.number,
        name: T.string,
        fill: T.string,
        cornerRadius: T.number,
        borderColor: T.string,
        borderWidth: T.number,
        boxShadow: T.string,
        backgroundImage: T.string,
        animation: T.string,
        layout: T.string,
        gap: T.number,
        penPadding: T.string,
    };

    getDefaultProps(): PenFrameShape["props"] {
        return {
            w: 400,
            h: 300,
            name: "",
            fill: "transparent",
            cornerRadius: 0,
            borderColor: "#e0e0e0",
            borderWidth: 1,
            boxShadow: "",
            backgroundImage: "",
            animation: "",
            layout: "vertical",
            gap: 0,
            penPadding: "0",
        };
    }

    getGeometry(shape: PenFrameShape) {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        });
    }

    override canResize() { return true; }

    override onResize = (shape: PenFrameShape, info: TLResizeInfo<PenFrameShape>) => {
        const { scaleX, scaleY } = info;
        return {
            props: {
                w: Math.max(10, shape.props.w * Math.abs(scaleX)),
                h: Math.max(10, shape.props.h * Math.abs(scaleY)),
            },
        };
    };

    component(shape: PenFrameShape) {
        const { w, h, fill, cornerRadius, borderColor, borderWidth, boxShadow, backgroundImage, animation } = shape.props;

        // Detect if fill is a gradient string
        const isGradient = fill && (
            fill.startsWith("linear-gradient") ||
            fill.startsWith("radial-gradient") ||
            fill.startsWith("conic-gradient")
        );

        const style: React.CSSProperties = {
            width: w,
            height: h,
            borderRadius: cornerRadius || 0,
            border: (borderWidth ?? 0) > 0
                ? `${borderWidth}px solid ${borderColor || "#e0e0e0"}`
                : undefined,
            boxSizing: "border-box",
            pointerEvents: "none",
            overflow: "hidden",
            ...(animation ? { animation } : {}),
        };

        // Apply fill as either gradient or solid color
        if (isGradient) {
            style.background = fill;
        } else {
            style.backgroundColor = fill || "transparent";
        }

        // Box shadow
        if (boxShadow) {
            style.boxShadow = boxShadow;
        }

        // Background image
        if (backgroundImage) {
            style.backgroundImage = `url(${backgroundImage})`;
            style.backgroundSize = "cover";
            style.backgroundPosition = "center";
        }

        return (
            <HTMLContainer>
                <div style={style} />
            </HTMLContainer>
        );
    }

    indicator(shape: PenFrameShape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
