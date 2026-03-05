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

const PORT = Number(process.env.WS_PORT) || 4000;
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
 * 3. Does it have `type` (string) and `requestId` (string)?
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
  if (typeof obj.type !== "string" || typeof obj.requestId !== "string") {
    return null; // Missing required envelope fields
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
      // Only log first few rejections to avoid flooding on noisy bad clients
      if (messageCount <= 20) {
        console.warn(`[ws] rejected malformed message #${messageCount} (invalid JSON or missing type/requestId)`);
      }
      return; // Drop — do NOT relay to other clients
    }

    // Only log every 100th message to avoid terminal flooding
    if (messageCount <= 5 || messageCount % 100 === 0) {
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
