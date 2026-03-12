# WebSocket onMessage Handler Analysis

Two WebSocket consumers in BotBeam, each handling a different subset of events.

---

## 1. Standalone Display Page (`public/js/display.js`)

Subscribes to a **single device** channel (`?device={deviceId}`).

| Event     | Action              |
|-----------|---------------------|
| `content` | `renderContent(msg.data)` — replaces the display with new content |
| `clear`   | `showWaiting()` — hides content, shows waiting spinner |

No branching. Two events, two actions.

---

## 2. React App — Global WS (`frontend/src/context/BotBeamContext.tsx`)

Subscribes to the **`_global`** channel. Single WebSocket for the entire session. All state lives in Context — components just render.

| Event | State updates |
|-------|--------------|
| `device_created` | Append device to list (deduped), switch `activeTab` to new device |
| `device_deleted` | Remove from `devices` and `contentMap`, switch to `home` if active tab was deleted |
| `content_updated` | Update `contentMap[deviceId]`, switch `activeTab` to that device |
| `content_cleared` | Set `contentMap[deviceId]` to `null` |

No branching on `activeTab` — React re-renders handle the visual consequences. Actions (`addDevice`, `removeDevice`) just call the API; the WebSocket handler is the single source of truth for all state mutations.
