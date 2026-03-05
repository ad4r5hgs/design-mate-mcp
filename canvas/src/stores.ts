/**
 * Canvas Store — Global reactive state via Zustand.
 *
 * A single typed store replaces the previous custom pub/sub implementation.
 * Middleware stack:
 *   - devtools:              action names visible in Redux DevTools browser extension
 *   - persist:               `filename` and `chatPanelWidth` auto-saved to localStorage
 *   - subscribeWithSelector: granular slice subscriptions outside React components
 *
 * INTENTIONALLY outside this store:
 *   - `editorRef`:    mutable imperative ref — not reactive state
 *   - `editorActions`: imperative action namespace that calls editor methods directly
 *
 * @module stores
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { DEFAULT_CHAT_PANEL_WIDTH } from "./constants";

// ─── Store shape ─────────────────────────────────────────────────────────────

interface CanvasStore {
    // ── State ──────────────────────────────────────────────────────────────────
    /** Current canvas file name shown in the TopBar */
    filename: string;
    /** Whether the AI chat drawer is open */
    chatOpen: boolean;
    /** Width of the chat drawer in pixels */
    chatPanelWidth: number;
    /** True whenever ≥1 shape is selected — drives enable/disable of action buttons */
    hasSelection: boolean;

    // ── Actions ────────────────────────────────────────────────────────────────
    setFilename: (name: string) => void;
    toggleChat: () => void;
    setChatOpen: (open: boolean) => void;
    setChatPanelWidth: (width: number) => void;
    setHasSelection: (has: boolean) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasStore>()(
    devtools(
        persist(
            subscribeWithSelector((set) => ({
                // Initial state
                filename: "Untitled",
                chatOpen: false,
                chatPanelWidth: DEFAULT_CHAT_PANEL_WIDTH,
                hasSelection: false,

                // Actions
                setFilename: (name) =>
                    set({ filename: name.trim() || "Untitled" }, false, "setFilename"),

                toggleChat: () =>
                    set((s) => ({ chatOpen: !s.chatOpen }), false, "toggleChat"),

                setChatOpen: (open) =>
                    set({ chatOpen: open }, false, "setChatOpen"),

                setChatPanelWidth: (width) =>
                    set({ chatPanelWidth: width }, false, "setChatPanelWidth"),

                setHasSelection: (has) =>
                    set({ hasSelection: has }, false, "setHasSelection"),
            })),
            {
                name: "canvas-store",
                // Only persist UI preferences — hasSelection is transient
                partialize: (s) => ({
                    filename: s.filename,
                    chatPanelWidth: s.chatPanelWidth,
                }),
            }
        ),
        { name: "CanvasStore" }
    )
);

// ─── Editor ref + actions ─────────────────────────────────────────────────────
// Kept outside Zustand — the tldraw Editor is an imperative object, not
// reactive state. Putting it in a store would cause needless re-renders.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const editorRef: { current: any | null } = { current: null };

export const editorActions = {
    undo: () => editorRef.current?.undo(),
    redo: () => editorRef.current?.redo(),
    deleteSelected: () => {
        const e = editorRef.current;
        if (!e) return;
        const ids = [...e.getSelectedShapeIds()];
        if (ids.length > 0) e.deleteShapes(ids);
    },
    duplicate: () => {
        const e = editorRef.current;
        if (!e) return;
        const ids = [...e.getSelectedShapeIds()];
        if (ids.length > 0) e.duplicateShapes(ids);
    },
};
