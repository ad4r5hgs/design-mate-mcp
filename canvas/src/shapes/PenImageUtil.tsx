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
// Types
// ─────────────────────────────────────────────────────────────────────────────

export const PEN_IMAGE_TYPE = "pen-image" as const;

export interface PenImageProps {
    w: number;
    h: number;
    src: string;
    objectFit: string;
    cornerRadius: number;
    animation: string;     // CSS animation shorthand
}

export type PenImageShape = TLBaseShape<typeof PEN_IMAGE_TYPE, PenImageProps>;

// ─────────────────────────────────────────────────────────────────────────────
// ShapeUtil
// ─────────────────────────────────────────────────────────────────────────────

export class PenImageUtil extends ShapeUtil<PenImageShape> {
    static override type = PEN_IMAGE_TYPE;

    static override props = {
        w: T.number,
        h: T.number,
        src: T.string,
        objectFit: T.string,
        cornerRadius: T.number,
        animation: T.string,
    };

    getDefaultProps(): PenImageShape["props"] {
        return {
            w: 200,
            h: 150,
            src: "",
            objectFit: "cover",
            cornerRadius: 0,
            animation: "",
        };
    }

    getGeometry(shape: PenImageShape) {
        return new Rectangle2d({
            width: Math.max(4, shape.props.w),
            height: Math.max(4, shape.props.h),
            isFilled: true,
        });
    }

    override canResize() { return true; }

    override onResize = (shape: PenImageShape, info: TLResizeInfo<PenImageShape>) => {
        const { scaleX, scaleY } = info;
        return {
            props: {
                w: Math.max(4, shape.props.w * Math.abs(scaleX)),
                h: Math.max(4, shape.props.h * Math.abs(scaleY)),
            },
        };
    };

    component(shape: PenImageShape) {
        const { w, h, src, objectFit, cornerRadius, animation } = shape.props;

        const wrapperStyle: React.CSSProperties = {
            width: w,
            height: h,
            borderRadius: cornerRadius || 0,
            overflow: "hidden",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f1f5f9",
            ...(animation ? { animation } : {}),
        };

        if (!src) {
            return (
                <HTMLContainer>
                    <div style={wrapperStyle}>
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            color: "#94a3b8",
                            fontSize: Math.min(w, h) * 0.12,
                            userSelect: "none",
                        }}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={Math.min(w, h) * 0.3}
                                height={Math.min(w, h) * 0.3}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span>Image</span>
                        </div>
                    </div>
                </HTMLContainer>
            );
        }

        return (
            <HTMLContainer>
                <div style={wrapperStyle}>
                    <img
                        src={src}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: objectFit as React.CSSProperties["objectFit"] || "cover",
                            objectPosition: "center",
                            display: "block",
                            userSelect: "none",
                            pointerEvents: "none",
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                        alt=""
                        draggable={false}
                    />
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape: PenImageShape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
