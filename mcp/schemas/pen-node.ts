/**
 * PenNode Schema — Zod definitions for the design tree and batch operations.
 *
 * PenNode is a recursive CSS-flexbox-like tree structure used by the layout engine.
 * BatchOperation defines the create/update/delete ops for the canvas.
 *
 * @module schemas/pen-node
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// PenNode — recursive tree schema for UI component trees
// ─────────────────────────────────────────────────────────────────────────────

export const PenNode: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum(["frame", "text", "ref", "icon", "image"]).describe(
      "'frame' = div-like container, 'text' = text content, 'ref' = component instance, 'icon' = Lucide SVG icon, 'image' = image from URL or base64 data URI"
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
    iconName: z.string().optional().describe(
      "Lucide icon name (type='icon' only). Call list_icons to see all available icons. Examples: 'search', 'user', 'settings', 'heart', 'star', 'zap', 'arrow-right'"
    ),
    iconColor: z.string().optional().describe("Icon stroke color (default: '#000000')"),
    iconStrokeWidth: z.number().optional().describe("Icon stroke width (default: 2)"),
    src: z.string().optional().describe(
      "Image source for type='image'. Accepts a URL ('https://...') or a base64 data URI ('data:image/png;base64,...'). Default size is 200×150 if width/height are omitted."
    ),
    objectFit: z.enum(["cover", "contain", "fill"]).optional().describe(
      "CSS object-fit for type='image'. 'cover' (default) = crop to fill bounds, 'contain' = letterbox, 'fill' = stretch"
    ),
    animation: z.string().optional().describe(
      "CSS animation shorthand applied to this shape. Use named presets followed by timing: " +
      "'pen-pulse 2s ease-in-out infinite' (scale pulse, good for CTAs), " +
      "'pen-float 3s ease-in-out infinite' (gentle up/down, good for decorative blobs), " +
      "'pen-spin 2s linear infinite' (rotation, good for icons/spinners), " +
      "'pen-shimmer 1.5s ease-in-out infinite' (brightness pulse, good for highlights), " +
      "'pen-bounce 1s ease infinite' (spring bounce, good for attention), " +
      "'pen-glow 2s ease-in-out infinite' (drop-shadow pulse, good for neon/glow effects), " +
      "'pen-fade-in 0.8s ease-out forwards' (one-shot fade in), " +
      "'pen-shake 0.5s ease-in-out' (horizontal shake, good for alerts), " +
      "'pen-color-cycle 4s linear infinite' (hue-rotate, great for colorful/festive themes), " +
      "'pen-slide-up 0.6s ease-out forwards' (one-shot slide up reveal). " +
      "Works on all node types: frame, text, icon, image."
    ),
  }).passthrough()
);

// ─────────────────────────────────────────────────────────────────────────────
// Batch operation schemas
// ─────────────────────────────────────────────────────────────────────────────

export const CreateOp = z.object({
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
  width: z.number().optional().describe("Container width (px). Default: 400. Common: 400 (card), 800 (content), 1200 (full-width)"),
  height: z.number().optional().describe("Container height (px). Omit for auto-sizing to content (recommended for navbars, cards, sections). Set explicitly only for fixed-height containers."),
  ref: z.string().optional().describe("Reference name for later update/delete operations"),
  props: z.record(z.any()).optional().describe("Shape properties. For pen-frame: include 'children' array with the component tree."),
});

export const UpdateOp = z.object({
  op: z.literal("update"),
  id: z.string().describe("Shape ID (from create result) or ref name"),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  props: z.record(z.any()).optional(),
});

export const DeleteOp = z.object({
  op: z.literal("delete"),
  ids: z.array(z.string()),
});

export const BatchOperation = z.discriminatedUnion("op", [CreateOp, UpdateOp, DeleteOp]);
