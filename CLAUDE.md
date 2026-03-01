# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A fork of `dpunj/tldraw-mcp` — an MCP server that lets AI agents drive a tldraw canvas with a CSS flexbox layout engine. The goal is to produce Pencil-level design output from AI.

## Development Commands

Each package has its own directory:

```bash
# MCP server (stdio — used by Claude Desktop / Cursor)
cd mcp
bun run dev        # Run MCP server via tsx
bun run build      # Build to dist/ via tsup (ESM + .d.ts)
bun run check      # TypeScript check (no emit)

# Canvas (run in a separate terminal)
cd canvas
bun run dev        # Starts Vite :3000 + WebSocket relay :4000 concurrently
```

The canvas `bun run dev` must be running before the MCP server can function. The MCP server connects to the canvas via WebSocket on startup.

## Architecture

```
AI Client (Claude) ↔ stdio ↔ MCP Server (mcp/index.ts)
                                     ↕ WebSocket :4000
                              Canvas (Vite :3000 + ws-server.ts :4000)
                                     ↕
                              tldraw canvas (App.tsx)
```

**Request flow for `batch_design`:**
1. MCP tool receives JSON operations array
2. `bridge.ts` sends `{ type: "batch", operations, requestId }` over WebSocket
3. `ws-server.ts` relays to all other connected clients (the tldraw canvas)
4. `App.tsx` receives command, calls `resolveRefs()` (component substitution) then `layoutTree()` (2-pass layout)
5. Layout engine outputs `FlatShape[]` with absolute x/y/w/h — tldraw shapes are created/updated
6. Response with shape IDs sent back via WebSocket → resolved in `bridge.ts` by `requestId`

## Key Files

| File | Purpose |
|------|---------|
| `mcp/index.ts` | All MCP tools (batch_design, batch_get, get_screenshot, get_design_guide, list_components, list_icons, clear_canvas, zoom_to_fit). Contains embedded design guides and component catalog. |
| `mcp/bridge.ts` | WebSocket client. `CanvasBridge` class: requestId-based request/response matching, 30s timeout, lazy connect. |
| `canvas/src/App.tsx` | tldraw canvas + WebSocket message handler. Processes all command types. Maintains `sectionNameMap` for y-anchoring. |
| `canvas/src/ws-server.ts` | Relay-only WebSocket server (port 4000). Broadcasts messages to all connected clients except sender. |
| `canvas/src/layout-engine.ts` | 2-pass layout engine: Pass 1 = `measureNode` (bottom-up intrinsic sizing using Canvas API for text), Pass 2 = `placeNode` (top-down absolute placement). Outputs `FlatShape[]`. |
| `canvas/src/components.ts` | Reusable component catalog (Button/Primary, Card, Input, Badge, Avatar, etc.). Components are registered `PenNode` trees; `resolveRefs()` deep-clones templates and merges overrides. |
| `canvas/src/shapes/PenFrameUtil.tsx` | Custom tldraw ShapeUtil for `pen-frame` type. Renders as CSS flexbox via `HTMLContainer`. Supports gradients, box-shadow, background-image. |
| `canvas/src/shapes/PenTextUtil.tsx` | Custom ShapeUtil for `pen-text` type. Handles text rendering with auto-wrap. |
| `canvas/src/shapes/PenIconUtil.tsx` | Custom ShapeUtil for `pen-icon` type. Renders Lucide SVG icons. |

## MCP Tool Summary

| Tool | Description |
|------|-------------|
| `batch_design` | Create/update/delete shapes via op array. Takes `{ op, type, x, y, width, height, props }`. `props.children` drives the layout tree. |
| `batch_get` | Read canvas shapes, filter by id/type/section name. |
| `get_screenshot` | PNG capture: full canvas or section-scoped with 125% context. |
| `get_design_guide` | Returns embedded design guide text (`landing-page` or `web-app`). |
| `list_components` | Lists pre-built component catalog with override keys. |
| `list_icons` | Lists available Lucide icons by category. |
| `clear_canvas` | Clears all shapes. |
| `zoom_to_fit` | Fits viewport to canvas content. |

## PenNode Tree Schema (for `batch_design` `props.children`)

Node types: `frame` | `text` | `icon` | `ref`

- **frame**: Container with `layout` (vertical/horizontal), `gap`, `padding`, `fill`, `boxShadow`, `cornerRadius`, `children[]`
- **text**: Text content with `content`, `fontSize`, `fontWeight`, `color`
- **icon**: Lucide icon with `iconName`, `iconColor`, `width`
- **ref**: Component instance `{ type: "ref", ref: "Button/Primary", overrides: { label: "..." } }`

Y-positioning: use `y: "after:SectionName"` to anchor below a named section (no manual coordinate math).

## WebSocket Protocol

```ts
// MCP → Canvas (with requestId for response matching)
{ type: "batch", operations: [...], clearFirst: false, requestId: "42" }
{ type: "snapshot", requestId: "43" }
{ type: "screenshot", sectionName: "Hero", requestId: "44" }
{ type: "clear", requestId: "45" }
{ type: "zoom_to_fit", requestId: "46" }

// Canvas → MCP (response)
{ results: [...], refMap: {...}, requestId: "42" }
{ shapes: [...], bounds: {...}, requestId: "43" }
{ image: "data:image/png;base64,...", width: 1200, height: 800, requestId: "44" }
```

## Claude Desktop / Cursor Config

```json
{
  "mcpServers": {
    "tldraw": {
      "command": "bun",
      "args": ["run", "/path/to/mcp/index.ts"]
    }
  }
}
```

Environment variable `TLDRAW_WS_URL` (default: `ws://localhost:4000`) overrides canvas URL.

## Test Files

`test/` contains ad-hoc TypeScript scripts (not a test framework). Run individually:

```bash
bun run test/verify-ws.ts           # Basic WebSocket connectivity
bun run test/verify-batch.ts        # batch_design ops
bun run test/verify-component-tree.ts  # Component ref resolution
bun run test/verify-landing-page.ts    # Full landing page generation
```

Canvas must be running before executing test scripts.

## Docs

- `docs/implementation-plan.md` — POC phases and architecture decisions
- `docs/pencil-mcp-reference.md` — Full Pencil MCP tool reference (used as design target)
- `docs/screenshot-qa-guide.md` — Screenshot QA process and visual inspection checklist
