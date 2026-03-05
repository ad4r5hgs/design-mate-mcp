# canvas/Agents.md — Canvas App

You are working in the `canvas/` package — a Vite + React application that hosts a tldraw canvas,
a CSS flexbox layout engine, and a WebSocket relay server. It receives commands from the MCP server,
computes layouts, and renders shapes. `ws-server.ts` runs as a standalone Node process alongside
the Vite dev server.

**Coding rules:** Inherited from [`../Agents.md`](../Agents.md) — read it before making any changes.

---

## Dev Commands

```bash
cd canvas
bun run dev       # Vite :3000 + WS relay :4000 (concurrently)
bun run build     # production build
bun run preview   # preview production build
```

---

## Module Map

### Root (`canvas/src/`)

| File | Responsibility | Key Exports |
|------|---------------|-------------|
| `main.tsx` | Vite entry point — mounts `<App />` | — |
| `App.tsx` | Root React component; wires WebSocket, mounts tldraw, connects stores | `App` |
| `stores.ts` | Zustand store (`useCanvasStore`) for all reactive canvas UI state; `editorRef` and `editorActions` kept outside Zustand as imperative refs | `useCanvasStore`, `editorRef`, `editorActions` |
| `constants.ts` | All canvas-level magic numbers (ports, delays, log intervals, UI defaults) | named constants |
| `ws-server.ts` | Standalone WebSocket relay — validates messages at perimeter, broadcasts to all other clients | — |

### Components (`canvas/src/components/`)

| File | Responsibility |
|------|---------------|
| `TopBar.tsx` | Top nav — filename (editable), undo/redo, delete, duplicate |
| `CustomToolbar.tsx` | Left vertical toolbar — select, hand, shape tool toggles |
| `PropertiesPanel.tsx` | Right panel — edit selected shape properties |
| `ChatDrawer.tsx` | Resizable right drawer for AI chat (placeholder) |

### Engine (`canvas/src/engine/`)

The engine is a barrel-exported set of modules. Import everything from `engine/index.ts`.

| File | Responsibility | Key Exports |
|------|---------------|-------------|
| `index.ts` | Barrel — re-exports everything below | all engine exports |
| `batch-handler.ts` | Handles `batch` WebSocket commands | `handleBatch` |
| `single-handler.ts` | Handles non-batch WebSocket commands (snapshot, clear, zoom) | `handleSingle` |
| `section-manager.ts` | Section name/shape tracking + localStorage persistence | `sectionNameMap`, `registerSection`, `restoreSectionMap`, `clearSectionMaps`, `shapeParentMap` |
| `shape-factory.ts` | Converts `FlatShape[]` → tldraw shapes on canvas via a factory map | `createFlatShape` |
| `screenshot-handler.ts` | Async PNG capture with section cropping (125% context) | `handleScreenshot` |
| `resize-handler.ts` | Propagates user-initiated resizes through the parent shape chain | `propagateResize` |
| `defaults.ts` | Default dimensions and typography values used by the layout engine | `DEFAULT_FRAME_WIDTH`, `DEFAULT_FONT_SIZE`, etc. |
| `message-validator.ts` | Lightweight type guards for WebSocket messages at trust boundaries | `tryParseJSON`, `isValidCommand`, `isValidBatchCommand`, `isRelayable` |

### Layout Engine (`canvas/src/lib/layout-engine/`)

2-pass CSS flexbox implementation. Import from `lib/layout-engine/index.ts`.

| File | Responsibility |
|------|---------------|
| `index.ts` | Barrel export |
| `measure.ts` | Pass 1 (bottom-up): measures intrinsic sizes of all nodes |
| `place.ts` | Pass 2 (top-down): resolves final positions using a `placers` dispatch map |
| `text-measure.ts` | Off-screen Canvas 2D API text measurement |
| `normalize.ts` | Normalizes alignment/justify values to internal enum equivalents |
| `types.ts` | Shared types: `PenNode`, `MeasuredNode`, `FlatShape`, `LayoutWarning`, `LayoutResult` |

