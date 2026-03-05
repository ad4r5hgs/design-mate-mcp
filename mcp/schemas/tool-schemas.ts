/**
 * Tool Input Schemas — Centralized Zod schemas for all MCP tool inputs.
 *
 * Edit this file to extend any tool's accepted parameters.
 * Each schema is a named export used by the corresponding tool in `tools/`.
 *
 * @module schemas/tool-schemas
 */

import { z } from "zod";
import { BatchOperation } from "./pen-node.js";
import { DESIGN_GUIDES } from "../data/design-guides-loader.js";

// ── batch_design ─────────────────────────────────────────────────────────────

export const BatchDesignInput = z.object({
    operations: z.array(BatchOperation).describe("Array of create/update/delete operations."),
    clearFirst: z.boolean().optional().default(false).describe("Clear canvas before executing. Use when starting fresh."),
});

// ── batch_get ────────────────────────────────────────────────────────────────

export const BatchGetInput = z.object({
    ids: z.array(z.string()).optional().describe("Filter by specific shape IDs"),
    types: z.array(z.string()).optional().describe("Filter by type: 'pen-frame', 'pen-text'"),
    name: z.string().optional().describe("Filter by section name"),
});

// ── get_screenshot ───────────────────────────────────────────────────────────

export const ScreenshotInput = z.object({
    sectionName: z.string().optional().describe("Name of a section to screenshot with 125% context (e.g., 'Navbar', 'Hero Section')"),
    shapeIds: z.array(z.string()).optional().describe("Specific shape IDs to capture with context"),
    mode: z.enum(["section", "full"]).optional().describe("'section' = scoped + 25% context (default when sectionName given), 'full' = entire canvas"),
});

// ── clear_canvas ─────────────────────────────────────────────────────────────

export const ClearCanvasInput = z.object({});

// ── zoom_to_fit ──────────────────────────────────────────────────────────────

export const ZoomToFitInput = z.object({});

// ── get_design_guide ─────────────────────────────────────────────────────────
// Auto-derived from available guide files in mcp/data/guides/

const guideTopics = Object.keys(DESIGN_GUIDES) as [string, ...string[]];

export const DesignGuideInput = z.object({
    topic: z.enum(guideTopics).describe("Type of design to get guidance for"),
});

/** Human-readable list of available topics for tool descriptions. */
export const GUIDE_TOPIC_LIST = guideTopics.map(t => `- "${t}"`).join("\n");

// ── list_components ──────────────────────────────────────────────────────────

export const ListComponentsInput = z.object({});

// ── list_icons ───────────────────────────────────────────────────────────────

export const ListIconsInput = z.object({});
