#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CanvasBridge } from "./bridge.js";

const bridge = new CanvasBridge(process.env.TLDRAW_WS_URL || "ws://localhost:4000");

const server = new McpServer({
  name: "tldraw-mcp",
  version: "0.9.0",
});

// ─────────────────────────────────────────────────────────────────────────────
// PenNode schema (recursive tree)
// ─────────────────────────────────────────────────────────────────────────────

const PenNode: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum(["frame", "text", "ref", "icon"]).describe(
      "'frame' = div-like container, 'text' = text content, 'ref' = component instance, 'icon' = Lucide SVG icon"
    ),
    ref: z.string().optional().describe(
      "Component name for type='ref'. Call list_components to see available components. Example: 'Button/Primary', 'Card', 'Input'"
    ),
    overrides: z.record(z.any()).optional().describe(
      "Override component props. Example: { label: 'Submit', fill: '#6366f1', variant: 'success' }"
    ),
    width: z.union([z.number(), z.string()]).optional().describe(
      "Width in pixels (number), 'fill' (stretch to fill parent like flex:1), or 'auto' (shrink to content). Default: 'auto'"
    ),
    height: z.union([z.number(), z.string()]).optional().describe(
      "Height in pixels (number), 'fill' (stretch), or 'auto'. Default: 'auto'"
    ),
    fill: z.string().optional().describe(
      "CSS color or gradient. Examples: '#ffffff', '#4f46e5', 'transparent', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'"
    ),
    opacity: z.number().optional(),
    layout: z.enum(["none", "vertical", "horizontal"]).optional().describe(
      "'vertical' = stack top-to-bottom (most common), 'horizontal' = side-by-side"
    ),
    justifyContent: z.enum(["start", "center", "end", "space_between", "space_around"]).optional().describe(
      "Main axis alignment. 'space_between' = spread items with space between. 'center' = center on main axis."
    ),
    alignItems: z.enum(["start", "center", "end", "stretch"]).optional().describe(
      "Cross axis alignment. 'center' = vertically center in horizontal layout."
    ),
    gap: z.number().optional().describe(
      "Space between children (px). Common: 4 (tight), 8 (compact), 16 (comfortable), 24 (spacious), 48 (sections)"
    ),
    padding: z.union([z.number(), z.array(z.number())]).optional().describe(
      "Inner padding. Number=all sides. [v,h]=top+bottom,left+right. [t,r,b,l]=each. Common: [16,20] cards, [12,14] inputs, [48,80] sections."
    ),
    cornerRadius: z.number().optional().describe(
      "Border radius (px). Common: 4 (subtle), 8-10 (buttons/cards), 16-20 (large cards), 999 (pill/circle)"
    ),
    borderColor: z.string().optional(),
    borderWidth: z.number().optional().describe("0 = no border. Default: 0"),
    boxShadow: z.string().optional().describe(
      `CSS box-shadow. Makes cards look elevated and real. Presets:
- Subtle: "0 1px 3px rgba(0,0,0,0.08)"
- Card: "0 4px 12px rgba(0,0,0,0.1)"
- Elevated: "0 8px 24px rgba(0,0,0,0.12)"
- Float: "0 12px 40px rgba(0,0,0,0.15)"
- Glow: "0 0 20px rgba(99,102,241,0.3)" (colored glow)`
    ),
    backgroundImage: z.string().optional().describe(
      "URL for background image. Renders with cover + center. Use for hero images, card backgrounds."
    ),
    overflow: z.enum(["hidden", "visible"]).optional(),
    name: z.string().optional().describe("Section label shown above frame (e.g. 'Hero Section', 'Navbar'). Only set on top-level sections."),
    children: z.array(PenNode).optional().describe("Nested child nodes. Layout engine handles all positioning automatically."),
    content: z.string().optional().describe("Text content. Supports newlines with \\n."),
    fontSize: z.number().optional().describe(
      "Font size (px). Common: 11-12 (caption), 14 (body), 18 (subhead), 28-34 (heading), 48-56 (hero)"
    ),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional().describe("'normal', '500', '600', 'bold'"),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    lineHeight: z.number().optional().describe("Line height multiplier. Default: 1.5"),
    color: z.string().optional().describe("Text color (alias for fill on text)"),
    letterSpacing: z.number().optional(),
    // Icon fields (type: "icon" only)
    iconName: z.string().optional().describe(
      "Lucide icon name (type='icon' only). Call list_icons to see all available icons. Examples: 'search', 'user', 'settings', 'heart', 'star', 'zap', 'arrow-right'"
    ),
    iconColor: z.string().optional().describe("Icon stroke color (default: '#000000')"),
    iconStrokeWidth: z.number().optional().describe("Icon stroke width (default: 2)"),
  }).passthrough()
);

