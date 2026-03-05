import { WebSocket } from "ws";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ShapeData {
  id?: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  geo?: string;
  color?: string;
  fill?: string;
  name?: string;
  parentId?: string;
  // pen-frame props
  layout?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
  padding?: number | number[];
  cornerRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  // pen-text props
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  lineHeight?: number;
  textGrowth?: string;
  // generic passthrough for any other props
  [key: string]: unknown;
}

export type SingleCommand =
  | { type: "create"; shape: ShapeData }
  | { type: "update"; id: string; props: Partial<ShapeData> }
  | { type: "delete"; ids: string[] }
  | { type: "snapshot" }
  | { type: "clear" }
  | { type: "zoom_to_fit" }
  | { type: "export"; format: "png" | "svg" | "json" }
  | { type: "screenshot" };

export interface BatchOperation {
  op: "create" | "update" | "delete";
  // create fields
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parentId?: string;
  ref?: string;
  props?: Record<string, unknown>;
  // update fields
  id?: string;
  // delete fields
  ids?: string[];
}

export interface BatchCommand {
  type: "batch";
  operations: BatchOperation[];
  clearFirst?: boolean;
}

export type CanvasCommand = SingleCommand | BatchCommand;

export interface BatchResult {
  results: Array<{
    op: string;
    ref?: string;
    id?: string;
    error?: string;
    deleted?: number;
  }>;
  refMap: Record<string, string>;
}

export interface CanvasState {
  shapes: ShapeData[];
  bounds: { x: number; y: number; width: number; height: number };
}

export interface ScreenshotResult {
  image: string;   // base64 data URL
  width: number;
  height: number;
}

import {
  DEFAULT_WS_URL,
  BRIDGE_CONNECT_TIMEOUT_MS,
  BRIDGE_REQUEST_TIMEOUT_MS,
  LOG_TRUNCATION_LENGTH,
} from "./constants.js";

type MessageHandler = (data: unknown) => void;

// ─── Bridge ──────────────────────────────────────────────────────────────────

/**
 * Two-way WebSocket bridge between the MCP server and the tldraw canvas.
 *
 * Implements request-response semantics over WebSocket by assigning each
 * outgoing command a unique requestId and routing the corresponding reply
 * to the correct Promise.
 */
export class CanvasBridge {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Map<string, MessageHandler>();
  private requestId = 0;
  private connected = false;

  constructor(url: string = DEFAULT_WS_URL) {
    this.url = url;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      const connectionTimeout = setTimeout(() => {
        reject(new Error(`Connection timeout: Could not connect to canvas at ${this.url}. Make sure the canvas is running (cd canvas && bun run dev)`));
      }, BRIDGE_CONNECT_TIMEOUT_MS);

      this.ws.on("open", () => {
        clearTimeout(connectionTimeout);
        this.connected = true;
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());

          // ── Response validation — verify structure before handler lookup ──
          if (typeof msg !== "object" || msg === null) {
            console.warn("[bridge] dropped non-object response from canvas");
            return;
          }

          if (typeof msg.requestId !== "string") {
            console.warn("[bridge] dropped response without valid requestId:", JSON.stringify(msg).slice(0, LOG_TRUNCATION_LENGTH));
            return;
          }

          const handler = this.handlers.get(msg.requestId);
          if (handler) {
            if (msg.error) {
              handler({ error: msg.error });
            } else {
              handler(msg);
            }
            this.handlers.delete(msg.requestId);
          } else {
            // Unmatched requestId — could be a stale handler or spoofed message
            console.warn(`[bridge] no handler for requestId: ${msg.requestId} (stale or unexpected)`);
          }
        } catch {
          console.warn("[bridge] failed to parse canvas response as JSON");
        }
      });

      this.ws.on("close", () => {
        this.connected = false;
      });

      this.ws.on("error", (err) => {
        clearTimeout(connectionTimeout);
        this.connected = false;
        const errorMessage = err.message.includes("ECONNREFUSED")
          ? `Cannot connect to canvas at ${this.url}. Make sure the canvas is running (cd canvas && bun run dev)`
          : `WebSocket error: ${err.message}`;
        reject(new Error(errorMessage));
      });
    });
  }

  async send<T>(command: CanvasCommand): Promise<T> {
    if (!this.connected || !this.ws) {
      await this.connect();
    }

    const requestId = String(++this.requestId);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.handlers.delete(requestId);
        reject(new Error(`Request timeout: Widget did not respond within ${BRIDGE_REQUEST_TIMEOUT_MS / 1000}s for command '${command.type}'`));
      }, BRIDGE_REQUEST_TIMEOUT_MS);  // Generous timeout — screenshot/image export can be slow

      this.handlers.set(requestId, (data) => {
        clearTimeout(timeout);
        const response = data as T & { error?: string };
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      this.ws!.send(JSON.stringify({ ...command, requestId }));
    });
  }

  // ── Batch operation (single roundtrip) ──
  async sendBatch(operations: BatchOperation[], clearFirst = false): Promise<BatchResult> {
    return this.send<BatchResult>({
      type: "batch",
      operations,
      clearFirst,
    });
  }

  // ── Screenshot — returns base64 PNG ──
  async getScreenshot(opts?: { sectionName?: string; shapeIds?: string[]; mode?: string }): Promise<ScreenshotResult> {
    return this.send<ScreenshotResult>({
      type: "screenshot",
      ...(opts?.sectionName ? { sectionName: opts.sectionName } : {}),
      ...(opts?.shapeIds ? { shapeIds: opts.shapeIds } : {}),
      ...(opts?.mode ? { mode: opts.mode } : {}),
    } as any);
  }

  // ── Single operations (kept for simple cases) ──
  async createShape(shape: ShapeData): Promise<{ id: string }> {
    return this.send({ type: "create", shape });
  }

  async updateShape(id: string, props: Partial<ShapeData>): Promise<void> {
    return this.send({ type: "update", id, props });
  }

  async deleteShapes(ids: string[]): Promise<void> {
    return this.send({ type: "delete", ids });
  }

  async getSnapshot(): Promise<CanvasState> {
    return this.send({ type: "snapshot" });
  }

  async clear(): Promise<void> {
    return this.send({ type: "clear" });
  }

  async zoomToFit(): Promise<void> {
    return this.send({ type: "zoom_to_fit" });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
}

