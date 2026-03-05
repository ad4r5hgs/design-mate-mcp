/**
 * Catalog Tools — list_components, list_icons, and get_design_guide.
 *
 * Read-only tools that return reference data for agents. These don't
 * interact with the canvas; they serve the embedded design knowledge base.
 *
 * @module tools/catalog
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DESIGN_GUIDES } from "../data/design-guides-loader.js";
import { COMPONENT_CATALOG } from "../data/component-catalog.js";
import { ICON_CATALOG } from "../data/icon-catalog.js";
import {
  DesignGuideInput,
  ListComponentsInput,
  ListIconsInput,
  GUIDE_TOPIC_LIST,
} from "../schemas/tool-schemas.js";

/** Register the catalog tools (list_components, list_icons, get_design_guide) on the MCP server. */
export function registerCatalog(server: McpServer): void {

  // ── get_design_guide ────────────────────────────────────────────────────────

  server.registerTool(
    "get_design_guide",
    {
      description: `Get comprehensive design methodology and patterns for a specific type of design.

Call this for design guidance on a specific topic. The guide includes:
- Pre-design methodology and workflow
- Page structure and section ordering
- Visual guidelines (typography, color, effects)
- Layout patterns with ASCII diagrams
- Component patterns with code examples
- Spacing reference tables
- Anti-slop rules to avoid generic AI aesthetics

Available topics:
${GUIDE_TOPIC_LIST}`,
      inputSchema: DesignGuideInput,
    },
    async (args) => {
      const guide = DESIGN_GUIDES[args.topic];
      if (!guide) {
        return { content: [{ type: "text" as const, text: `Unknown topic: ${args.topic}. Available: ${Object.keys(DESIGN_GUIDES).join(", ")}` }], isError: true };
      }
      return { content: [{ type: "text" as const, text: guide }] };
    }
  );

  // ── list_components ─────────────────────────────────────────────────────────

  server.registerTool(
    "list_components",
    {
      description: `List all available reusable UI components.

Call this to see what components are available, then use them in batch_design with:
\`\`\`json
{ "type": "ref", "ref": "ComponentName", "overrides": { ... } }
\`\`\`

Components are pre-styled with shadows, borders, and correct spacing.`,
      inputSchema: ListComponentsInput,
    },
    async () => {
      const grouped: Record<string, typeof COMPONENT_CATALOG> = {};
      for (const c of COMPONENT_CATALOG) {
        if (!grouped[c.category]) grouped[c.category] = [];
        grouped[c.category].push(c);
      }

      let text = "# Available Components\n\n";
      for (const [category, components] of Object.entries(grouped)) {
        text += `## ${category}\n`;
        for (const c of components) {
          text += `- **${c.name}** — ${c.description}\n  Overrides: ${c.overrides}\n`;
        }
        text += "\n";
      }

      text += `## Usage Example\n\`\`\`json
{
  "children": [
    { "type": "ref", "ref": "Button/Primary", "overrides": { "label": "Get Started" } },
    { "type": "ref", "ref": "Input", "overrides": { "label": "Email", "placeholder": "you@example.com" }, "width": "fill" },
    { "type": "ref", "ref": "Badge", "overrides": { "text": "New", "variant": "success" } }
  ]
}
\`\`\`\n`;

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ── list_icons ──────────────────────────────────────────────────────────────

  server.registerTool(
    "list_icons",
    {
      description: `List all available Lucide SVG icons, grouped by category.

Use icons inside batch_design children arrays:
\`\`\`json
{ "type": "icon", "iconName": "search", "width": 20, "iconColor": "#6b7280" }
\`\`\`

Icons render as crisp SVG at any size. Default: 24×24, stroke-width: 2.`,
      inputSchema: ListIconsInput,
    },
    async () => {
      let text = "# Available Icons (Lucide)\n\n";
      let total = 0;
      for (const [category, icons] of Object.entries(ICON_CATALOG)) {
        text += `## ${category}\n`;
        text += icons.join(", ") + "\n\n";
        total += icons.length;
      }
      text += `**Total: ${total} icons**\n\n`;
      text += `## Usage\n\`\`\`json\n`;
      text += `{ "type": "icon", "iconName": "search", "width": 20, "iconColor": "#6b7280" }\n`;
      text += `{ "type": "icon", "iconName": "arrow-right", "width": 16, "iconColor": "#ffffff" }\n`;
      text += `{ "type": "icon", "iconName": "star", "width": 24, "iconColor": "#f59e0b" }\n`;
      text += `\`\`\`\n`;
      return { content: [{ type: "text" as const, text }] };
    }
  );
}
