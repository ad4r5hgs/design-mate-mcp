/**
 * MCP Constants — Configuration values for the MCP server.
 *
 * Centralises magic numbers that were previously scattered across
 * bridge.ts, batch-get.ts, and index.ts.
 *
 * @module constants
 */

// ─── Bridge / Network ────────────────────────────────────────────────────────

/** Default WebSocket relay URL when TLDRAW_WS_URL env var is not set. */
export const DEFAULT_WS_URL = "ws://localhost:4000";

/** Max time to wait for initial WebSocket connection to canvas (ms). */
export const BRIDGE_CONNECT_TIMEOUT_MS = 5000;

/** Max time to wait for a canvas response before timing out a request (ms).
 *  Set high because screenshot/image export can be slow. */
export const BRIDGE_REQUEST_TIMEOUT_MS = 30000;

/** Max characters of a logged response body (truncation for safety). */
export const LOG_TRUNCATION_LENGTH = 100;

// ─── Section Detection ───────────────────────────────────────────────────────
// These values identify "section label" text shapes on the canvas.
// The layout engine creates section markers with a specific fontSize + fill.

/** Font size used by section name label shapes. */
export const SECTION_MARKER_FONT_SIZE = 11;

/** Fill color of section name label shapes. */
export const SECTION_MARKER_COLOR = "#888888";

/** Vertical gap subtracted from the next section marker's Y to define section bounds. */
export const SECTION_BOUNDARY_GAP = 10;

/** Small Y tolerance when filtering shapes that belong to a section. */
export const SECTION_Y_TOLERANCE = 5;
