import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore, editorActions } from "../stores";

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icons (Lucide style — no npm dependency)
// ─────────────────────────────────────────────────────────────────────────────

function IconLayoutGrid({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    );
}

function IconFolder({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function IconMoon({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

/** Sparkles icon — universal "AI / magic" indicator */
function IconSparkles({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
        </svg>
    );
}

function IconUndo({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
    );
}

function IconRedo({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
    );
}

function IconTrash({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
        </svg>
    );
}

function IconCopy({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────────────────────────────────────

export function TopBar() {
    const filename = useCanvasStore((s) => s.filename);
    const hasSelection = useCanvasStore((s) => s.hasSelection);
    const setFilename = useCanvasStore((s) => s.setFilename);

    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(filename);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    const startEdit = () => {
        setEditValue(useCanvasStore.getState().filename);
        setEditing(true);
    };

    const commitEdit = () => {
        setFilename(editValue); // persist middleware handles localStorage automatically
        setEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") commitEdit();
        if (e.key === "Escape") setEditing(false);
    };

    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0,
            height: 44,
            backgroundColor: "#111111",
            borderBottom: "1px solid #1e1e1e",
            display: "flex",
            alignItems: "center",
            zIndex: 2000,
            userSelect: "none",
            fontFamily: "Inter, system-ui, sans-serif",
        }}>
            {/* Left — spacer (matches toolbar width) + action buttons */}
            <div style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
            }}>
                {/* Spacer — matches the 46px custom left toolbar width */}
                <div style={{ width: 46, flexShrink: 0 }} />

                {/* Undo */}
                <ActionIconButton title="Undo (Ctrl+Z)" onClick={editorActions.undo}>
                    <IconUndo />
                </ActionIconButton>

                {/* Redo */}
                <ActionIconButton title="Redo (Ctrl+Shift+Z)" onClick={editorActions.redo}>
                    <IconRedo />
                </ActionIconButton>

                {/* Divider between history and selection actions */}
                <div style={{ width: 1, height: 18, backgroundColor: "#2a2a2a", margin: "0 3px" }} />

                {/* Delete — only active when shapes selected */}
                <ActionIconButton
                    title="Delete selected"
                    onClick={editorActions.deleteSelected}
                    disabled={!hasSelection}
                >
                    <IconTrash />
                </ActionIconButton>

                {/* Duplicate — only active when shapes selected */}
                <ActionIconButton
                    title="Duplicate selected"
                    onClick={editorActions.duplicate}
                    disabled={!hasSelection}
                >
                    <IconCopy />
                </ActionIconButton>
            </div>

            {/* Center — app icon + folder + editable filename */}
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minWidth: 0,
            }}>
                <IconLayoutGrid color="#555555" />
                <IconFolder color="#4a4a4a" />

                {editing ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        style={{
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid #4A9EF5",
                            color: "#e8e8e8",
                            fontSize: 13,
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontWeight: 400,
                            outline: "none",
                            width: Math.max(80, editValue.length * 8 + 16),
                            textAlign: "center",
                            padding: "1px 2px",
                        }}
                    />
                ) : (
                    <span
                        onClick={startEdit}
                        title="Click to rename"
                        style={{
                            color: "#c0c0c0",
                            fontSize: 13,
                            fontWeight: 400,
                            cursor: "text",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 280,
                            letterSpacing: "-0.1px",
                        }}
                    >
                        {filename}
                    </span>
                )}
            </div>

            {/* Right — divider + theme toggle (disabled) + AI chat button */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                paddingRight: 10,
                flexShrink: 0,
            }}>
                {/* Separator */}
                <div style={{ width: 1, height: 18, backgroundColor: "#2a2a2a", margin: "0 4px" }} />

                {/* Theme toggle — dark mode only, non-interactive */}
                <div
                    title="Dark mode only"
                    style={{
                        width: 30,
                        height: 30,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 6,
                        opacity: 0.28,
                        cursor: "not-allowed",
                        color: "#888888",
                    }}
                >
                    <IconMoon />
                </div>

                {/* AI assistant button */}
                <AIButton />
            </div>
        </div>
    );
}

function ActionIconButton({
    title,
    onClick,
    disabled = false,
    children,
}: {
    title: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            title={title}
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: hovered && !disabled ? "#1a1a1a" : "transparent",
                border: "none",
                borderRadius: 6,
                cursor: disabled ? "default" : "pointer",
                color: disabled ? "#333333" : hovered ? "#c0c0c0" : "#777777",
                transition: "background 0.1s, color 0.1s",
            }}
        >
            {children}
        </button>
    );
}

function AIButton() {
    const [hovered, setHovered] = useState(false);
    const isOpen = useCanvasStore((s) => s.chatOpen);
    const toggleChat = useCanvasStore((s) => s.toggleChat);

    return (
        <button
            title="Open AI Assistant"
            onClick={toggleChat}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isOpen ? "#1e1e1e" : hovered ? "#1a1a1a" : "transparent",
                border: isOpen ? "1px solid #2a2a2a" : "1px solid transparent",
                borderRadius: 6,
                cursor: "pointer",
                color: isOpen ? "#e8e8e8" : hovered ? "#c0c0c0" : "#666666",
                transition: "background 0.12s, color 0.12s, border-color 0.12s",
            }}
        >
            <IconSparkles />
        </button>
    );
}
