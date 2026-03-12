# Signal — Architecture Overview

AI-Powered Virtual Display Platform

---

## System Overview

Signal is a software platform that turns browser tabs into virtual ambient displays that Claude Code (or any MCP-compatible AI) can push content to in real-time. Instead of physical hardware, each "device" is a browser window showing live-updating content.

The system consists of two processes and any number of browser-based display endpoints.

## Architecture Diagram

```
┌─────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│  Claude Code     │  stdio  │  MCP Server           │  HTTP   │  Signal Server    │
│  (AI assistant)  ├────────►│  mcp/index.js         ├────────►│  server/index.js  │
│                  │         │  5 tools registered   │  :4888  │  Express + WS     │
└─────────────────┘         └──────────────────────┘         └──────┬───────────┘
                                                                     │
                                                          ┌──────────┼──────────┐
                                                          │ WebSocket broadcast  │
                                                          ▼          ▼          ▼
                                                     ┌────────┐ ┌────────┐ ┌────────┐
                                                     │Browser │ │Browser │ │Browser │
                                                     │Tab 1   │ │Tab 2   │ │Tab 3   │
                                                     │/display │ │/display│ │/display│
                                                     │/dashboard│/kitchen│ │/office │
                                                     └────────┘ └────────┘ └────────┘
```

## The Two Processes

### Process 1: Signal Server (`npm start` / `server/index.js`)

The persistent web server running on port 4888. It does four things:

1. **Serves the browser UI** — static HTML/CSS/JS files from `public/`, including the landing page dashboard and individual display pages.

2. **REST API at `/api/devices`** — full CRUD for device management (create, list, delete) and content management (push, get, clear). All state is stored as JSON files in `data/`. No database required.

3. **WebSocket server** on the same port — browser tabs connect via `ws://localhost:4888/ws?device=NAME`. The server tracks connections per device using a `Map<deviceId, Set<WebSocket>>`.

4. **Real-time broadcast** — when content is pushed via the API, the server immediately broadcasts to all WebSocket clients subscribed to that device. Displays update instantly.

### Process 2: MCP Server (`mcp/index.js`)

A lightweight bridge process that Claude Code spawns as a child process over stdio. It registers five tools:

| Tool | Description |
|------|-------------|
| `create_device` | Register a new named virtual display |
| `list_devices` | Return all registered devices |
| `push_content` | Send content to a named display |
| `clear_device` | Clear a display's content |
| `delete_device` | Remove a display entirely |

When Claude Code calls a tool, the MCP server translates it into an HTTP request to `localhost:4888` via `mcp/client.js`. It is completely stateless — just a protocol bridge.

### Why Two Processes?

Claude Code communicates with MCP servers over **stdio** (stdin/stdout). A process doing stdio cannot simultaneously be a web server listening on a port. Separating them means:

- The web server runs persistently, independent of Claude Code sessions
- The MCP server is ephemeral, started/stopped by Claude Code automatically
- Either can be restarted independently
- Multiple Claude Code sessions can push to the same displays

## The Push Flow

When a user says "show the weather on the dashboard":

```
1. Claude Code receives the user's request
2. Claude Code gathers the needed data (e.g., fetches weather from an API)
3. Claude Code calls push_content MCP tool
       { device: "dashboard", type: "markdown", body: "# Castle Rock..." }
4. MCP server POSTs to http://localhost:4888/api/devices/dashboard/content
5. server/routes.js writes to data/content/dashboard.json
6. server/websocket.js broadcasts to all WebSocket clients watching "dashboard"
7. Browser tab receives the WebSocket message
8. display.js renders the content based on type
```

The entire flow from tool call to screen update takes milliseconds.

## Content Types

The display renderer (`public/js/display.js`) supports five content types:

| Type | Body format | Use case |
|------|-------------|----------|
| **text** | Plain string | Simple messages, notifications |
| **markdown** | Markdown string (rendered via marked.js) | Rich info display — headings, tables, lists, code |
| **html** | HTML string (sandboxed in iframe) | Custom visualizations |
| **list** | JSON array of strings or `{text, checked}` objects | To-do lists, grocery lists, chore boards |
| **dashboard** | JSON array of `{title, value, subtitle?}` objects | KPIs, stats, at-a-glance metrics |

## File Structure

```
signal/
  package.json              — Dependencies: express, ws, @modelcontextprotocol/sdk
  .gitignore                — Excludes node_modules/ and data/

  server/
    index.js                — Main entry: Express + WebSocket + static files
    store.js                — JSON file storage layer (devices + content)
    routes.js               — REST API route definitions
    websocket.js            — WebSocket connection tracking + broadcast

  mcp/
    index.js                — MCP server entry point (stdio transport)
    client.js               — HTTP client for calling the Signal server API

  public/
    index.html              — Landing page (device grid)
    display.html            — Single display viewer
    css/style.css           — Dark ambient theme
    js/dashboard.js         — Landing page logic
    js/display.js           — WebSocket client + multi-format renderer

  data/                     — Created at runtime, gitignored
    devices.json            — Device registry
    content/                — One JSON file per device with current content

  .claude/
    mcp.json                — MCP server configuration for Claude Code
```

## Storage

All state is flat JSON files in `data/`:

- **`devices.json`** — Array of `{id, name, createdAt}`. Device IDs are slugified from names (e.g., "Kitchen Display" → "kitchen-display").
- **`content/{device-id}.json`** — Current content: `{type, body, updatedAt}`. Pushing new content replaces the old.

No database setup, directly inspectable, perfectly adequate for a local tool.

## Browser UI

Vanilla HTML/CSS/JS, no build step.

**Landing page** (`localhost:4888`) — Grid of registered devices with status. "Add Device" button opens a modal. Each card links to its display page.

**Display page** (`localhost:4888/display/{name}`) — Full-viewport ambient display. WebSocket for real-time updates. REST fallback on load. Auto-reconnection with exponential backoff. Dark theme (#0a0a0a background, #4fc3f7 accent) with smooth fade-in transitions.

## Claude Code Integration

MCP configuration in `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "signal": {
      "command": "node",
      "args": ["C:\\code\\signal\\mcp\\index.js"],
      "env": {
        "SIGNAL_SERVER_URL": "http://localhost:4888"
      }
    }
  }
}
```

When Claude Code starts in the signal project directory, it automatically launches the MCP server and makes the five tools available. The user simply describes what they want shown and where.
