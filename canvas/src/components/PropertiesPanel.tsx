import React, { useCallback } from "react";
import { track, useEditor, TLShapeId } from "tldraw";
import { PEN_FRAME_TYPE } from "../shapes/PenFrameUtil";
import { PEN_TEXT_TYPE } from "../shapes/PenTextUtil";
import { useCanvasStore } from "../stores";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
    bgPanel: "#161616",
    bgInput: "#1e1e1e",
    border: "#222222",
    borderInput: "#2a2a2a",
    textPrimary: "#e8e8e8",
    textMuted: "#666666",
    textDim: "#3a3a3a",
    accent: "#4A9EF5",
    font: "Inter, system-ui, sans-serif",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shared micro-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
    return (
        <div style={{
            fontSize: 10,
            fontWeight: 500,
            color: C.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            padding: "10px 14px 5px",
            fontFamily: C.font,
        }}>
            {label}
        </div>
    );
}

function Divider() {
    return <div style={{ height: 1, backgroundColor: C.border, margin: "2px 0" }} />;
}

const inputBase: React.CSSProperties = {
    height: 28,
    backgroundColor: C.bgInput,
    border: `1px solid ${C.borderInput}`,
    borderRadius: 4,
    color: C.textPrimary,
    fontSize: 12,
    fontFamily: C.font,
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
    padding: "0 8px",
};

const selectBase: React.CSSProperties = {
    ...inputBase,
    cursor: "pointer",
    appearance: "none" as const,
};

// A labeled number input showing a short prefix like "X", "Y", "W", "H"
function LabeledInput({
    label,
    value,
    onChange,
    readOnly = false,
    type = "number",
    step,
}: {
    label: string;
    value: number | string;
    onChange?: (v: number) => void;
    readOnly?: boolean;
    type?: string;
    step?: number;
}) {
    return (
        <div style={{ flex: 1, position: "relative" }}>
            <span style={{
                position: "absolute",
                left: 7,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 10,
                fontWeight: 500,
                color: "#555",
                fontFamily: C.font,
                pointerEvents: "none",
                zIndex: 1,
                userSelect: "none",
            }}>
                {label}
            </span>
            <input
                type={type}
                step={step}
                readOnly={readOnly}
                value={typeof value === "number" ? Math.round(value) : value}
                onChange={onChange ? (e) => onChange(Number(e.target.value)) : undefined}
                style={{ ...inputBase, paddingLeft: 20 }}
            />
        </div>
    );
}

// Color swatch + hex input
function ColorRow({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const isGradient = !!(value && (
        value.startsWith("linear-gradient") ||
        value.startsWith("radial-gradient")
    ));

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 14px" }}>
            {/* Color swatch */}
            <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: isGradient ? value : (value || "#000"),
                    border: `1px solid ${C.borderInput}`,
                    overflow: "hidden",
                }} />
                {!isGradient && (
                    <input
                        type="color"
                        value={value.startsWith("#") ? value : "#000000"}
                        onChange={(e) => onChange(e.target.value)}
                        style={{
                            position: "absolute",
                            inset: 0,
                            opacity: 0,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                            padding: 0,
                            border: "none",
                        }}
                    />
                )}
            </div>

            {/* Hex / gradient input */}
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                style={{ ...inputBase, flex: 1 }}
                readOnly={isGradient}
                placeholder="transparent"
            />

            {/* Opacity placeholder */}
            <span style={{
                fontSize: 11,
                color: C.textMuted,
                fontFamily: C.font,
                flexShrink: 0,
            }}>
                100%
            </span>
        </div>
    );
}

