// ─────────────────────────────────────────────────────────────────────────────
// Tiny pub/sub stores — shared state without React context.
//
// tldraw renders component slots as independent React subtrees that don't
// share a common context, so we use module-level observables instead.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = () => void;

export interface Store<T> {
    get: () => T;
    set: (value: T) => void;
    subscribe: (listener: Listener) => () => void;
}

function createStore<T>(initial: T): Store<T> {
    let value = initial;
    const listeners = new Set<Listener>();
    return {
        get: () => value,
        set: (v) => {
            value = v;
            listeners.forEach((fn) => fn());
        },
        subscribe: (fn) => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
    };
}

function readLocalStorage(key: string, fallback: string): string {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

export const filenameStore = createStore<string>(
    readLocalStorage("canvas-filename", "Untitled")
);

export const chatOpenStore = createStore<boolean>(false);

/** Width of the chat drawer in pixels — updated by the resize drag handle */
export const chatPanelWidthStore = createStore<number>(280);

// ─────────────────────────────────────────────────────────────────────────────
// Editor ref + selection state — lets TopBar (outside tldraw's React tree)
// call editor methods and react to selection changes.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const editorRef: { current: any | null } = { current: null };

/** True whenever ≥1 shape is selected — drives enable/disable of action buttons */
export const hasSelectionStore = createStore<boolean>(false);

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
