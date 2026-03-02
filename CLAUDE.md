# CLAUDE.md — Project Index

This file is the single source of truth for any agent working on this codebase.
It covers architecture, module responsibilities, coding standards, extension patterns, and debugging.

## What This Is

**designmate** — An MCP server that lets AI agents drive a tldraw canvas with a CSS flexbox layout engine. AI describes UI trees in JSON; the engine computes pixel-perfect layouts and renders them as interactive shapes on a canvas.

## Development Commands

```bash
# Terminal 1 — Canvas (must start first)
cd canvas && bun run dev    # Vite :3000 + WebSocket relay :4000

# Terminal 2 — MCP server (stdio transport)
cd mcp && bun run dev       # Run via tsx
cd mcp && bun run build     # Build to dist/ via tsup
cd mcp && bun run check     # TypeScript check (no emit)
```

## Architecture

```
AI Client (Claude/Cursor) ↔ stdio ↔ MCP Server
                                        ↕ WebSocket :4000
                                 Canvas (Vite :3000 + ws-server.ts :4000)
                                        ↕
                                 tldraw canvas (App.tsx)
```

### Request Flow (batch_design)

1. AI sends tool call → MCP `batch-design.ts` validates with Zod schemas
2. `bridge.ts` sends `{ type: "batch", operations, requestId }` over WebSocket
3. `ws-server.ts` relays to all connected canvas clients
4. `App.tsx` dispatches to `batch-processor.ts` → calls `resolveRefs()` (component substitution) → `layoutTree()` (2-pass layout)
5. Layout engine outputs `FlatShape[]` → `shape-factory.ts` creates tldraw shapes
6. Response with shape IDs flows back via WebSocket → resolved in `bridge.ts` by `requestId`

## Module Map

### MCP Server (`mcp/`)

| Module | Responsibility | Exports |
|--------|---------------|---------|
| `index.ts` | Slim orchestrator — wires bridge + tool modules | `main()` |
| `bridge.ts` | WebSocket client, requestId-based req/res matching, 30s timeout | `CanvasBridge` |
| `schemas/pen-node.ts` | Zod schemas for PenNode tree, batch operations | `PenNode`, `CreateOp`, `UpdateOp`, `DeleteOp`, `BatchOperation` |
| `tools/batch-design.ts` | `batch_design` tool — create/update/delete shapes | `registerBatchDesign(server, bridge)` |
| `tools/batch-get.ts` | `batch_get` tool — read canvas state with filters | `registerBatchGet(server, bridge)` |
| `tools/screenshot.ts` | `get_screenshot` tool — PNG capture (full/section/shapes) | `registerScreenshot(server, bridge)` |
| `tools/canvas-ops.ts` | `clear_canvas` + `zoom_to_fit` tools | `registerCanvasOps(server, bridge)` |
| `tools/catalog.ts` | `list_components` + `list_icons` + `get_design_guide` tools | `registerCatalog(server)` |
| `data/design-guides.ts` | Embedded design guide content (landing-page, web-app) | `DESIGN_GUIDES` |
| `data/component-catalog.ts` | Component metadata (name, description, overrides) | `COMPONENT_CATALOG` |
| `data/icon-catalog.ts` | Lucide icon names grouped by category | `ICON_CATALOG` |

### Canvas (`canvas/src/`)

| Module | Responsibility | Exports |
|--------|---------------|---------|
| `App.tsx` | Root React component + WebSocket wiring (~140 lines) | `App` |
| `main.tsx` | Vite entry point | — |
| `stores.ts` | Tiny pub/sub stores for cross-tree React state | `chatOpenStore`, `editorRef`, `hasSelectionStore`, etc. |
| `ws-server.ts` | Relay-only WebSocket server (port 4000) | — |

### Canvas UI Components (`canvas/src/components/`)

| Module | Responsibility |
|--------|---------------|
| `TopBar.tsx` | Top navigation bar with filename, undo/redo, delete, duplicate |
| `CustomToolbar.tsx` | Left-side vertical toolbar (select, hand, shape tools) |
| `PropertiesPanel.tsx` | Right-side panel for editing selected shape properties |
| `ChatDrawer.tsx` | Resizable right drawer for AI chat (placeholder) |

