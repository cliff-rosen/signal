# WebSocket onMessage Handler Analysis

One WebSocket consumer: the React app's global connection in `BotBeamContext.tsx`.

Subscribes to the **`_global`** channel. Single WebSocket for the entire session. All state lives in Context — components just render.

| Event | State updates |
|-------|--------------|
| `device_created` | Append device to list (deduped), switch `activeTab` to new device |
| `device_deleted` | Remove from `devices` and `contentMap`, switch to `home` if active tab was deleted |
| `content_updated` | Update `contentMap[deviceId]`, switch `activeTab` to that device |
| `content_cleared` | Set `contentMap[deviceId]` to `null` |

No branching on `activeTab` — React re-renders handle the visual consequences. Actions (`addDevice`, `removeDevice`) just call the API; the WebSocket handler is the single source of truth for all state mutations.