// ─────────────────────────────────────────────────────────────────────────────
// Batch operation schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateOp = z.object({
  op: z.literal("create"),
  type: z.enum(["pen-frame", "pen-text", "geo", "frame"]).describe(
    "Use 'pen-frame' for containers with children. Use 'pen-text' for standalone text."
  ),
  x: z.number().describe("X position on canvas (pixels from left)"),
  y: z.union([z.number(), z.string()]).describe(
    `Y position on canvas. Use a number for absolute pixels, or a string like "after:Navbar" to position directly below a named section. Examples:
- y: 0 → top of canvas
- y: 72 → 72px from top
- y: "after:Navbar" → placed at bottom edge of the "Navbar" section
- y: "after:Hero Section" → placed at bottom edge of the "Hero Section"`
  ),
  width: z.number().optional().describe("Container width (px). Common: 400 (card), 800 (content), 1200 (full-width)"),
  height: z.number().optional().describe("Container height (px). Estimate generously — extra space > overflow."),
  ref: z.string().optional().describe("Reference name for later update/delete operations"),
  props: z.record(z.any()).optional().describe("Shape properties. For pen-frame: include 'children' array with the component tree."),
});

const UpdateOp = z.object({
  op: z.literal("update"),
  id: z.string().describe("Shape ID (from create result) or ref name"),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  props: z.record(z.any()).optional(),
});

const DeleteOp = z.object({
  op: z.literal("delete"),
  ids: z.array(z.string()),
});