### Lib (`canvas/src/lib/`)

| File | Responsibility | Key Exports |
|------|---------------|-------------|
| `components.ts` | Reusable component catalog — `register()` + `resolveRefs()` | `resolveRefs`, `getComponent`, `listComponents` |
| `icons.ts` | Lucide icon SVG path data | `ICONS`, `getIconSvg` |

### Shapes (`canvas/src/shapes/`)

Each shape is a self-contained tldraw `ShapeUtil`. Registered in `constants.ts` as
`CUSTOM_SHAPE_UTILS`. Import from `shapes/index.ts`.

| File | Shape Type | Renders As |
|------|-----------|------------|
| `PenFrameUtil.tsx` | `pen-frame` | CSS flexbox container (gradient, shadow, background-image) |
| `PenTextUtil.tsx` | `pen-text` | Text with auto-wrap and full font control |
| `PenIconUtil.tsx` | `pen-icon` | Lucide SVG icons |
| `PenImageUtil.tsx` | `pen-image` | Images with object-fit, placeholder and error states |
| `animationPresets.ts` | — | 10 CSS `@keyframes` presets (fadeIn, slideUp, etc.) |
| `index.ts` | — | Barrel export |

---

## State Management

`stores.ts` uses a single Zustand store with three middleware layers:

- `devtools` — action names visible in Redux DevTools
- `persist` — `filename` and `chatPanelWidth` auto-saved to localStorage (transient state like `hasSelection` is excluded)
- `subscribeWithSelector` — granular slice subscriptions outside React components

`editorRef` and `editorActions` are intentionally outside Zustand — the tldraw `Editor` is an
imperative object. Putting it in a store causes needless re-renders.

---

## Extension Patterns

### Adding a New Shape Type

1. Create `canvas/src/shapes/PenMyShapeUtil.tsx` extending tldraw's `ShapeUtil`
2. Export from `canvas/src/shapes/index.ts`
3. Add to `CUSTOM_SHAPE_UTILS` array in `canvas/src/constants.ts`
   — `App.tsx` and `PEN_SHAPE_TYPES` derive from it automatically, no other edits needed
4. Add creation logic in `engine/shape-factory.ts` factory map
5. Handle update case in `engine/single-handler.ts` or `engine/batch-handler.ts` as needed

### Adding a New Engine Module

1. Create `canvas/src/engine/my-module.ts` with `@module` docblock
2. Export from `canvas/src/engine/index.ts`
3. Import in `App.tsx` or other engine modules as needed

### Adding a New Reusable Component

1. Add to `canvas/src/lib/components.ts` using `register()`:

```ts
register({
  name: "MyComponent",
  description: "What it does",
  category: "Category",
  overrides: { label: "Button text" },
  template: { type: "frame", layout: "horizontal", children: [...] },
});
```

2. Add metadata to `mcp/data/component-catalog.ts` for `list_components`

---

## TypeScript Notes

- `moduleResolution: "bundler"` — no `.js` extensions needed in import paths
- Strict mode enabled — no implicit `any`, strict null checks
- Canvas-only code may use browser APIs freely; `ws-server.ts` is Node-only and cannot import from `src/`

---

## Inherited Rules (summary — full text in `../Agents.md`)

1. **No magic numbers/strings** — use named constants in `constants.ts`
2. **JSDoc on every module and export** — `@module` docblock + `/** */` on each export
3. **Single responsibility per file** — ~150 line target; extract when growing
4. **Extension without modification** — follow the patterns in the table above
5. **No circular imports** — data flows `App → engine → shapes/lib`
6. **No blind casts** — use type guards (`isValidCommand`, etc.) before any `as SomeType`
7. **No silent failures** — per-operation catch in batch handlers; always `console.warn` non-fatal
8. **Barrel exports** — `index.ts` in `engine/`, `shapes/`, `lib/layout-engine/`
9. **Naming conventions** — `kebab-case` files, `PascalCase` classes, `UPPER_SNAKE_CASE` constants
10. **No speculative abstractions** — abstract at the third instance, not before
