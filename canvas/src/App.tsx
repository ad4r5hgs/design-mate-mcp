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

import { useCallback, useSyncExternalStore } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { WS_URL, CUSTOM_SHAPE_UTILS } from "./constants";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { TopBar } from "./components/TopBar";
import { ChatDrawer } from "./components/ChatDrawer";
import { CustomToolbar } from "./components/CustomToolbar";
import { editorRef, hasSelectionStore, chatOpenStore, chatPanelWidthStore } from "./stores";
import {
  restoreSectionMap,
  shapeParentMap,
  handleBatch,
  handleSingle,
  handleScreenshot,
  propagateResize,
  type BatchCommand,
  type SingleCommand,
} from "./engine";

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

type CanvasCommand = SingleCommand | BatchCommand;
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
        if (!["pen-frame", "pen-text", "pen-icon", "pen-image"].includes(shapeType)) continue;
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
    setTimeout(() => connectWebSocket(editor), 2000);
  };

  ws.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data) as CanvasCommand;
      if (!msg.type || !msg.requestId) return;

      // Screenshot is async — handle separately
      if (msg.type === "screenshot") {
        try {
          const result = await handleScreenshot(editor, msg as any);
          ws.send(JSON.stringify(result));
        } catch (err) {
          ws.send(JSON.stringify({ requestId: msg.requestId, error: `Screenshot failed: ${err}` }));
        }
        return;
      }

      const response = msg.type === "batch"
        ? handleBatch(editor, msg as BatchCommand)
        : handleSingle(editor, msg as SingleCommand);

      ws.send(JSON.stringify(response));
    } catch (err) {
      console.error("[ws] error:", err);
    }
  };
}

// ─── Root Component ──────────────────────────────────────────────────────────

export function App() {
  const chatOpen = useSyncExternalStore(chatOpenStore.subscribe, chatOpenStore.get);
  const chatWidth = useSyncExternalStore(chatPanelWidthStore.subscribe, chatPanelWidthStore.get);

  const handleMount = useCallback((editor: Editor) => {
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    editorRef.current = editor;
    editor.store.listen(() => {
      hasSelectionStore.set(editor.getSelectedShapeIds().length > 0);
    });
    connectWebSocket(editor);
    console.log("[app] mounted with:", CUSTOM_SHAPE_UTILS.map(u => u.type));
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#111111" }}>
      <TopBar />
      <div style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: chatOpen ? chatWidth : 0,
        bottom: 0,
        transition: "right 0.0s",
      }}>
        <Tldraw onMount={handleMount} shapeUtils={CUSTOM_SHAPE_UTILS} components={customComponents} />
      </div>
      <ChatDrawer />
    </div>
  );
}