const BatchOperation = z.discriminatedUnion("op", [CreateOp, UpdateOp, DeleteOp]);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: batch_design
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  "batch_design",
  `Design UI components on a canvas using a CSS-flexbox-like component tree.

⚠️ MANDATORY WORKFLOW — YOU MUST FOLLOW THESE STEPS:
1. Call get_design_guide FIRST with the relevant topic to get design methodology
2. Build ONE section at a time (e.g., Navbar, then Hero, then Features)
3. ⚠️ AFTER EVERY batch_design call, you MUST call get_screenshot to verify the result
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

## Response
Returns created shape IDs, computed bounding boxes, and text overflow warnings.`,
  {
    operations: z.array(BatchOperation).describe("Array of create/update/delete operations."),
    clearFirst: z.boolean().optional().default(false).describe("Clear canvas before executing. Use when starting fresh."),
  },
  async (args) => {
    try {
      const result = await bridge.sendBatch(args.operations as any, args.clearFirst);

      const summary = result.results.map((r: any) => {
        if (r.error) return `❌ ${r.op}: ${r.error}`;
        if (r.op === "create") {
          let line = `✅ create${r.ref ? ` [${r.ref}]` : ""}: ${r.id} (${r.shapeCount || r.ids?.length || 1} shapes)`;
          if (r.computedBounds?.length) {
            line += `\n   Top-level bounds: ${JSON.stringify(r.computedBounds.slice(0, 3))}`;
          }
          return line;
        }
        if (r.op === "update") return `✅ update: ${r.id}`;
        if (r.op === "delete") return `✅ deleted ${r.deleted} shape(s)`;
        return `✅ ${r.op}`;
      }).join("\n");

      let warningText = "";
      if ((result as any).warnings?.length) {
        warningText = "\n\n⚠️ WARNINGS:\n" + (result as any).warnings.map((w: any) =>
          `  • [${w.section || "?"}] ${w.message}`
        ).join("\n");
        warningText += "\n\nFix these issues before proceeding to the next section.";
      }

      let boundsText = "";
      if ((result as any).computedBounds?.length) {
        const bounds = (result as any).computedBounds as any[];
        const sections = [...new Set(bounds.map((b: any) => b.sectionName).filter(Boolean))];
        if (sections.length > 0) {
          boundsText = "\n\nComputed sections: " + sections.join(", ");
        }
      }

      return {
        content: [{
          type: "text",
          text: `Batch complete (${result.results.length} ops):\n${summary}\n\nRefs: ${JSON.stringify(result.refMap)}${warningText}${boundsText}\n\n⚠️ MANDATORY: You MUST now call get_screenshot("${(result.results[0] as any)?.ref || "section_name"}") to verify this section. DO NOT proceed to the next section until you have visually confirmed this one looks correct. Check for overlapping elements, text overflow, spacing issues, and alignment problems.`,
        }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err}` }], isError: true };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: batch_get
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  "batch_get",
  `Read shapes from the canvas with optional filtering.

Use this to:
- Inspect what's on the canvas (IDs, positions, properties)
- Get shape IDs for update/delete operations
- Find shapes by name to get their bounding box for y-anchoring

Each shape includes: id, type, x, y, w, h, and all props.`,
  {
    ids: z.array(z.string()).optional().describe("Filter by specific shape IDs"),
    types: z.array(z.string()).optional().describe("Filter by type: 'pen-frame', 'pen-text'"),
    name: z.string().optional().describe("Filter by section name"),
  },
  async (args) => {
    try {
      const state = await bridge.getSnapshot();
      let shapes = state.shapes;
      if (args.ids?.length) { const s = new Set(args.ids); shapes = shapes.filter((x: any) => s.has(x.id)); }
      if (args.types?.length) { const s = new Set(args.types); shapes = shapes.filter((x: any) => s.has(x.type)); }
      if (args.name) {
        const nameShape = shapes.find((s: any) => s.type === "pen-text" && s.props?.content === args.name && s.props?.fontSize === 11);
        if (nameShape) {
          const nameY = nameShape.y;
          const allNameShapes = shapes
            .filter((s: any) => s.type === "pen-text" && s.props?.fontSize === 11 && s.props?.fill === "#888888")
            .sort((a: any, b: any) => a.y - b.y);
          const idx = allNameShapes.findIndex((s: any) => s.id === nameShape.id);
          const nextName = allNameShapes[idx + 1];
          const sectionEnd = nextName ? nextName.y - 10 : Infinity;
          shapes = shapes.filter((s: any) => s.y >= nameY - 5 && s.y < sectionEnd);
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ count: shapes.length, shapes }, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err}` }], isError: true };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_screenshot
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  "get_screenshot",
  `Capture a PNG screenshot in one of two modes:

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
1. ⚠️ **Overlapping shapes** — elements from one section bleeding into another
2. ⚠️ **Text overflow** — text extending beyond its container
3. ⚠️ **Inconsistent spacing** — uneven gaps between sections or elements
4. ⚠️ **Alignment issues** — content not horizontally centered or misaligned
5. ⚠️ **Missing padding** — content touching container edges without breathing room
6. ⚠️ **Broken layout** — elements stacked when they should be side-by-side, or vice versa

NOTE: Section screenshots include ~25% extra context around the section bounds. This is intentional — it lets you see how the section relates to its neighbors.

If you see ANY visual issues, fix them with batch_design BEFORE proceeding to the next section.`,
  {
    sectionName: z.string().optional().describe("Name of a section to screenshot with 125% context (e.g., 'Navbar', 'Hero Section')"),
    shapeIds: z.array(z.string()).optional().describe("Specific shape IDs to capture with context"),
    mode: z.enum(["section", "full"]).optional().describe("'section' = scoped + 25% context (default when sectionName given), 'full' = entire canvas"),
  },
  async (args) => {
    try {
      if (args.mode === "section" && !args.sectionName) {
        return {
          content: [{ type: "text", text: 'Error: mode "section" requires sectionName to be provided. Pass sectionName or omit mode.' }],
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
        inspectionNote = `\n\n🔍 This is a SECTION screenshot of "${args.sectionName || 'selected shapes'}" with ~25% surrounding context included.\nCarefully inspect for: overlapping elements, text overflow, inconsistent spacing, alignment issues, and missing padding.\nIf you see ANY visual problems, fix them with batch_design before proceeding.`;
      } else {
        inspectionNote = `\n\n🔍 This is a FULL CANVAS screenshot.\nReview the overall composition: section spacing, visual hierarchy, alignment consistency, and any overlapping elements.`;
      }

      return {
        content: [
          { type: "image", data: base64Data, mimeType: "image/png" },
          {
            type: "text",
            text: `Screenshot captured (${result.width}×${result.height}px).${inspectionNote}`,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isConnectionError = /connect|timeout|ECONNREFUSED|socket|WebSocket/i.test(message);
      const suffix = isConnectionError ? "\n\nMake sure the canvas is running (cd canvas && bun run dev)." : "";
      return { content: [{ type: "text", text: `Screenshot error: ${message}${suffix}` }], isError: true };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_design_guide
// ─────────────────────────────────────────────────────────────────────────────

const DESIGN_GUIDES: Record<string, string> = {
  "landing-page": `# Landing Page Design Guide

You are a world-class marketing designer. Your purpose: sell the product through design.

## Pre-Design Workflow (Mandatory)

Before designing, ensure clarity on:
1. **Product**: What it is, what problem it solves
2. **Audience**: Who this is for
3. **Goal**: Primary conversion (sign up / demo / waitlist / purchase)
4. **Value prop**: What's different/better, top 3-5 benefits
5. **Brand & tone**: Personality, colors, constraints

If anything is unclear → ask. Do not guess.

---

## Page Structure

1. **Header** — Logo, nav links, primary CTA button
2. **Hero** — Badge/label, headline, subheadline, CTAs, product visual
3. **Social Proof** — Trust logos, stats row, testimonials
4. **How It Works** — 3 step cards with icons/numbers
5. **Features** — 3-4 features with headlines + descriptions
6. **Pricing** — Tier cards with feature lists and CTAs
7. **FAQ** — Q&A addressing objections
8. **Final CTA** — Headline, subheadline, CTA, trust reassurance
9. **Footer** — Logo, nav columns, copyright

---

## Hero Section Rules

The hero compresses the entire product into one screen. If the visitor only sees this, they understand what it is.

- **One idea only.** No feature lists, no competing messages.
- **Headline**: Main promise/outcome. Must make sense standalone.
- **Subheadline**: What the product actually does. Practical, concrete.
- **CTA**: One primary action. Optional secondary with lower commitment.
- **Viewport**: Key content within ~700px height (above fold).

### Headline Hierarchy (strongest → weakest)
1. Transformation: "Finally feel in control of your inbox"
2. Outcome: "Ship more content, grow your audience"
3. Benefit: "Write 10x faster"
4. Feature: "AI-powered writing assistant"

Lead with transformation or outcome.

---

## Visual Guidelines

### Aesthetic Direction
Choose a BOLD direction and commit:
- **Typography**: Distinctive display font + refined body font. Never defaults.
- **Color**: Dominant colors with sharp accents. Cohesive palette. No timid even-distribution.
- **Backgrounds**: Create atmosphere — gradient meshes, geometric patterns, layered transparencies. Never default to flat solids.

### Section Theming
- Dark sections → credibility, depth, sophistication
- Light sections → explanation, detail, openness
- Alternate intentionally between dark and light

### Section Rhythm
Alternate text-heavy and visual sections. Never stack multiple text-only sections.

---

## Visual Effects (use these!)

### Box Shadows — Make surfaces feel real
\`\`\`
Subtle:   "0 1px 3px rgba(0,0,0,0.08)"     → borders/dividers
Card:     "0 4px 12px rgba(0,0,0,0.1)"      → cards, containers
Elevated: "0 8px 24px rgba(0,0,0,0.12)"     → modals, dropdowns
Float:    "0 12px 40px rgba(0,0,0,0.15)"    → hero elements
Glow:     "0 0 20px rgba(99,102,241,0.3)"   → accent glow (use brand color)
\`\`\`

### Gradients — Add depth and energy
\`\`\`
Hero bg:  "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0a0a1a 100%)"
Button:   "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
Accent:   "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)"
Glass:    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)"
\`\`\`

---

## Common Patterns

### Button
\`\`\`json
{ "type": "frame", "layout": "horizontal", "padding": [12, 24], "cornerRadius": 8,
  "fill": "#6366f1", "alignItems": "center", "justifyContent": "center", "gap": 8,
  "boxShadow": "0 4px 12px rgba(99,102,241,0.3)",
  "children": [{ "type": "text", "content": "Get Started", "fontSize": 15, "fontWeight": "600", "color": "#ffffff" }] }
\`\`\`

### Card with Shadow
\`\`\`json
{ "type": "frame", "layout": "vertical", "padding": 24, "cornerRadius": 16,
  "fill": "#ffffff", "borderWidth": 1, "borderColor": "#e2e8f0", "gap": 12,
  "boxShadow": "0 4px 12px rgba(0,0,0,0.08)",
  "children": [
    { "type": "text", "content": "Card Title", "fontSize": 20, "fontWeight": "600", "color": "#0f172a" },
    { "type": "text", "content": "Description text here", "fontSize": 14, "color": "#64748b" }
  ] }
\`\`\`

### Dark Hero Background
\`\`\`json
{ "type": "frame", "layout": "vertical", "width": 1200, "height": 600,
  "fill": "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0a0a1a 100%)",
  "padding": [80, 120], "alignItems": "center", "gap": 24, "borderWidth": 0,
  "children": [ ... ] }
\`\`\`

---

## Anti-Slop Rules (Mandatory)

Never converge toward generic AI aesthetics:
- No flat solid backgrounds — create atmosphere with gradients
- No predictable layouts or boilerplate card patterns
- Use boxShadow to add depth to every card and elevated element
- Commit to a cohesive theme — don't mix styles randomly
- Short confident sentences. No fluff. No jargon.

---

## Spacing Reference

| Context | Gap | Padding |
|---------|-----|---------|
| Screen sections | 0 (use y-anchors) | [48-80, 80-120] |
| Card grid (horizontal) | 16-24 | — |
| Inside cards | 12-16 | 24 |
| Inside buttons | — | [12, 24] |
| Inside inputs | — | [12, 14] |
| Form fields (vertical) | 16 | — |
| Button groups (horiz) | 12 | — |
| Nav links (horizontal) | 24-32 | — |

---

## Layout Patterns

### Full-width Section
\`\`\`
┌──────────────────────────────────────────────┐
│              Section (1200×auto)              │
│  padding: [48-80, 80-120]                    │
│  ┌─────────────────────────────────────────┐ │
│  │ Content (centered text, cards, etc.)    │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
\`\`\`

### Two-Column Hero
\`\`\`
┌──────────────────────────────────────────────┐
│  ┌────────────────┐  ┌────────────────────┐  │
│  │  Text Column   │  │  Visual Column     │  │
│  │  width: "fill" │  │  width: "fill"     │  │
│  │  (headline,    │  │  (screenshot,      │  │
│  │   sub, CTAs)   │  │   illustration)    │  │
│  └────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────┘
\`\`\`

### 3-Column Card Grid
\`\`\`
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Card 1   │  │  Card 2   │  │  Card 3   │
│ width:fill│  │ width:fill│  │ width:fill│
│ shadow ✓  │  │ shadow ✓  │  │ shadow ✓  │
└───────────┘  └───────────┘  └───────────┘
gap: 24, parent: layout: "horizontal"
\`\`\`
`,

  "web-app": `# Web App / Dashboard Design Guide

You are designing a functional product UI. Structure emerges from utility, not decoration.

---

## Core Principles

1. **Purpose First** — Every screen answers one dominant user question, supports one primary action
2. **Dominant Region** — One visual region has the most weight. Avoid equal-weight layouts.
3. **Progressive Disclosure** — Show essentials first. Advanced controls are contextual.
4. **Action Hierarchy** — One primary action per section. Secondary actions visually reduced.
5. **Structural Consistency** — Similar problems → similar solutions. Spacing follows a consistent scale.

---

## Layout Patterns

### Pattern A: Sidebar + Content (Dashboard)
\`\`\`
┌──────────┬────────────────────────────────┐
│          │                                │
│ Sidebar  │     Main Content Area          │
│  240px   │      width: "fill"             │
│          │                                │
└──────────┴────────────────────────────────┘
\`\`\`
\`\`\`json
[
  { "type": "frame", "layout": "horizontal", "width": 240, "fill": "#0f172a",
    "padding": [16, 12], "gap": 4, "children": [ /* sidebar items */ ] },
  { "type": "frame", "layout": "vertical", "width": "fill", "fill": "#f8fafc",
    "padding": 32, "gap": 24, "children": [ /* main content */ ] }
]
\`\`\`

### Pattern B: Header + Content
\`\`\`
┌────────────────────────────────────────────┐
│              Header Bar (64px)             │
├────────────────────────────────────────────┤
│                                            │
│            Content Area                    │
│                                            │
└────────────────────────────────────────────┘
\`\`\`

### Pattern C: Card Grid (Metrics)
\`\`\`
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Metric 1 │ │ Metric 2 │ │ Metric 3 │ │ Metric 4 │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
\`\`\`
Parent: layout: "horizontal", gap: 16, children each width: "fill"

---

## Component Patterns

### Metric Card
\`\`\`json
{ "type": "frame", "layout": "vertical", "width": "fill", "padding": 24, "gap": 8,
  "fill": "#ffffff", "cornerRadius": 12, "borderWidth": 1, "borderColor": "#e2e8f0",
  "boxShadow": "0 1px 3px rgba(0,0,0,0.08)",
  "children": [
    { "type": "text", "content": "Total Users", "fontSize": 13, "color": "#64748b" },
    { "type": "text", "content": "12,543", "fontSize": 32, "fontWeight": "bold", "color": "#0f172a" }
  ] }
\`\`\`

### Sidebar Item (Active)
\`\`\`json
{ "type": "frame", "layout": "horizontal", "padding": [10, 16], "gap": 12,
  "cornerRadius": 8, "fill": "rgba(99,102,241,0.1)", "alignItems": "center", "borderWidth": 0,
  "children": [
    { "type": "text", "content": "📊", "fontSize": 16 },
    { "type": "text", "content": "Dashboard", "fontSize": 14, "fontWeight": "500", "color": "#6366f1" }
  ] }
\`\`\`

### Input Field
\`\`\`json
{ "type": "frame", "layout": "vertical", "gap": 6, "borderWidth": 0,
  "children": [
    { "type": "text", "content": "Email", "fontSize": 13, "fontWeight": "500", "color": "#374151" },
    { "type": "frame", "padding": [10, 14], "cornerRadius": 8, "fill": "#ffffff",
      "borderWidth": 1, "borderColor": "#d1d5db",
      "children": [
        { "type": "text", "content": "Enter your email", "fontSize": 14, "color": "#9ca3af" }
      ] }
  ] }
\`\`\`

---

## Visual Effects for Dashboards

Dashboards should feel clean and structured:
- **Cards**: Always use boxShadow: "0 1px 3px rgba(0,0,0,0.08)" at minimum
- **Sidebar**: Dark fill (#0f172a or #111827) with light text
- **Active states**: Subtle background tint (rgba of brand color at 10%)
- **Dividers**: Use border instead of separate elements. borderWidth: 1, borderColor: "#e2e8f0"

---

## Spacing Reference

| Context | Gap | Padding |
|---------|-----|---------|
| Page sections | 24-32 | 32 |
| Card grid | 16-24 | — |
| Inside cards | 8-12 | 24 |
| Form fields (vertical) | 16 | — |
| Form row (horizontal) | 16 | — |
| Button groups | 12 | — |
| Inside buttons | — | [10, 16] |
| Inside inputs | — | [10, 14] |
| Sidebar items | 4 | [10, 16] |

---

## Button Hierarchy

| Priority | Style | Use For |
|----------|-------|---------|
| 1. Primary | fill: brand color + boxShadow | Main action (Save, Submit, Create) |
| 2. Secondary | fill: "#f1f5f9", text: dark | Alternative actions |
| 3. Outline | borderWidth: 1, fill: transparent | Tertiary, Cancel, Back |
| 4. Ghost | fill: transparent, no border | Inline actions, navigation |
| 5. Destructive | fill: "#ef4444" | Delete, Remove |

Right-align action buttons in cards and modals. One primary per section.

---

## Anti-Patterns

- ❌ No multi-purpose cluttered screens — one purpose per screen
- ❌ Don't give equal emphasis to all actions — hierarchy is mandatory
- ❌ Don't mix density modes within one screen
- ❌ No decorative dividers unless functionally needed
- ❌ No silent states — always show loading, empty, error states
`,
};

server.tool(
  "get_design_guide",
  `Get comprehensive design methodology and patterns for a specific type of design.

ALWAYS call this before starting a new design. The guide includes:
- Pre-design methodology and workflow
- Page structure and section ordering
- Visual guidelines (typography, color, effects)
- Layout patterns with ASCII diagrams
- Component patterns with code examples
- Spacing reference tables
- Anti-slop rules to avoid generic AI aesthetics

Available topics:
- "landing-page": Marketing/landing pages, promotional sites
- "web-app": Dashboards, admin panels, SaaS product UI`,
  {
    topic: z.enum(["landing-page", "web-app"]).describe("Type of design to get guidance for"),
  },
  async (args) => {
    const guide = DESIGN_GUIDES[args.topic];
    if (!guide) {
      return { content: [{ type: "text", text: `Unknown topic: ${args.topic}. Available: landing-page, web-app` }], isError: true };
    }
    return { content: [{ type: "text", text: guide }] };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Utility tools
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  "clear_canvas",
  "Remove all shapes from the canvas. Use before starting a completely new design.",
  {},
  async () => {
    try { await bridge.clear(); return { content: [{ type: "text", text: "Canvas cleared — ready for new design." }] }; }
    catch (err) { return { content: [{ type: "text", text: `Error: ${err}` }], isError: true }; }
  }
);

server.tool(
  "zoom_to_fit",
  "Zoom the canvas viewport to fit all shapes. [build:20260301-3]",
  {},
  async () => {
    try { await bridge.zoomToFit(); return { content: [{ type: "text", text: "Zoomed to fit all shapes." }] }; }
    catch (err) { return { content: [{ type: "text", text: `Error: ${err}` }], isError: true }; }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: list_components
// ─────────────────────────────────────────────────────────────────────────────

const COMPONENT_CATALOG = [
  { name: "Button/Primary", category: "Buttons", description: "Primary CTA button with brand color fill and shadow", overrides: "label, fill, cornerRadius" },
  { name: "Button/Secondary", category: "Buttons", description: "Secondary button with subtle background", overrides: "label, fill" },
  { name: "Button/Outline", category: "Buttons", description: "Outline button with border only", overrides: "label, borderColor" },
  { name: "Button/Ghost", category: "Buttons", description: "Ghost button — text only, no background", overrides: "label, color" },
  { name: "Button/Destructive", category: "Buttons", description: "Destructive/danger button with red fill", overrides: "label" },
  { name: "Input", category: "Form", description: "Text input field with label", overrides: "label, placeholder" },
  { name: "Select", category: "Form", description: "Dropdown select with label and chevron", overrides: "label, placeholder" },
  { name: "Checkbox", category: "Form", description: "Checkbox with label", overrides: "label, checked" },
  { name: "Switch", category: "Form", description: "Toggle switch with label", overrides: "label, on" },
  { name: "Card", category: "Display", description: "Card container with title and description", overrides: "title, description" },
  { name: "Avatar", category: "Display", description: "Circular avatar with initials", overrides: "initials, fill, size" },
  { name: "Badge", category: "Display", description: "Small colored label/tag", overrides: "text, variant (success/warning/error/info/default)" },
  { name: "Divider", category: "Display", description: "Horizontal line separator", overrides: "none" },
  { name: "Alert", category: "Feedback", description: "Alert box with title and message", overrides: "title, message, variant (info/success/warning/error)" },
  { name: "SidebarItem", category: "Navigation", description: "Sidebar navigation item", overrides: "label, icon, active" },
  { name: "SidebarItem/Active", category: "Navigation", description: "Active sidebar navigation item (highlighted)", overrides: "label, icon" },
  { name: "Tab", category: "Navigation", description: "Tab button (inactive)", overrides: "label" },
  { name: "Tab/Active", category: "Navigation", description: "Active tab button with bottom border", overrides: "label" },
];

server.tool(
  "list_components",
  `List all available reusable UI components.

Call this to see what components are available, then use them in batch_design with:
\`\`\`json
{ "type": "ref", "ref": "ComponentName", "overrides": { ... } }
\`\`\`

Components are pre-styled with shadows, borders, and correct spacing.`,
  {},
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

    return { content: [{ type: "text", text }] };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: list_icons
// ─────────────────────────────────────────────────────────────────────────────

const ICON_CATALOG: Record<string, string[]> = {
  "Navigation": ["arrow-right", "arrow-left", "arrow-up", "arrow-down", "arrow-up-right", "chevron-right", "chevron-left", "chevron-down", "chevron-up", "menu", "x", "more-horizontal", "more-vertical", "external-link"],
  "Actions": ["search", "plus", "minus", "check", "copy", "download", "upload", "edit", "trash", "filter", "refresh-cw"],
  "People": ["user", "users", "log-out", "log-in"],
  "Communication": ["mail", "message-square", "bell", "phone", "send"],
  "Content": ["image", "file", "folder", "link", "clipboard"],
  "System": ["settings", "home", "lock", "unlock", "shield", "eye", "eye-off"],
  "Status": ["heart", "star", "thumbs-up", "alert-circle", "alert-triangle", "info", "check-circle"],
  "Analytics": ["bar-chart", "trending-up", "trending-down", "activity", "pie-chart"],
  "Commerce": ["shopping-cart", "credit-card", "dollar-sign"],
  "Layout": ["grid", "layout", "sidebar", "calendar", "clock"],
  "Tech": ["cloud", "globe", "wifi", "zap", "sparkles", "rocket"],
};

server.tool(
  "list_icons",
  `List all available Lucide SVG icons, grouped by category.

Use icons inside batch_design children arrays:
\`\`\`json
{ "type": "icon", "iconName": "search", "width": 20, "iconColor": "#6b7280" }
\`\`\`

Icons render as crisp SVG at any size. Default: 24×24, stroke-width: 2.`,
  {},
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
    return { content: [{ type: "text", text }] };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("tldraw-mcp v0.9.0 — icons, components, box shadows, gradients, design guides, scoped screenshots");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
