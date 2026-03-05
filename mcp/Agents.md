# mcp/Agents.md — MCP Server

You are working in the `mcp/` package — a Node.js MCP server (stdio transport). It receives tool
calls from AI clients, validates them with Zod, and relays commands to the canvas over WebSocket.
This package has no DOM access and no React dependency.

**Coding rules:** Inherited from [`../Agents.md`](../Agents.md) — read it before making any changes.

---

## Dev Commands

```bash
cd mcp
bun run dev       # run with tsx (live reload)
bun run build     # compile to dist/ via tsup
bun run check     # TypeScript check, no emit
```

---

## Module Map

### Entry & Bridge

| File | Responsibility | Key Export |
|------|---------------|------------|
| `index.ts` | Slim orchestrator — instantiates bridge, registers all tools | `main()` |
| `bridge.ts` | WebSocket client; requestId-based req/res matching; validates canvas responses | `CanvasBridge` |
| `constants.ts` | All MCP-level magic numbers and strings (timeouts, ports, section markers) | named constants |

### Schemas

| File | Responsibility | Key Exports |
|------|---------------|-------------|
| `schemas/pen-node.ts` | Zod schemas for the PenNode tree and all batch operations | `PenNode`, `BatchOperation`, `CreateOp`, `UpdateOp`, `DeleteOp` |
| `schemas/tool-schemas.ts` | Centralized Zod input schemas for every MCP tool; derives guide enum from loaded files | `BatchDesignInput`, `BatchGetInput`, `ScreenshotInput`, `DesignGuideInput`, `GUIDE_TOPIC_LIST` |

### Tools

Each tool is a self-contained module with a single `register*()` function. Register in `index.ts`.

| File | Tool(s) registered | Description |
|------|--------------------|-------------|
| `tools/batch-design.ts` | `batch_design` | Create/update/delete shapes via operation array |
| `tools/batch-get.ts` | `batch_get` | Read canvas state; filter by id, type, or section name |
| `tools/screenshot.ts` | `get_screenshot` | PNG capture — full canvas, section-scoped, or by shape IDs |
| `tools/canvas-ops.ts` | `clear_canvas`, `zoom_to_fit` | Canvas-level operations |
| `tools/catalog.ts` | `list_components`, `list_icons`, `get_design_guide` | Catalog and design guide access |

### Data

| File/Path | Responsibility |
|-----------|---------------|
| `data/design-guides-loader.ts` | Auto-discovers all `.md` files in `data/guides/` at startup; builds `DESIGN_GUIDES` map |
| `data/guides/landing-page.md` | Design methodology for marketing/landing pages |
| `data/guides/web-app.md` | Design methodology for dashboards and SaaS product UI |
| `data/component-catalog.ts` | Component metadata (name, description, overrides) for `list_components` |
| `data/icon-catalog.ts` | Lucide icon names grouped by category for `list_icons` |

---

## WebSocket Protocol

```ts
// MCP → Canvas (commands)
{ type: "batch",       operations: [...], clearFirst: false, requestId: "42" }
{ type: "snapshot",    requestId: "43" }
{ type: "screenshot",  sectionName: "Hero", requestId: "44" }
{ type: "clear",       requestId: "45" }
{ type: "zoom_to_fit", requestId: "46" }

// Canvas → MCP (responses)
{ results: [...], refMap: {...}, requestId: "42" }
{ shapes: [...], bounds: {...}, requestId: "43" }
{ image: "data:image/png;base64,...", width: 1200, height: 800, requestId: "44" }
```

All responses are matched to their originating request by `requestId`.
If no handler is found for a `requestId`, the response is logged and discarded.

---

## PenNode Tree Schema

Node types: `frame` | `text` | `icon` | `image` | `ref`

```ts
// Container — CSS flexbox model
{ type: "frame", layout: "vertical" | "horizontal", gap: 16, padding: 24,
  fill: "#fff", cornerRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  children: [...] }

// Text
{ type: "text", content: "Hello", fontSize: 16, fontWeight: "bold", color: "#000" }

// Icon (Lucide)
{ type: "icon", iconName: "search", iconColor: "#666", width: 20 }

// Image
{ type: "image", src: "https://...", objectFit: "cover", cornerRadius: 8 }

// Component ref (resolved before layout on the canvas side)
{ type: "ref", ref: "Button/Primary", overrides: { label: "Get Started" } }
```

Y-positioning: `y: "after:SectionName"` anchors a section below the named section.

---

## Extension Patterns

### Adding a New MCP Tool

1. Create `mcp/tools/my-tool.ts`:

```ts
/**
 * My Tool — one-line description of what this tool does.
 * @module tools/my-tool
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CanvasBridge } from "../bridge.js";
import { MyToolInput } from "../schemas/tool-schemas.js";

/** Register the my_tool tool on the MCP server. */
export function registerMyTool(server: McpServer, bridge: CanvasBridge): void {
  server.registerTool("my_tool", {
    description: "...",
    inputSchema: MyToolInput,
  }, async (args) => {
    try {
      // implementation
      return { content: [{ type: "text", text: "result" }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: String(err) }] };
    }
  });
}
```

2. Add the input schema to `schemas/tool-schemas.ts`
3. Register in `index.ts`: `registerMyTool(server, bridge);`

### Adding a New Design Guide

Drop a Markdown file into `data/guides/my-topic.md`. It is automatically discovered at startup,
added to the `DESIGN_GUIDES` map, and appears as a valid enum value in `get_design_guide`.
**No code changes required.**

---

## TypeScript Notes

- `moduleResolution: "bundler"` with `"type": "module"` in `package.json`
- Import paths **must** use `.js` extensions (e.g., `import { X } from "./bridge.js"`)
- Strict mode is enabled — no implicit `any`, strict null checks

---

## Inherited Rules (summary — full text in `../Agents.md`)

1. **No magic numbers/strings** — use named constants in `constants.ts`
2. **JSDoc on every module and export** — `@module` docblock + `/** */` on each export
3. **Single responsibility per file** — ~150 line target; extract when growing
4. **Extension without modification** — follow the registry/loader patterns above
5. **No circular imports** — data flows `index → tools → schemas/data`
6. **No blind casts** — type guards or Zod before any `as SomeType`
7. **No silent failures** — MCP tools catch and return `isError`; always `console.warn` non-fatal
8. **Barrel exports** — `index.ts` in directories with 3+ modules
9. **Naming conventions** — `kebab-case` files, `PascalCase` classes, `UPPER_SNAKE_CASE` constants
10. **No speculative abstractions** — abstract at the third instance, not before
