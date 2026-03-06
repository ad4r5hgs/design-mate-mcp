/**
 * Application-level constants for the canvas.
 *
 * @module constants
 */

import { PenFrameUtil, PenTextUtil, PenIconUtil, PenImageUtil } from "./shapes";

/** WebSocket relay server URL. */
export const WS_URL = "ws://localhost:4000";

/** Custom tldraw shape utils registered on canvas mount. */
export const CUSTOM_SHAPE_UTILS = [PenFrameUtil, PenTextUtil, PenIconUtil, PenImageUtil];

/** localStorage key for the section name map (rootShapeId → sectionName). */
export const SECTION_MAP_KEY = "tldraw-mcp-section-map";

/** IndexedDB persistence key — tldraw auto-saves/loads all shapes and assets
 *  under this key. Syncs across browser tabs sharing the same key. */
export const PERSISTENCE_KEY = "designmate-canvas";

/** localStorage key for the section shapes map (rootShapeId → [all shape IDs]). */
export const SECTION_SHAPES_KEY = "tldraw-mcp-section-shapes";

// ─── Network & Timing ───────────────────────────────────────────────────────

/** Delay before attempting WebSocket reconnection after disconnect (ms). */
export const WS_RECONNECT_DELAY_MS = 2000;

/** Default WebSocket server port when WS_PORT env var is not set. */
export const DEFAULT_WS_PORT = 4000;

/** Number of initial messages to log before switching to interval logging. */
export const WS_LOG_INITIAL_COUNT = 5;

/** After initial messages, log every Nth message. */
export const WS_LOG_INTERVAL = 100;

/** Max number of rejected messages to log (avoids flooding on noisy bad clients). */
export const WS_REJECT_LOG_LIMIT = 20;

// ─── UI Layout ───────────────────────────────────────────────────────────────

/** Default width of the chat drawer panel in pixels. */
export const DEFAULT_CHAT_PANEL_WIDTH = 280;
