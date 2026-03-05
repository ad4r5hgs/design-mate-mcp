/**
 * WebSocket Relay Server — Bridges MCP ↔ Canvas communication.
 *
 * Listens on a configurable port and relays messages between connected clients.
 * Performs perimeter validation: rejects malformed JSON and messages missing
 * required fields (type, requestId) before relaying to other clients.
 *
 * @module ws-server
 */

import { WebSocketServer, WebSocket } from "ws";

// ─── Configuration ───────────────────────────────────────────────────────────
// These mirror the constants in canvas/src/constants.ts but are defined locally
// because ws-server.ts runs as a standalone Node process (not bundled with the
// canvas React app), so it cannot import from the canvas source tree.

const DEFAULT_WS_PORT = 4000;
const WS_LOG_INITIAL_COUNT = 5;
const WS_LOG_INTERVAL = 100;
const WS_REJECT_LOG_LIMIT = 20;

const PORT = Number(process.env.WS_PORT) || DEFAULT_WS_PORT;
const wss = new WebSocketServer({ port: PORT });

const clients = new Set<WebSocket>();
let messageCount = 0;

// ─── Perimeter Validation ────────────────────────────────────────────────────

/**
 * Safely parse and validate a raw WS message at the relay boundary.
 * Returns the parsed object if valid, or null if it should be rejected.
 *
 * Checks:
 * 1. Is it valid JSON?
 * 2. Is it an object (not a primitive or array)?
 * 3. Does it have at least one of `type` (string) or `requestId` (string)?
 *    - Commands have `type` + `requestId`
 *    - Responses may only have `requestId` + data
 */
function validateRelayMessage(raw: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // Invalid JSON
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null; // Must be a plain object
  }

  const obj = parsed as Record<string, unknown>;
  const hasType = typeof obj.type === "string";
  const hasRequestId = typeof obj.requestId === "string";

  if (!hasType && !hasRequestId) {
    return null; // Must have at least one identifier
  }

  return obj;
}

// ─── Server ──────────────────────────────────────────────────────────────────

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (${clients.size} total)`);

  ws.on("message", (data) => {
    messageCount++;
    const raw = data.toString();

    // ── Perimeter validation — reject malformed messages before relay ──
    const validated = validateRelayMessage(raw);
    if (!validated) {
      if (messageCount <= WS_REJECT_LOG_LIMIT) {
        console.warn(`[ws] rejected malformed message #${messageCount} (invalid JSON or missing type/requestId)`);
      }
      return; // Drop — do NOT relay to other clients
    }

    // Only log every Nth message to avoid terminal flooding
    if (messageCount <= WS_LOG_INITIAL_COUNT || messageCount % WS_LOG_INTERVAL === 0) {
      console.log(`[ws] relaying message to ${clients.size - 1} client(s) (total: ${messageCount})`);
    }

    // Broadcast to ALL other clients
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[ws] client disconnected (${clients.size} total)`);
  });
});

console.log(`[ws] server listening on ws://localhost:${PORT}`);
