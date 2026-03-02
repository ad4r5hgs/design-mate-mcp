import React from "react";
import {
    HTMLContainer,
    Rectangle2d,
    ShapeUtil,
    TLBaseShape,
    T,
    TLResizeInfo,
} from "tldraw";
import { getIconSvg } from "../lib/icons";
import { injectAnimationCSS } from "./animationPresets";

injectAnimationCSS();

// ─────────────────────────────────────────────────────────────────────────────
// Shape type — Lucide SVG icon
// ─────────────────────────────────────────────────────────────────────────────

export const PEN_ICON_TYPE = "pen-icon" as const;

export interface PenIconProps {
    w: number;
    h: number;
    iconName: string;
    color: string;
    strokeWidth: number;
    animation: string;     // CSS animation shorthand
}

export type PenIconShape = TLBaseShape<typeof PEN_ICON_TYPE, PenIconProps>;

// ─────────────────────────────────────────────────────────────────────────────
// ShapeUtil
// ─────────────────────────────────────────────────────────────────────────────

export class PenIconUtil extends ShapeUtil<PenIconShape> {
    static override type = PEN_ICON_TYPE;

    static override props = {
        w: T.number,
        h: T.number,
        iconName: T.string,
        color: T.string,
        strokeWidth: T.number,
        animation: T.string,
    };

    getDefaultProps(): PenIconShape["props"] {
        return {
            w: 24,
            h: 24,
            iconName: "circle",
            color: "#000000",
            strokeWidth: 2,
            animation: "",
        };
    }

    getGeometry(shape: PenIconShape) {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        });
    }

    override canResize() { return true; }

    override onResize = (shape: PenIconShape, info: TLResizeInfo<PenIconShape>) => {
        const { scaleX, scaleY } = info;
        return {
            props: {
                w: Math.max(8, shape.props.w * Math.abs(scaleX)),
                h: Math.max(8, shape.props.h * Math.abs(scaleY)),
            },
        };
    };

    component(shape: PenIconShape) {
        const { w, h, iconName, color, strokeWidth, animation } = shape.props;
        const svgInner = getIconSvg(iconName);

        if (!svgInner) {
            // Unknown icon — render placeholder
            return (
                <HTMLContainer>
                    <div style={{
                        width: w,
                        height: h,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                        fontSize: Math.min(w, h) * 0.4,
                        pointerEvents: "none",
                        ...(animation ? { animation } : {}),
                    }}>
                        ?
                    </div>
                </HTMLContainer>
            );
        }

        return (
            <HTMLContainer>
                <div
                    style={{
                        width: w,
                        height: h,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        ...(animation ? { animation } : {}),
                    }}
                    dangerouslySetInnerHTML={{
                        __html: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg>`,
                    }}
                />
            </HTMLContainer>
        );
    }

    indicator(shape: PenIconShape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
