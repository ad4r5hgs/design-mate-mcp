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

/** localStorage key for the section shapes map (rootShapeId → [all shape IDs]). */
export const SECTION_SHAPES_KEY = "tldraw-mcp-section-shapes";
