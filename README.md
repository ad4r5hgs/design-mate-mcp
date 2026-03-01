# tldraw-mcp

Minimal MCP server for AI-driven canvas manipulation with [tldraw](https://tldraw.dev).

## Architecture

```
┌─────────────┐     stdio      ┌─────────────┐    WebSocket    ┌─────────────┐
│  AI Client  │◄──────────────►│  tldraw-mcp │◄───────────────►│   Widget    │
│ (Claude,etc)│                │   (server)  │   :4000         │  (tldraw)   │
└─────────────┘                └─────────────┘                 └─────────────┘
                                                                    :3000
```

## Tools

| Tool | Description |
|------|-------------|
| `create_shape` | Create shapes (rectangle, ellipse, star, cloud, diamond, etc.) |
| `update_shape` | Update shape properties (position, size, color, fill) |
| `delete_shapes` | Delete shapes by ID |
| `connect_shapes` | Connect two shapes with an arrow |
| `create_frame` | Create a frame to group shapes together |
| `create_flowchart` | Create a flowchart with nodes and edges (auto-layout) |
| `get_snapshot` | Get current canvas state |
| `zoom_to_fit` | Zoom canvas to fit all shapes |
| `clear_canvas` | Clear all shapes |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/dpunj/tldraw-mcp
cd tldraw-mcp
bun install

# 2. Start the widget (tldraw canvas + WebSocket server)
cd widget
bun install
bun run dev
# Opens http://localhost:3000 (canvas) + ws://localhost:4000 (relay)

# 3. In another terminal, test the MCP server
cd ..
bun run dev
```

## Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tldraw": {
      "command": "bun",
      "args": ["run", "/path/to/tldraw-mcp/src/index.ts"]
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TLDRAW_WS_URL` | `ws://localhost:4000` | Widget WebSocket URL |
| `WS_PORT` | `4000` | Widget WS server port |

## Development

```bash
# MCP server
bun run dev      # Run server
bun run build    # Build for distribution
bun run check    # TypeScript check

# Widget
cd widget
bun run dev      # Start vite + WS server
```

## License

MIT