### Canvas Core Libraries (`canvas/src/lib/`)

| Module | Responsibility | Exports |
|--------|---------------|---------|
| `layout-engine.ts` | 2-pass flexbox: `measureNode()` bottom-up + `placeNode()` top-down | `layoutTree`, `PenNode`, `FlatShape`, `LayoutResult`, `pad` |
| `components.ts` | Reusable component catalog (18 components) | `resolveRefs`, `getComponent`, `listComponents` |
| `icons.ts` | Lucide icon SVG path data | `ICONS`, `getIconSvg` |

### Canvas Engine (`canvas/src/engine/`)

| Module | Responsibility | Exports |
|--------|---------------|---------|
| `index.ts` | Barrel export for all engine modules | everything below |
| `section-manager.ts` | Section name/shape tracking + localStorage persistence | `sectionNameMap`, `registerSection`, `restoreSectionMap`, `clearSectionMaps` |
| `shape-factory.ts` | Converts `FlatShape` → tldraw shapes on canvas | `createFlatShape(editor, flat)` |
| `batch-processor.ts` | Handles batch + single WebSocket commands | `handleBatch`, `handleSingle` |
| `screenshot-handler.ts` | PNG capture with section cropping (125% context) | `handleScreenshot(editor, msg)` |
| `resize-handler.ts` | Propagates user resizes through parent chain | `propagateResize(editor, changedId)` |

### Canvas Shapes (`canvas/src/shapes/`)

| Module | Shape Type | Renders As |
|--------|-----------|------------|
| `PenFrameUtil.tsx` | `pen-frame` | CSS flexbox container (gradient, shadow, background-image) |
| `PenTextUtil.tsx` | `pen-text` | Text with auto-wrap, font control |
| `PenIconUtil.tsx` | `pen-icon` | Lucide SVG icons |
| `PenImageUtil.tsx` | `pen-image` | Images with object-fit, placeholder/error states |
| `animationPresets.ts` | — | 10 CSS @keyframes presets (fadeIn, slideUp, etc.) |
| `index.ts` | — | Barrel export for all shape utils |

## MCP Tool Summary

| Tool | Module | Description |
|------|--------|-------------|
| `batch_design` | `tools/batch-design.ts` | Create/update/delete shapes via op array |
| `batch_get` | `tools/batch-get.ts` | Read canvas shapes, filter by id/type/section |
| `get_screenshot` | `tools/screenshot.ts` | PNG capture: full, section-scoped, or by shape IDs |
| `get_design_guide` | `tools/catalog.ts` | Returns design methodology (landing-page or web-app) |
| `list_components` | `tools/catalog.ts` | Lists pre-built component catalog |
| `list_icons` | `tools/catalog.ts` | Lists available Lucide icons by category |
| `clear_canvas` | `tools/canvas-ops.ts` | Clears all shapes |
| `zoom_to_fit` | `tools/canvas-ops.ts` | Fits viewport to content |

## PenNode Tree Schema

Node types: `frame` | `text` | `icon` | `image` | `ref`

```ts
// Container
{ type: "frame", layout: "vertical"|"horizontal", gap: 16, padding: 24,
  fill: "#fff", cornerRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  children: [...] }

// Text
{ type: "text", content: "Hello", fontSize: 16, fontWeight: "bold", color: "#000" }

// Icon (Lucide)
{ type: "icon", iconName: "search", iconColor: "#666", width: 20 }

// Image
{ type: "image", src: "https://...", objectFit: "cover", cornerRadius: 8 }

// Component ref (resolved before layout)
{ type: "ref", ref: "Button/Primary", overrides: { label: "Get Started" } }
```

Y-positioning: `y: "after:SectionName"` anchors below a named section.

## WebSocket Protocol

```ts
// MCP → Canvas
{ type: "batch", operations: [...], clearFirst: false, requestId: "42" }
{ type: "snapshot", requestId: "43" }
{ type: "screenshot", sectionName: "Hero", requestId: "44" }
{ type: "clear", requestId: "45" }
{ type: "zoom_to_fit", requestId: "46" }

// Canvas → MCP
{ results: [...], refMap: {...}, requestId: "42" }
{ shapes: [...], bounds: {...}, requestId: "43" }
{ image: "data:image/png;base64,...", width: 1200, height: 800, requestId: "44" }
```

