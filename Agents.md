# Agents.md — Repository Index

You are an AI agent working on **designmate** — an MCP server that lets AI agents drive a tldraw
canvas with a CSS flexbox layout engine. AI describes UI trees in JSON; the engine computes
pixel-perfect layouts and renders them as interactive shapes.

---

## Repository Structure

| Directory | What it is | Full instructions |
|-----------|-----------|-------------------|
| `mcp/` | MCP server — receives AI tool calls, validates them, and bridges to the canvas over WebSocket | [`mcp/Agents.md`](mcp/Agents.md) |
| `canvas/` | Vite + React app — tldraw canvas, layout engine, WebSocket relay server | [`canvas/Agents.md`](canvas/Agents.md) |

**Before working in any package, read its instruction file first.**
It defines the module structure, extension patterns, and conventions you must follow.
Do not make assumptions about a package you have not read the instructions for.

---

## Architecture

```
AI Client (Claude/Cursor) ↔ stdio ↔ MCP Server (mcp/)
                                          ↕ WebSocket :4000
                                  Canvas (canvas/) — Vite :3000 + ws-server.ts :4000
                                          ↕
                                  tldraw canvas (App.tsx)
```

### Request Flow

1. AI sends tool call → MCP `batch-design.ts` validates input with Zod schemas
2. `bridge.ts` assigns a `requestId` and sends command over WebSocket
3. `ws-server.ts` validates the message at the perimeter, then relays to canvas clients
4. `App.tsx` → `batch-processor.ts` → `resolveRefs()` → `layoutTree()` (2-pass flexbox)
5. `FlatShape[]` → `shape-factory.ts` → tldraw shapes rendered on canvas
6. Response flows back via WebSocket, resolved in `bridge.ts` by `requestId`

---

## Quick Start

```bash
# Terminal 1 — canvas must start first
cd canvas && bun run dev      # Vite :3000 + WS relay :4000

# Terminal 2 — MCP server (stdio transport)
cd mcp && bun run dev         # run via tsx
cd mcp && bun run build       # build to dist/ via tsup
cd mcp && bun run check       # TypeScript check (no emit)
```

## Configuration

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

`TLDRAW_WS_URL` env var overrides the WebSocket URL (default: `ws://localhost:4000`).

---

## Non-Negotiable Coding Rules

You must follow these rules on every file you create or modify in this repository.
They are inherited by all sub-directory instruction files and are not open to interpretation.
If a task seems to require violating a rule, ask for clarification before proceeding.

### 1. No Magic Numbers or Strings

All numeric and string literals with semantic meaning must be named constants in `constants.ts`,
grouped by concern with section comments. No inline hardcoded values in logic, timeouts, sizes,
colors, font sizes, port numbers, or marker comparisons — ever.

```ts
// ✗ Wrong
setTimeout(() => reconnect(), 2000);
if (shape.props.fontSize === 11) { ... }

// ✓ Correct
setTimeout(() => reconnect(), WS_RECONNECT_DELAY_MS);
if (shape.props.fontSize === SECTION_MARKER_FONT_SIZE) { ... }
```

### 2. Documentation Standards

- Every module file must have a top-level `/** @module <name> */` docblock stating its **single responsibility**
- Every exported function, class, and constant must have a `/** single-line description */` comment
- Inline comments are only for non-obvious **why** — never for what the code does
- No commented-out dead code — delete it, do not comment it out

```ts
// ✗ Wrong — describes what, not why
// loop through all shapes and check their type
for (const s of shapes) { ... }

// ✓ Correct — explains a non-obvious constraint
// Skip shapes the layout engine doesn't own — tldraw built-ins must not be resized
for (const s of shapes) { ... }
```

### 3. Single Responsibility & File Size

- Each file owns exactly one concern; name it after that concern
- If you need "and" to describe a function, split it into two
- Target ~150 lines per file; when a file grows beyond that, extract a new module
- No god files that accumulate unrelated logic over time

### 4. Extension Without Modification

Follow the established patterns — they are designed for zero-edit extension:

| To add... | Do this | Edit existing code? |
|-----------|---------|---------------------|
| New design guide | Drop a `.md` in `mcp/data/guides/` | No |
| New MCP tool | Create `mcp/tools/my-tool.ts` + one `register` line in `index.ts` | One line only |
| New shape type | Create `canvas/src/shapes/PenXxxUtil.tsx` + export from barrel | Barrel only |
| New reusable component | Call `register()` in `components.ts` | No |
| New engine module | Create `canvas/src/engine/my-module.ts` + export from barrel | Barrel only |

Do **not** invent new abstractions speculatively. Abstract only when the **third concrete instance**
of the same pattern exists. Two similar things are a coincidence; three are a pattern.

### 5. No Circular Imports

Data flows strictly downward:
- MCP: `index → tools → schemas/data`
- Canvas: `App → engine → shapes/lib`

Shared types belong in a dedicated `types.ts`. Never import from a sibling that imports back.
Verify with `bun run check` — TypeScript will catch circular dependencies.

### 6. Type Safety — No Blind Casts

- No `as SomeType` without a preceding type guard or Zod parse
- Trust boundaries (WebSocket, JSON parse, external API responses) must use type predicates or Zod
- Prefer `unknown` over `any`; if `any` is genuinely unavoidable, add `// eslint-disable-next-line`
  with a one-line reason on the same line

```ts
// ✗ Wrong
const msg = JSON.parse(raw) as BatchCommand;

// ✓ Correct
const parsed = tryParseJSON(raw);
if (!isValidBatchCommand(parsed)) return;
// parsed is now BatchCommand — narrowed by type guard
```

### 7. Error Handling — No Silent Failures

- **MCP tools**: catch at tool level, return `{ isError: true, content: [{ type: "text", text }] }`
  — never let an error propagate to the MCP transport
- **Canvas WebSocket handlers**: per-operation catch, push `{ op, error: String(err) }` to results
  array — never crash the entire batch handler
- **Non-fatal paths** (localStorage, optional features): catch silently but always `console.warn`
- Never swallow an error without at minimum a `console.warn` — invisible failures cause untraceable bugs

### 8. Barrel Exports

Any directory with 3 or more modules must have an `index.ts` that only re-exports — no logic.
External consumers import from the barrel, not individual files. This makes internal refactoring
safe without changing import sites.

### 9. Naming Conventions

| Scope | Convention | Example |
|-------|-----------|---------|
| Files | `kebab-case.ts` | `batch-processor.ts`, `message-validator.ts` |
| Classes / React components | `PascalCase` | `CanvasBridge`, `PenFrameUtil` |
| Functions / variables | `camelCase` | `createFlatShape`, `handleBatch` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_WS_URL`, `WS_RECONNECT_DELAY_MS` |
| Types / Interfaces | `PascalCase` | `FlatShape`, `ValidCommand`, `CanvasStore` |
| Boolean variables | `is*` / `has*` / `can*` prefix | `isValidCommand`, `hasSelection` |

### 10. No Speculative Abstractions

Only abstract what currently exists three or more times in the codebase. No:
- Feature flags for hypothetical future modes
- Backwards-compatibility shims for removed code
- `_unused` variable renames
- Helper utilities for one-time operations
- Extra configurability not required by the current task

The right amount of complexity is the **minimum needed for the current task**.
