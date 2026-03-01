import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.WS_PORT) || 4000;
const wss = new WebSocketServer({ port: PORT });

const clients = new Set<WebSocket>();
let messageCount = 0;

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (${clients.size} total)`);

  ws.on("message", (data) => {
    messageCount++;
    // Only log every 100th message to avoid terminal flooding
    if (messageCount <= 5 || messageCount % 100 === 0) {
      console.log(`[ws] relaying message to ${clients.size - 1} client(s) (total: ${messageCount})`);
    }

    // Broadcast to ALL other clients
    const msg = data.toString();
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[ws] client disconnected (${clients.size} total)`);
  });
});

console.log(`[ws] server listening on ws://localhost:${PORT}`);
