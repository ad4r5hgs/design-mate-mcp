/**
 * batch_get Tool — Read shapes from the canvas with optional filtering.
 *
 * Agents use this to inspect canvas state: IDs, positions, properties.
 * Supports filtering by shape ID, type, or section name.
 *
 * @module tools/batch-get
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CanvasBridge } from "../bridge.js";
import { BatchGetInput } from "../schemas/tool-schemas.js";
import {
  SECTION_MARKER_FONT_SIZE,
  SECTION_MARKER_COLOR,
  SECTION_BOUNDARY_GAP,
  SECTION_Y_TOLERANCE,
} from "../constants.js";

/** Register the batch_get tool on the MCP server. */
export function registerBatchGet(server: McpServer, bridge: CanvasBridge): void {
  server.registerTool(
    "batch_get",
    {
      description: `Read shapes from the canvas with optional filtering.

Use this to:
- Inspect what's on the canvas (IDs, positions, properties)
- Get shape IDs for update/delete operations
- Find shapes by name to get their bounding box for y-anchoring

Each shape includes: id, type, x, y, w, h, and all props.`,
      inputSchema: BatchGetInput,
    },
    async (args) => {
      try {
        const state = await bridge.getSnapshot();
        let shapes = state.shapes;
        if (args.ids?.length) { const s = new Set(args.ids); shapes = shapes.filter((x: any) => s.has(x.id)); }
        if (args.types?.length) { const s = new Set(args.types); shapes = shapes.filter((x: any) => s.has(x.type)); }
        if (args.name) {
          const nameShape = shapes.find((s: any) => s.type === "pen-text" && s.props?.content === args.name && s.props?.fontSize === SECTION_MARKER_FONT_SIZE);
          if (nameShape) {
            const nameY = nameShape.y;
            const allNameShapes = shapes
              .filter((s: any) => s.type === "pen-text" && s.props?.fontSize === SECTION_MARKER_FONT_SIZE && s.props?.fill === SECTION_MARKER_COLOR)
              .sort((a: any, b: any) => a.y - b.y);
            const idx = allNameShapes.findIndex((s: any) => s.id === nameShape.id);
            const nextName = allNameShapes[idx + 1];
            const sectionEnd = nextName ? nextName.y - SECTION_BOUNDARY_GAP : Infinity;
            shapes = shapes.filter((s: any) => s.y >= nameY - SECTION_Y_TOLERANCE && s.y < sectionEnd);
          }
        }
        return { content: [{ type: "text" as const, text: JSON.stringify({ count: shapes.length, shapes }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${err}` }], isError: true };
      }
    }
  );
}
