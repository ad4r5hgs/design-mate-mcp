/**
 * Shape Defaults — Fallback dimensions and typography values.
 *
 * Used across single-handler and batch-handler when the MCP command
 * doesn't specify explicit dimensions. Centralised here to keep
 * handlers DRY and make it easy to adjust global defaults.
 *
 * @module engine/defaults
 */

// ─── Frame ───────────────────────────────────────────────────────────────────

export const DEFAULT_FRAME_WIDTH = 400;
export const DEFAULT_FRAME_HEIGHT = 300;

// ─── Geo (rectangle, ellipse, etc.) ──────────────────────────────────────────

export const DEFAULT_GEO_WIDTH = 200;
export const DEFAULT_GEO_HEIGHT = 200;

// ─── Text ────────────────────────────────────────────────────────────────────

export const DEFAULT_TEXT_WIDTH = 200;
export const DEFAULT_TEXT_HEIGHT = 24;

// ─── Typography ──────────────────────────────────────────────────────────────

export const DEFAULT_FONT_SIZE = 16;

// ─── Animation ───────────────────────────────────────────────────────────────

export const ZOOM_ANIMATION_DURATION_MS = 200;
