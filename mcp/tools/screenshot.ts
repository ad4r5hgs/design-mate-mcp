/**
 * get_screenshot Tool — Capture PNG screenshots of the canvas.
 *
 * Two modes:
 * - Section: Scoped to a named section with 125% context padding
 * - Full: Entire canvas capture for final verification
 *
 * @module tools/screenshot
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CanvasBridge } from "../bridge.js";
import { ScreenshotInput } from "../schemas/tool-schemas.js";

/** Register the get_screenshot tool on the MCP server. */
export function registerScreenshot(server: McpServer, bridge: CanvasBridge): void {
  server.registerTool(
    "get_screenshot",
    {
      description: `Capture a PNG screenshot in one of two modes:

## Mode 1: Section Screenshot (RECOMMENDED after each batch_design)
Pass a \`sectionName\` to capture that section PLUS ~25% surrounding context.
The screenshot includes neighboring sections so you can detect:
- **Overlapping elements** between sections
- **Padding/margin issues** — too much or too little space between sections
- **Alignment problems** — content that doesn't align across sections
- **Text overflow** — text escaping its container bounds

## Mode 2: Full Canvas Screenshot
Pass \`mode: "full"\` or no arguments to capture the entire design.
Use this after completing ALL sections to verify overall composition.

## IMPORTANT: Visual Inspection Checklist
After receiving the screenshot, CAREFULLY check for:
1. **Overlapping shapes** — elements from one section bleeding into another
2. **Text overflow** — text extending beyond its container
3. **Inconsistent spacing** — uneven gaps between sections or elements
4. **Alignment issues** — content not horizontally centered or misaligned
5. **Missing padding** — content touching container edges without breathing room
6. **Broken layout** — elements stacked when they should be side-by-side, or vice versa

NOTE: Section screenshots include ~25% extra context around the section bounds. This is intentional — it lets you see how the section relates to its neighbors.

If you see ANY visual issues, fix them with batch_design BEFORE proceeding to the next section.`,
      inputSchema: ScreenshotInput,
    },
    async (args) => {
      try {
        if (args.mode === "section" && !args.sectionName) {
          return {
            content: [{ type: "text" as const, text: 'Error: mode "section" requires sectionName to be provided. Pass sectionName or omit mode.' }],
            isError: true,
          };
        }

        const opts: Record<string, unknown> = {};
        if (args.sectionName) opts.sectionName = args.sectionName;
        if (args.shapeIds?.length) opts.shapeIds = args.shapeIds;
        if (args.mode) opts.mode = args.mode;

        const result = await bridge.getScreenshot(opts as any);

        const base64Data = result.image.replace(/^data:image\/png;base64,/, "");
        const screenshotMode = (result as any).mode || (args.sectionName ? "section" : "full");

        let inspectionNote = "";
        if (screenshotMode === "section") {
          inspectionNote = `\n\nThis is a SECTION screenshot of "${args.sectionName || 'selected shapes'}" with ~25% surrounding context included.\nCarefully inspect for: overlapping elements, text overflow, inconsistent spacing, alignment issues, and missing padding.\nIf you see ANY visual problems, fix them with batch_design before proceeding.`;
        } else {
          inspectionNote = `\n\nThis is a FULL CANVAS screenshot.\nReview the overall composition: section spacing, visual hierarchy, alignment consistency, and any overlapping elements.`;
        }

        return {
          content: [
            { type: "image" as const, data: base64Data, mimeType: "image/png" as const },
            { type: "text" as const, text: `Screenshot captured (${result.width}×${result.height}px).${inspectionNote}` },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isConnectionError = /connect|timeout|ECONNREFUSED|socket|WebSocket/i.test(message);
        const suffix = isConnectionError ? "\n\nMake sure the canvas is running (cd canvas && bun run dev)." : "";
        return { content: [{ type: "text" as const, text: `Screenshot error: ${message}${suffix}` }], isError: true };
      }
    }
  );
}
