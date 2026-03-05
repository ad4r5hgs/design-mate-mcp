/**
 * batch_design Tool — Create, update, and delete shapes on the canvas.
 *
 * This is the primary tool agents use to build UI. It accepts an array of
 * operations (create/update/delete) and sends them to the canvas as a single
 * WebSocket batch, returning shape IDs, bounding boxes, and overflow warnings.
 *
 * @module tools/batch-design
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CanvasBridge } from "../bridge.js";
import { BatchDesignInput } from "../schemas/tool-schemas.js";

const TOOL_DESCRIPTION = `Design UI components on a canvas using a CSS-flexbox-like component tree.

MANDATORY WORKFLOW — YOU MUST FOLLOW THESE STEPS:
1. Call get_design_guide FIRST with the relevant topic to get design methodology
2. Build ONE section at a time (e.g., Navbar, then Hero, then Features)
3. AFTER EVERY batch_design call, you MUST call get_screenshot to verify the result
4. Carefully inspect the screenshot for overlapping, text overflow, spacing, and alignment issues
5. Fix ALL visual issues before proceeding to the next section
6. After all sections are complete, call get_screenshot with mode: "full" for final verification

DO NOT proceed to the next section without first verifying the current section via screenshot.
DO NOT skip screenshot verification — visual bugs compound and are harder to fix later.

## How It Works
Create a "pen-frame" shape with a \`children\` array. The layout engine computes all positions automatically. Every child becomes a separate, selectable, editable shape.

## Node Types
- \`{ type: "frame", ... }\` → Container (div). Has layout, padding, gap, fill, border, boxShadow, children.
- \`{ type: "text", ... }\` → Text. Has content, fontSize, fontWeight, color.
- \`{ type: "icon", iconName: "...", ... }\` → Lucide SVG icon. Has iconName, iconColor, width (size).
- \`{ type: "ref", ref: "...", overrides: {...} }\` → Component instance (from list_components).

## Layout (CSS Flexbox)
- \`layout: "vertical"\` = column, \`layout: "horizontal"\` = row
- \`width: "fill"\` = flex:1, \`width: "auto"\` = shrink-wrap
- \`justifyContent\`, \`alignItems\`, \`gap\`, \`padding\` work like CSS

## Text Auto-Wrapping
- In **vertical** layouts, bare text nodes automatically wrap to parent width.
- In **horizontal** layouts, wrap long text in \`{ type: "frame", width: "fill" }\`.
- Overflow warnings are emitted if text still exceeds its container.

## Visual Effects
- \`boxShadow\`: CSS box-shadow string. Makes cards and surfaces look elevated and real.
- \`fill\`: Supports gradients like \`"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"\`
- \`backgroundImage\`: URL for cover-mode background images

## Y-Positioning (Named Anchors)
Use \`"y": "after:Navbar"\` to position below a named section — no manual offset math.

## Multiple Frames / Screens
The canvas supports multiple independent frames coexisting at once. Each batch_design call ADDS shapes without clearing existing ones (unless clearFirst: true). Use this to build multi-screen designs:
- Stack vertically: use \`y: "after:SectionName"\` on the next frame
- Place side-by-side: use an explicit \`x\` offset (e.g. \`x: 1560\`) on the second frame
- Never set clearFirst: true when you want to keep existing frames

## Reusable Components
Use \`{ type: "ref", ref: "ComponentName", overrides: {...} }\` to insert pre-built components.
Call \`list_components\` first to see all available components and their override options.

### Component Examples
\`\`\`json
{ "type": "ref", "ref": "Button/Primary", "overrides": { "label": "Sign Up" } }
{ "type": "ref", "ref": "Input", "overrides": { "label": "Email", "placeholder": "you@example.com" } }
{ "type": "ref", "ref": "Card", "overrides": { "title": "Pricing", "description": "Choose your plan" } }
{ "type": "ref", "ref": "Badge", "overrides": { "text": "Pro", "variant": "success" } }
{ "type": "ref", "ref": "Avatar", "overrides": { "initials": "JD", "size": 48 } }
\`\`\`

## Defaults & Auto-sizing
- **Width**: defaults to 400px if omitted
- **Height**: auto-sizes to content when omitted (recommended for navbars, cards, sections). Set explicitly only for fixed-height containers.
- **Font size**: 16px if omitted
- **Font family**: Inter, sans-serif

## Response
Returns created shape IDs, computed bounding boxes, and text overflow warnings.`;

/** Format batch results into a human-readable summary string. */
function formatBatchSummary(result: any): string {
  const summary = result.results.map((r: any) => {
    if (r.error) return `[FAIL] ${r.op}: ${r.error}`;
    if (r.op === "create") {
      let line = `[OK] create${r.ref ? ` [${r.ref}]` : ""}: ${r.id} (${r.shapeCount || r.ids?.length || 1} shapes)`;
      if (r.computedBounds?.length) {
        line += `\n   Top-level bounds: ${JSON.stringify(r.computedBounds.slice(0, 3))}`;
      }
      return line;
    }
    if (r.op === "update") return `[OK] update: ${r.id}`;
    if (r.op === "delete") return `[OK] deleted ${r.deleted} shape(s)`;
    return `[OK] ${r.op}`;
  }).join("\n");

  let warningText = "";
  if (result.warnings?.length) {
    warningText = "\n\nWARNINGS:\n" + result.warnings.map((w: any) =>
      `  • [${w.section || "?"}] ${w.message}`
    ).join("\n");
    warningText += "\n\nFix these issues before proceeding to the next section.";
  }

  let boundsText = "";
  if (result.computedBounds?.length) {
    const bounds = result.computedBounds as any[];
    const sections = [...new Set(bounds.map((b: any) => b.sectionName).filter(Boolean))];
    if (sections.length > 0) {
      boundsText = "\n\nComputed sections: " + sections.join(", ");
    }
  }

  const firstRef = result.results[0]?.ref || "section_name";
  return `Batch complete (${result.results.length} ops):\n${summary}\n\nRefs: ${JSON.stringify(result.refMap)}${warningText}${boundsText}\n\nMANDATORY: You MUST now call get_screenshot("${firstRef}") to verify this section. DO NOT proceed to the next section until you have visually confirmed this one looks correct. Check for overlapping elements, text overflow, spacing issues, and alignment problems.`;
}

/** Register the batch_design tool on the MCP server. */
export function registerBatchDesign(server: McpServer, bridge: CanvasBridge): void {
  server.registerTool(
    "batch_design",
    {
      description: TOOL_DESCRIPTION,
      inputSchema: BatchDesignInput,
    },
    async (args) => {
      try {
        const result = await bridge.sendBatch(args.operations as any, args.clearFirst);
        return { content: [{ type: "text" as const, text: formatBatchSummary(result) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${err}` }], isError: true };
      }
    }
  );
}
