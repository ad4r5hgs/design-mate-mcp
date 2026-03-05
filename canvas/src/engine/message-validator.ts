/**
 * Message Validator — Runtime type guards for WebSocket messages.
 *
 * Provides safe JSON parsing and structural validation at trust boundaries.
 * Uses TypeScript's type narrowing (type predicates) so downstream code
 * gets full type safety without blind `as` casts.
 *
 * Design choice: lightweight type guards instead of zod to keep the
 * canvas bundle lean — these checks are ~20 lines vs ~14KB for zod.
 *
 * @module engine/message-validator
 */

// ─── Validated message shapes ────────────────────────────────────────────────

/** Minimal structure every canvas command must have. */
export interface ValidCommand {
    type: string;
    requestId: string;
    [key: string]: unknown;
}

/** Structure of a valid batch command (type narrowed). */
export interface ValidBatchCommand extends ValidCommand {
    type: "batch";
    operations: unknown[];
    clearFirst?: boolean;
}

// ─── Safe JSON Parse ─────────────────────────────────────────────────────────

/**
 * Safely parse a JSON string. Returns the parsed value or `null` on failure.
 * This is the single point where JSON.parse errors are caught — callers
 * never need their own try/catch around parsing.
 */
export function tryParseJSON(raw: string): unknown | null {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// ─── Type Guards (Type Predicates) ───────────────────────────────────────────

/**
 * Type guard: is this a valid canvas command with `type` and `requestId`?
 *
 * TypeScript narrows the type after this check:
 * ```ts
 * if (isValidCommand(data)) {
 *   data.type;      // string ✓
 *   data.requestId; // string ✓
 * }
 * ```
 */
export function isValidCommand(data: unknown): data is ValidCommand {
    return (
        typeof data === "object" &&
        data !== null &&
        typeof (data as Record<string, unknown>).type === "string" &&
        typeof (data as Record<string, unknown>).requestId === "string"
    );
}

/**
 * Type guard: is this a valid batch command?
 * Validates `type === "batch"` AND `operations` is an array.
 */
export function isValidBatchCommand(data: unknown): data is ValidBatchCommand {
    return (
        isValidCommand(data) &&
        data.type === "batch" &&
        Array.isArray((data as Record<string, unknown>).operations)
    );
}

/**
 * Type guard for WS relay: checks only the minimal envelope (type + requestId).
 * Used at the perimeter to reject garbage before it reaches clients.
 */
export function isRelayable(data: unknown): data is ValidCommand {
    return isValidCommand(data);
}
