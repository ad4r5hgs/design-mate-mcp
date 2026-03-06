/**
 * App — Root React component and WebSocket orchestrator.
 *
 * This is a slim coordinator that wires together:
 * - tldraw canvas with custom shape utils
 * - WebSocket connection to MCP server
 * - Engine modules for command handling, screenshots, and resize propagation
 *
 * All heavy logic lives in the engine/ modules — this file is purely wiring.
 *
 * @module App
 */

import { useCallback } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { WS_URL, CUSTOM_SHAPE_UTILS, WS_RECONNECT_DELAY_MS, PERSISTENCE_KEY } from "./constants";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { TopBar } from "./components/TopBar";
import { ChatDrawer } from "./components/ChatDrawer";
import { CustomToolbar } from "./components/CustomToolbar";
import { useCanvasStore, editorRef } from "./stores";
import {
  restoreSectionMap,
  shapeParentMap,
  handleBatch,
  handleSingle,
  handleScreenshot,
  propagateResize,
  tryParseJSON,
  isValidCommand,
  isValidBatchCommand,
  type BatchCommand,
  type SingleCommand,
} from "./engine";

/** Set of all registered pen shape types — derived from CUSTOM_SHAPE_UTILS so it
 *  stays in sync automatically when new shape utils are added to constants.ts. */
const PEN_SHAPE_TYPES: Set<string> = new Set(CUSTOM_SHAPE_UTILS.map(u => u.type));

// ─── tldraw UI overrides ─────────────────────────────────────────────────────

function InFrontOfTheCanvas() {
  return (
    <>
      <CustomToolbar />
      <PropertiesPanel />
    </>
  );
}

const customComponents = {
  InFrontOfTheCanvas,
  StylePanel: null,
  MainMenu: null,
  PageMenu: null,
  HelpMenu: null,
  Toolbar: null,
  QuickActions: null,
  NavigationPanel: null,
  TopPanel: null,
};

// ─── WebSocket connection ────────────────────────────────────────────────────

let activeWs: WebSocket | null = null;

function connectWebSocket(editor: Editor) {
  restoreSectionMap(editor);

  // Listen for user-initiated resize events and propagate to parent containers
  editor.store.listen(
    (entry) => {
      for (const [, change] of Object.entries(entry.changes.updated)) {
        const [from, to] = change as [any, any];
        if (to.typeName !== "shape") continue;
        const shapeType: string = to.type ?? "";
        if (!PEN_SHAPE_TYPES.has(shapeType)) continue;
        if (from.props?.w === to.props?.w && from.props?.h === to.props?.h) continue;
        if (!shapeParentMap.has(to.id as string)) continue;
        propagateResize(editor, to.id as string);
      }
    },
    { source: "user" },
  );

  if (activeWs) {
    activeWs.onclose = null;
    activeWs.close();
    activeWs = null;
  }

  const ws = new WebSocket(WS_URL);
  activeWs = ws;

  ws.onopen = () => console.log("[ws] connected");
  ws.onclose = () => {
    if (activeWs === ws) activeWs = null;
    setTimeout(() => connectWebSocket(editor), WS_RECONNECT_DELAY_MS);
  };

  ws.onmessage = async (event) => {
    // ── Deserialization boundary — parse, don't validate ──────────────
    const parsed = tryParseJSON(typeof event.data === "string" ? event.data : String(event.data));
    if (!isValidCommand(parsed)) {
      console.warn("[ws] dropped invalid message (malformed JSON or missing type/requestId)");
      return;
    }

    try {
      // Screenshot is async — handle separately
      if (parsed.type === "screenshot") {
        try {
          const result = await handleScreenshot(editor, parsed as any);
          ws.send(JSON.stringify(result));
        } catch (err) {
          ws.send(JSON.stringify({ requestId: parsed.requestId, error: `Screenshot failed: ${err}` }));
        }
        return;
      }

      if (parsed.type === "batch") {
        if (!isValidBatchCommand(parsed)) {
          ws.send(JSON.stringify({ requestId: parsed.requestId, error: "Invalid batch command: 'operations' must be an array" }));
          return;
        }
        const response = handleBatch(editor, parsed as BatchCommand);
        ws.send(JSON.stringify(response));
        return;
      }

      // Single command
      const response = handleSingle(editor, parsed as SingleCommand);
      ws.send(JSON.stringify(response));
    } catch (err) {
      console.error("[ws] error:", err);
    }
  };
}

// ─── Root Component ──────────────────────────────────────────────────────────

export function App() {
  const chatOpen = useCanvasStore((s) => s.chatOpen);
  const chatPanelWidth = useCanvasStore((s) => s.chatPanelWidth);
  const setHasSelection = useCanvasStore((s) => s.setHasSelection);

  const handleMount = useCallback((editor: Editor) => {
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    editorRef.current = editor;
    editor.store.listen(() => {
      setHasSelection(editor.getSelectedShapeIds().length > 0);
    });
    connectWebSocket(editor);
    console.log("[app] mounted with:", CUSTOM_SHAPE_UTILS.map(u => u.type));
  }, [setHasSelection]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#111111" }}>
      <TopBar />
      <div style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: chatOpen ? chatPanelWidth : 0,
        bottom: 0,
        transition: "right 0.0s",
      }}>
        <Tldraw persistenceKey={PERSISTENCE_KEY} onMount={handleMount} shapeUtils={CUSTOM_SHAPE_UTILS} components={customComponents} />
      </div>
      <ChatDrawer />
    </div>
  );
}
