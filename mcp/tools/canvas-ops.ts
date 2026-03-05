/**
 * Canvas Operation Tools — clear_canvas and zoom_to_fit.
 *
 * Simple utility tools for canvas state management.
 *
 * @module tools/canvas-ops
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CanvasBridge } from "../bridge.js";
import { ClearCanvasInput, ZoomToFitInput } from "../schemas/tool-schemas.js";

/** Register the clear_canvas and zoom_to_fit tools on the MCP server. */
export function registerCanvasOps(server: McpServer, bridge: CanvasBridge): void {
  server.registerTool(
    "clear_canvas",
    {
      description: "Remove all shapes from the canvas. Use before starting a completely new design.",
      inputSchema: ClearCanvasInput,
    },
    async () => {
      try {
        await bridge.clear();
        return { content: [{ type: "text" as const, text: "Canvas cleared — ready for new design." }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${err}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "zoom_to_fit",
    {
      description: "Zoom the canvas viewport to fit all shapes. [build:20260301-3]",
      inputSchema: ZoomToFitInput,
    },
    async () => {
      try {
        await bridge.zoomToFit();
        return { content: [{ type: "text" as const, text: "Zoomed to fit all shapes." }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${err}` }], isError: true };
      }
    }
  );
}
