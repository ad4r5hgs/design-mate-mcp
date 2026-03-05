import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "../stores";

// ─────────────────────────────────────────────────────────────────────────────
// ChatDrawer — placeholder for the AI chatbot (built in the next phase).
// Positioned via `position: fixed` so it sits outside tldraw's React tree.
// Width is user-adjustable via a left-edge drag handle.
// ─────────────────────────────────────────────────────────────────────────────

const MIN_WIDTH = 200;
const MAX_WIDTH = 640;

export function ChatDrawer() {
    const isOpen = useCanvasStore((s) => s.chatOpen);
    const width = useCanvasStore((s) => s.chatPanelWidth);
    const setChatOpen = useCanvasStore((s) => s.setChatOpen);
    const setChatPanelWidth = useCanvasStore((s) => s.setChatPanelWidth);

    const [dragging, setDragging] = useState(false);
    const [handleHovered, setHandleHovered] = useState(false);
    const [closeHovered, setCloseHovered] = useState(false);

    // Captures mouse position + width at drag start
    const dragRef = useRef<{ startX: number; startW: number } | null>(null);

    useEffect(() => {
        if (!dragging) return;

        const onMouseMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            // Moving mouse left increases panel width (panel is anchored right)
            const delta = dragRef.current.startX - e.clientX;
            const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startW + delta));
            setChatPanelWidth(newWidth);
        };

        const onMouseUp = () => {
            setDragging(false);
            dragRef.current = null;
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [dragging, setChatPanelWidth]);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 44,      // below TopBar
                right: 0,
                bottom: 0,
                width,
                backgroundColor: "#161616",
                borderLeft: "1px solid #222222",
                display: "flex",
                flexDirection: "column",
                zIndex: 1500,
                fontFamily: "Inter, system-ui, sans-serif",
                // Disable text selection while dragging
                userSelect: dragging ? "none" : undefined,
            }}
        >
            {/* ── Drag resize handle (left edge) ─────────────────────────── */}
            <div
                title="Drag to resize"
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    cursor: "ew-resize",
                    backgroundColor: dragging
                        ? "#4A9EF5"
                        : handleHovered
                            ? "#333333"
                            : "transparent",
                    transition: dragging ? "none" : "background-color 0.15s",
                    zIndex: 1,
                }}
                onMouseEnter={() => setHandleHovered(true)}
                onMouseLeave={() => setHandleHovered(false)}
                onMouseDown={(e) => {
                    e.preventDefault();
                    dragRef.current = { startX: e.clientX, startW: useCanvasStore.getState().chatPanelWidth };
                    setDragging(true);
                }}
            />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px 0 16px",
                borderBottom: "1px solid #222222",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {/* Sparkles icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A9EF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                        <path d="M20 3v4" /><path d="M22 5h-4" />
                        <path d="M4 17v2" /><path d="M5 18H3" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#d0d0d0", letterSpacing: "-0.1px" }}>
                        AI Assistant
                    </span>
                </div>

                <button
                    onClick={() => setChatOpen(false)}
                    onMouseEnter={() => setCloseHovered(true)}
                    onMouseLeave={() => setCloseHovered(false)}
                    style={{
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: closeHovered ? "#2a2a2a" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        color: closeHovered ? "#e8e8e8" : "#555555",
                        fontSize: 13,
                        lineHeight: 1,
                        transition: "background 0.12s, color 0.12s",
                    }}
                    title="Close"
                >
                    ✕
                </button>
            </div>

            {/* ── Body (placeholder) ─────────────────────────────────────── */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: 24,
                textAlign: "center",
            }}>
                {/* Larger sparkles illustration */}
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                    <path d="M20 3v4" /><path d="M22 5h-4" />
                    <path d="M4 17v2" /><path d="M5 18H3" />
                </svg>
                <p style={{ fontSize: 12, color: "#444444", lineHeight: 1.6, maxWidth: 180, margin: 0 }}>
                    Chat will be available in the next phase
                </p>
            </div>

            {/* ── Resize hint at bottom ───────────────────────────────────── */}
            <div style={{
                padding: "8px 14px",
                fontSize: 10,
                color: "#2e2e2e",
                textAlign: "center",
                flexShrink: 0,
                letterSpacing: "0.2px",
            }}>
                {Math.round(width)}px — drag edge to resize
            </div>
        </div>
    );
}
