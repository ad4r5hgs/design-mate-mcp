#!/usr/bin/env node
/**
 * designmate-mcp — MCP Server Entry Point
 *
 * Thin orchestrator that wires together the WebSocket bridge and tool modules.
 * Each tool is a self-contained "lego block" registered via its own module.
 *
 * Architecture:
 *   AI Client ↔ stdio ↔ this server ↔ WebSocket ↔ Canvas (tldraw)
 *
 * @module index
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CanvasBridge } from "./bridge.js";

// Tool registrations — each file is a self-contained module
import { registerBatchDesign } from "./tools/batch-design.js";
import { registerBatchGet } from "./tools/batch-get.js";
import { registerScreenshot } from "./tools/screenshot.js";
import { registerCanvasOps } from "./tools/canvas-ops.js";
import { registerCatalog } from "./tools/catalog.js";

// ─────────────────────────────────────────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_WS_URL } from "./constants.js";

const bridge = new CanvasBridge(process.env.TLDRAW_WS_URL || DEFAULT_WS_URL);

const server = new McpServer({
  name: "designmate-mcp",
  version: "1.0.0",
});

// ─────────────────────────────────────────────────────────────────────────────
// Register tools — plug in each module like a lego block
// ─────────────────────────────────────────────────────────────────────────────

registerBatchDesign(server, bridge);   // create/update/delete shapes
registerBatchGet(server, bridge);      // read canvas state
registerScreenshot(server, bridge);    // capture PNG screenshots
registerCanvasOps(server, bridge);     // clear_canvas + zoom_to_fit
registerCatalog(server);               // list_components + list_icons + get_design_guide

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("designmate-mcp v1.0.0 — ready");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
