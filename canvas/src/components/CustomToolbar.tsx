import React from "react";
import { track, useEditor } from "tldraw";

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions — mirrors the tools shown in the default tldraw toolbar
// ─────────────────────────────────────────────────────────────────────────────

interface ToolDef {
    id: string;
    title: string;
    icon: React.ReactNode;
}

const ICON_SIZE = 17;

const TOOLS: ToolDef[] = [
    {
        id: "select",
        title: "Select (V)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M4 2l16 9-7 2-4 8z" />
            </svg>
        ),
    },
    {
        id: "hand",
        title: "Hand / Pan (H)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
                <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
        ),
    },
    {
        id: "draw",
        title: "Draw (D)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
        ),
    },
    {
        id: "eraser",
        title: "Eraser (E)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                <path d="M22 21H7" />
                <path d="m5 11 9 9" />
            </svg>
        ),
    },
    {
        id: "arrow",
        title: "Arrow (A)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
            </svg>
        ),
    },
    {
        id: "text",
        title: "Text (T)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
        ),
    },
    {
        id: "note",
        title: "Sticky Note (N)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                <path d="M15 3v6h6" />
            </svg>
        ),
    },
    {
        id: "frame",
        title: "Frame (F)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="6" x2="2" y2="6" />
                <line x1="22" y1="18" x2="2" y2="18" />
                <line x1="6" y1="2" x2="6" y2="22" />
                <line x1="18" y1="2" x2="18" y2="22" />
            </svg>
        ),
    },
    {
        id: "geo",
        title: "Shapes (R)",
        icon: (
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
        ),
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// CustomToolbar
// ─────────────────────────────────────────────────────────────────────────────

export const CustomToolbar = track(() => {
    const editor = useEditor();
    const activeTool = editor.getCurrentToolId();

    return (
        <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 46,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 10,
            paddingBottom: 10,
            gap: 2,
            zIndex: 500,
            // No background — blends with tldraw's dark canvas
        }}>
            {TOOLS.map((tool, i) => (
                <React.Fragment key={tool.id}>
                    {/* Separator before eraser (logical group boundary) */}
                    {i === 2 && (
                        <div style={{
                            width: 22,
                            height: 1,
                            backgroundColor: "#2a2a2a",
                            margin: "4px 0",
                            flexShrink: 0,
                        }} />
                    )}
                    <ToolButton
                        tool={tool}
                        active={activeTool === tool.id}
                        onClick={() => editor.setCurrentTool(tool.id)}
                    />
                </React.Fragment>
            ))}
        </div>
    );
});

function ToolButton({
    tool,
    active,
    onClick,
}: {
    tool: ToolDef;
    active: boolean;
    onClick: () => void;
}) {
    const [hovered, setHovered] = React.useState(false);

    return (
        <button
            title={tool.title}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.1s, color 0.1s",
                background: active
                    ? "#4A9EF5"
                    : hovered
                    ? "rgba(255,255,255,0.07)"
                    : "transparent",
                color: active
                    ? "#ffffff"
                    : hovered
                    ? "#d0d0d0"
                    : "#888888",
            }}
        >
            {tool.icon}
        </button>
    );
}
