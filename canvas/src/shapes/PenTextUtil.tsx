import React from "react";
import {
    HTMLContainer,
    Rectangle2d,
    ShapeUtil,
    TLBaseShape,
    T,
    TLResizeInfo,
} from "tldraw";
import { normalizeFontWeight } from "../lib/layout-engine";
import { injectAnimationCSS } from "./animationPresets";

injectAnimationCSS();

// ─────────────────────────────────────────────────────────────────────────────
// Type Declaration
// ─────────────────────────────────────────────────────────────────────────────

export const PEN_TEXT_TYPE = "pen-text" as const;

export interface PenTextProps {
    w: number;
    h: number;
    content: string;
    fill: string;          // text color
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    textAlign: string;     // "left" | "center" | "right"
    lineHeight: number;
    textGrowth: string;    // "auto" | "fixed-width"
    animation: string;     // CSS animation shorthand
}

export type PenTextShape = TLBaseShape<typeof PEN_TEXT_TYPE, PenTextProps>;

// ─────────────────────────────────────────────────────────────────────────────
// ShapeUtil
// ─────────────────────────────────────────────────────────────────────────────

export class PenTextUtil extends ShapeUtil<PenTextShape> {
    static override type = PEN_TEXT_TYPE;

    static override props = {
        w: T.number,
        h: T.number,
        content: T.string,
        fill: T.string,
        fontSize: T.number,
        fontFamily: T.string,
        fontWeight: T.string,
        textAlign: T.string,
        lineHeight: T.number,
        textGrowth: T.string,
        animation: T.string,
    };

    getDefaultProps(): PenTextShape["props"] {
        return {
            w: 200,
            h: 24,
            content: "Text",
            fill: "#000000",
            fontSize: 16,
            fontFamily: "Inter, sans-serif",
            fontWeight: "normal",
            textAlign: "left",
            lineHeight: 1.5,
            textGrowth: "auto",
            animation: "",
        };
    }

    getGeometry(shape: PenTextShape) {
        return new Rectangle2d({
            width: Math.max(shape.props.w, 20),
            height: Math.max(shape.props.h, 10),
            isFilled: true,
        });
    }

    override canResize() {
        return true;
    }

    override onResize = (shape: PenTextShape, info: TLResizeInfo<PenTextShape>) => {
        const { scaleX, scaleY } = info;

        // Scale both dimensions AND fontSize proportionally
        const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY));

        return {
            props: {
                w: Math.max(20, shape.props.w * Math.abs(scaleX)),
                h: Math.max(10, shape.props.h * Math.abs(scaleY)),
                fontSize: Math.max(8, Math.round(shape.props.fontSize * scale)),
            },
        };
    };

    component(shape: PenTextShape) {
        const { content, fill, fontSize, fontFamily, fontWeight, textAlign, lineHeight, textGrowth, animation } = shape.props;

        const isFixedWidth = textGrowth === "fixed-width";
        const resolvedFontWeight = normalizeFontWeight(fontWeight);

        return (
            <HTMLContainer>
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        color: fill,
                        fontSize,
                        fontFamily,
                        fontWeight: resolvedFontWeight,
                        textAlign: textAlign as React.CSSProperties["textAlign"],
                        lineHeight,
                        // Fixed-width: wrap words and clip overflow
                        // Auto: respect explicit \n but don't word-wrap
                        whiteSpace: isFixedWidth ? "pre-wrap" : "pre",
                        wordBreak: isFixedWidth ? "break-word" : undefined,
                        overflowWrap: isFixedWidth ? "break-word" : undefined,
                        overflow: isFixedWidth ? "hidden" : "visible",
                        textOverflow: isFixedWidth ? "ellipsis" : undefined,
                        pointerEvents: "none",
                        userSelect: "none",
                        ...(animation ? { animation } : {}),
                    }}
                >
                    {content}
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape: PenTextShape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