## Coding Standards

### File Organization
- **Lego block pattern**: Each feature is a self-contained module with a single `register*()` or handler function
- **Barrel exports**: Use `index.ts` files in directories with 3+ modules
- **No circular imports**: Data flows downward (index → tools → data, App → engine → shapes)

### TypeScript
- Strict mode enabled in both packages
- Canvas uses `moduleResolution: "bundler"` (no `.js` extensions needed)
- MCP uses `moduleResolution: "bundler"` with `"type": "module"` in package.json (`.js` extensions required in imports)

### JSDoc
- Every module file has a top-level `/** @module */` docblock describing purpose
- Exported functions get a single-line `/** description */` comment
- No inline comments unless logic is non-obvious

### Naming
- Files: `kebab-case.ts` (e.g., `batch-processor.ts`, `section-manager.ts`)
- Classes: `PascalCase` (e.g., `CanvasBridge`, `PenFrameUtil`)
- Functions: `camelCase` (e.g., `createFlatShape`, `handleBatch`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DESIGN_GUIDES`, `PEN_FRAME_TYPE`)

### Error Handling
- MCP tools: catch at tool level, return `{ isError: true, content: [{ type: "text", text: message }] }`
- Canvas WebSocket: catch per-operation in batch loop, push `{ op, error: String(err) }` to results
- localStorage: catch silently (non-fatal — user experience degrades gracefully)
- WebSocket: auto-reconnect with 2s delay on close

## Extension Patterns

### Adding a New MCP Tool

1. Create `mcp/tools/my-tool.ts`:
```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CanvasBridge } from "../bridge.js";

export function registerMyTool(server: McpServer, bridge: CanvasBridge): void {
  server.tool("my_tool", "Description", { /* zod schema */ }, async (args) => {
    // implementation
    return { content: [{ type: "text", text: "result" }] };
  });
}
```
2. Register in `mcp/index.ts`: `registerMyTool(server, bridge);`

### Adding a New Shape Type

1. Create `canvas/src/shapes/PenMyShapeUtil.tsx` extending tldraw's `ShapeUtil`
2. Export from `canvas/src/shapes/index.ts`
3. Add to `customShapeUtils` array in `App.tsx`
4. Add creation logic in `engine/shape-factory.ts`
5. Handle in `engine/batch-processor.ts` create/update cases

### Adding a New Reusable Component

1. Add to `canvas/src/components.ts` using `register()`:
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

### Adding a New Engine Module

1. Create `canvas/src/engine/my-module.ts` with `@module` docblock
2. Export from `canvas/src/engine/index.ts`
3. Import in `App.tsx` or other engine modules as needed

## Reusable Component Catalog

Components are PenNode templates registered in `canvas/src/components.ts`.
Use via `{ type: "ref", ref: "Name", overrides: {...} }`.

| Component | Category | Key Overrides |
|-----------|----------|---------------|
| `Button/Primary` | Buttons | `label` |
| `Button/Secondary` | Buttons | `label` |
| `Button/Ghost` | Buttons | `label` |
| `Input` | Form | `label`, `placeholder` |
| `Textarea` | Form | `label`, `placeholder` |
| `Select` | Form | `label`, `options` |
| `Checkbox` | Form | `label`, `checked` |
| `Card` | Layout | `title`, `description` |
| `Badge` | Data Display | `text`, `variant` |
| `Avatar` | Data Display | `initials`, `size` |
| `Divider` | Layout | `color` |
| `ProgressBar` | Feedback | `value`, `max`, `color` |
| `Toggle` | Form | `label`, `checked` |
| `Tooltip` | Overlay | `text`, `content` |
| `Tabs` | Navigation | `items`, `activeIndex` |
| `Breadcrumb` | Navigation | `items` |
| `Alert` | Feedback | `title`, `description`, `variant` |
| `Stat` | Data Display | `label`, `value`, `change` |

## Configuration

### Claude Desktop / Cursor
```json
{
  "mcpServers": {
    "designmate": {
      "command": "bun",
      "args": ["run", "/path/to/mcp/index.ts"]
    }
  }
}
```

Environment variable `TLDRAW_WS_URL` (default: `ws://localhost:4000`) overrides canvas URL.