// Layout direction toggle (vertical / horizontal)
function LayoutToggle({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const btn = (dir: "vertical" | "horizontal", title: string, icon: React.ReactNode) => (
        <button
            title={title}
            onClick={() => onChange(dir)}
            style={{
                flex: 1,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: value === dir ? "#2a2a2a" : "transparent",
                border: `1px solid ${value === dir ? C.accent : C.borderInput}`,
                borderRadius: 4,
                cursor: "pointer",
                color: value === dir ? C.accent : C.textMuted,
                transition: "all 0.1s",
            }}
        >
            {icon}
        </button>
    );

    return (
        <div style={{ display: "flex", gap: 6 }}>
            {btn("vertical", "Vertical layout",
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                </svg>
            )}
            {btn("horizontal", "Horizontal layout",
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Padding helper
// ─────────────────────────────────────────────────────────────────────────────

function parsePenPadding(raw: string): { t: number; r: number; b: number; l: number } {
    try {
        const v = JSON.parse(raw || "0");
        if (typeof v === "number") return { t: v, r: v, b: v, l: v };
        if (Array.isArray(v)) {
            if (v.length === 1) return { t: v[0], r: v[0], b: v[0], l: v[0] };
            if (v.length === 2) return { t: v[0], r: v[1], b: v[0], l: v[1] };
            if (v.length === 4) return { t: v[0], r: v[1], b: v[2], l: v[3] };
        }
    } catch { /* ignore */ }
    return { t: 0, r: 0, b: 0, l: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel shell
// ─────────────────────────────────────────────────────────────────────────────

const panelShell: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    width: 240,
    height: "100%",
    backgroundColor: C.bgPanel,
    borderLeft: `1px solid ${C.border}`,
    overflowY: "auto",
    overflowX: "hidden",
    zIndex: 1000,
    fontFamily: C.font,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export const PropertiesPanel = track(() => {
    const editor = useEditor();
    const chatOpen = useCanvasStore((s) => s.chatOpen);
    const selectedShapes = editor.getSelectedShapes();

    // Hide panel when chat drawer is open
    if (chatOpen) return null;

    if (selectedShapes.length === 0) return null;

    if (selectedShapes.length > 1) {
        return (
            <div style={panelShell}>
                <div style={{ padding: "14px", color: C.textMuted, fontSize: 12 }}>
                    {selectedShapes.length} shapes selected
                </div>
            </div>
        );
    }

    const shape = selectedShapes[0];
    const props = shape.props as Record<string, unknown>;

    if (shape.type === PEN_FRAME_TYPE) {
        return <FramePanel shape={shape} props={props} />;
    }

    if (shape.type === PEN_TEXT_TYPE) {
        return <TextPanel shape={shape} props={props} />;
    }

    return null;
});

// ─────────────────────────────────────────────────────────────────────────────
// Frame Panel
// ─────────────────────────────────────────────────────────────────────────────

const FramePanel = track(({ shape, props }: { shape: any; props: Record<string, unknown> }) => {
    const editor = useEditor();

    const update = useCallback(
        (key: string, value: unknown) => {
            editor.updateShape({ id: shape.id as TLShapeId, type: shape.type, props: { ...props, [key]: value } });
        },
        [editor, shape.id, shape.type, props]
    );

    const updatePos = useCallback(
        (key: "x" | "y", value: number) => {
            editor.updateShape({ id: shape.id, type: shape.type, [key]: value });
        },
        [editor, shape.id, shape.type]
    );

    const padding = parsePenPadding((props.penPadding as string) || "0");
    const layout = (props.layout as string) || "vertical";

    return (
        <div style={panelShell}>
            {/* ── Position ─────────────────── */}
            <SectionHeader label="Position" />
            <div style={{ display: "flex", gap: 6, padding: "0 14px 8px" }}>
                <LabeledInput label="X" value={shape.x} onChange={(v) => updatePos("x", v)} />
                <LabeledInput label="Y" value={shape.y} onChange={(v) => updatePos("y", v)} />
            </div>

            <Divider />

            {/* ── Flex Layout ──────────────── */}
            <SectionHeader label="Flex Layout" />
            <div style={{ padding: "0 14px 4px" }}>
                <LayoutToggle value={layout} onChange={(v) => update("layout", v)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px 8px" }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.font, flexShrink: 0 }}>Gap</span>
                <input
                    type="number"
                    min={0}
                    value={(props.gap as number) || 0}
                    onChange={(e) => update("gap", Number(e.target.value))}
                    style={{ ...inputBase, flex: 1 }}
                />
            </div>

            <Divider />

            {/* ── Padding ──────────────────── */}
            <SectionHeader label="Padding" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "0 14px 8px" }}>
                <LabeledInput label="T" value={padding.t} readOnly />
                <LabeledInput label="B" value={padding.b} readOnly />
                <LabeledInput label="L" value={padding.l} readOnly />
                <LabeledInput label="R" value={padding.r} readOnly />
            </div>

            <Divider />

            {/* ── Dimensions ───────────────── */}
            <SectionHeader label="Dimensions" />
            <div style={{ display: "flex", gap: 6, padding: "0 14px 8px" }}>
                <LabeledInput label="W" value={props.w as number} onChange={(v) => update("w", v)} />
                <LabeledInput label="H" value={props.h as number} onChange={(v) => update("h", v)} />
            </div>

            <Divider />

            {/* ── Appearance ───────────────── */}
            <SectionHeader label="Appearance" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px 8px" }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.font, flexShrink: 0 }}>Radius</span>
                <input
                    type="number"
                    min={0}
                    value={(props.cornerRadius as number) || 0}
                    onChange={(e) => update("cornerRadius", Number(e.target.value))}
                    style={{ ...inputBase, flex: 1 }}
                />
            </div>

            <Divider />

            {/* ── Fill ─────────────────────── */}
            <SectionHeader label="Fill" />
            <ColorRow
                value={(props.fill as string) || "transparent"}
                onChange={(v) => update("fill", v)}
            />
            <div style={{ height: 8 }} />

            <Divider />

            {/* ── Stroke ───────────────────── */}
            <SectionHeader label="Stroke" />
            <ColorRow
                value={(props.borderColor as string) || "#e0e0e0"}
                onChange={(v) => update("borderColor", v)}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px 8px" }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.font, flexShrink: 0 }}>Width</span>
                <input
                    type="number"
                    min={0}
                    value={(props.borderWidth as number) ?? 1}
                    onChange={(e) => update("borderWidth", Number(e.target.value))}
                    style={{ ...inputBase, flex: 1 }}
                />
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Text Panel
// ─────────────────────────────────────────────────────────────────────────────

const TextPanel = track(({ shape, props }: { shape: any; props: Record<string, unknown> }) => {
    const editor = useEditor();

    const update = useCallback(
        (key: string, value: unknown) => {
            editor.updateShape({ id: shape.id as TLShapeId, type: shape.type, props: { ...props, [key]: value } });
        },
        [editor, shape.id, shape.type, props]
    );

    const updatePos = useCallback(
        (key: "x" | "y", value: number) => {
            editor.updateShape({ id: shape.id, type: shape.type, [key]: value });
        },
        [editor, shape.id, shape.type]
    );

    const alignments = ["left", "center", "right"] as const;

    return (
        <div style={panelShell}>
            {/* ── Content ──────────────────── */}
            <SectionHeader label="Content" />
            <div style={{ padding: "0 14px 8px" }}>
                <textarea
                    value={(props.content as string) || ""}
                    onChange={(e) => update("content", e.target.value)}
                    rows={3}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: C.bgInput,
                        border: `1px solid ${C.borderInput}`,
                        borderRadius: 4,
                        color: C.textPrimary,
                        fontSize: 12,
                        padding: "6px 8px",
                        resize: "vertical",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                        outline: "none",
                    }}
                />
            </div>

            <Divider />

            {/* ── Position ─────────────────── */}
            <SectionHeader label="Position" />
            <div style={{ display: "flex", gap: 6, padding: "0 14px 8px" }}>
                <LabeledInput label="X" value={shape.x} onChange={(v) => updatePos("x", v)} />
                <LabeledInput label="Y" value={shape.y} onChange={(v) => updatePos("y", v)} />
            </div>

            <Divider />

            {/* ── Dimensions ───────────────── */}
            <SectionHeader label="Dimensions" />
            <div style={{ display: "flex", gap: 6, padding: "0 14px 8px" }}>
                <LabeledInput label="W" value={props.w as number} onChange={(v) => update("w", v)} />
                <LabeledInput label="H" value={props.h as number} onChange={(v) => update("h", v)} />
            </div>

            <Divider />

            {/* ── Typography ───────────────── */}
            <SectionHeader label="Typography" />

            {/* Font Family */}
            <div style={{ padding: "0 14px 6px" }}>
                <select
                    style={selectBase}
                    value={(props.fontFamily as string) || "Inter, sans-serif"}
                    onChange={(e) => update("fontFamily", e.target.value)}
                >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="system-ui, sans-serif">System UI</option>
                    <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Arial, sans-serif">Arial</option>
                </select>
            </div>

            {/* Size + Weight row */}
            <div style={{ display: "flex", gap: 6, padding: "0 14px 6px" }}>
                <LabeledInput
                    label="Sz"
                    value={props.fontSize as number}
                    onChange={(v) => update("fontSize", v)}
                />
                <div style={{ flex: 1 }}>
                    <select
                        style={selectBase}
                        value={(props.fontWeight as string) || "normal"}
                        onChange={(e) => update("fontWeight", e.target.value)}
                    >
                        <option value="300">Light</option>
                        <option value="normal">Regular</option>
                        <option value="500">Medium</option>
                        <option value="600">Semibold</option>
                        <option value="bold">Bold</option>
                        <option value="800">ExtraBold</option>
                    </select>
                </div>
            </div>

            {/* Alignment + Line Height row */}
            <div style={{ display: "flex", gap: 6, padding: "0 14px 8px", alignItems: "center" }}>
                {/* Alignment icon buttons */}
                <div style={{ display: "flex", gap: 3 }}>
                    {alignments.map((a) => (
                        <button
                            key={a}
                            title={a.charAt(0).toUpperCase() + a.slice(1)}
                            onClick={() => update("textAlign", a)}
                            style={{
                                width: 28,
                                height: 28,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: (props.textAlign as string) === a ? "#2a2a2a" : "transparent",
                                border: `1px solid ${(props.textAlign as string) === a ? C.accent : C.borderInput}`,
                                borderRadius: 4,
                                cursor: "pointer",
                                color: (props.textAlign as string) === a ? C.accent : C.textMuted,
                            }}
                        >
                            {a === "left" && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
                                </svg>
                            )}
                            {a === "center" && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                                </svg>
                            )}
                            {a === "right" && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>

                {/* Line height */}
                <div style={{ flex: 1 }}>
                    <LabeledInput
                        label="LH"
                        value={Number(((props.lineHeight as number) || 1.5).toFixed(1))}
                        onChange={(v) => update("lineHeight", v)}
                        step={0.1}
                    />
                </div>
            </div>

            <Divider />

            {/* ── Fill ─────────────────────── */}
            <SectionHeader label="Fill" />
            <ColorRow
                value={(props.fill as string) || "#000000"}
                onChange={(v) => update("fill", v)}
            />
            <div style={{ height: 8 }} />
        </div>
    );
});
