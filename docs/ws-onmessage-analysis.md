# WebSocket onMessage Handler Analysis

One WebSocket consumer: the React app's global connection in `BotBeamContext.tsx`.

Subscribes to the **`_global`** channel. Single WebSocket for the entire session. All state lives in Context — components just render.

| Event | State updates |
|-------|--------------|
| `device_created` | Append device to list (deduped), switch `activeTab` to new device |
| `device_deleted` | Remove from `devices` and `contentMap`, switch to `home` if active tab was deleted |
| `content_updated` | Update `contentMap[deviceId]`, switch `activeTab` to that device |
| `content_cleared` | Set `contentMap[deviceId]` to `null` |

No explicit branching on `activeTab` — React re-renders handle the visual consequences. Actions (`addDevice`, `removeDevice`) just call the API; the WebSocket handler is the single source of truth for all state mutations.

---

## Combinatorial analysis

Every incoming message hits a combination of **event type**, **current activeTab**, and **current state of the affected device**. Here's every case.

### `device_created`

| activeTab | Device already in list? | What happens |
|---|---|---|
| `home` | no | Device appended, user yanked from home to new device's waiting state |
| `home` | yes (duplicate) | Devices unchanged, still yanked to that device's tab |
| viewing device X | no | Device appended, user yanked off device X to new device |
| viewing device X | yes (duplicate) | Devices unchanged, still yanked away from X |
| viewing *this* device | yes | No-op on devices, activeTab set to same value (no visible change) |

### `device_deleted`

| activeTab | Device had content? | What happens |
|---|---|---|
| viewing deleted device | yes | Device + content removed, kicked to home |
| viewing deleted device | no | Device removed, kicked to home |
| `home` | yes | Device + content removed, card disappears from grid |
| `home` | no | Device removed, card disappears |
| viewing other device | yes | Device + content removed, tab disappears from bar, current view untouched |
| viewing other device | no | Device removed, tab disappears, current view untouched |

### `content_updated`

| activeTab | Device in list? | What happens |
|---|---|---|
| viewing this device | yes | Content updates in place, no tab switch (already there) |
| `home` | yes | Content updated, user yanked from home to device |
| viewing other device | yes | Content updated, user yanked off current device to this one |
| any | **no** | contentMap updated for a device that has no tab — activeTab points to a ghost device |

### `content_cleared`

| activeTab | What happens |
|---|---|
| viewing this device | Content nulled, display flips to waiting state |
| `home` | Content nulled, card preview updates to show empty/spinner |
| viewing other device | Content nulled silently, no visible change until user navigates there |

---

## Edge cases and sequences

**Auto-switch stacking.** Both `device_created` and `content_updated` unconditionally call `setActiveTab`. If an AI pushes content to three devices in rapid succession, the user's view flips three times. During a typical AI session this creates a "follow the action" effect, which is the intended UX — but it means the user can never rest on a tab while the AI is actively pushing.

**Out-of-order delivery.** If `content_updated` arrives before `device_created` (network reordering or server-side race), `contentMap` gets populated for a device that doesn't exist in `devices` yet. `activeTab` switches to an ID with no tab in the TabBar. When `device_created` arrives a moment later it fixes itself — but there's a flash where the UI is in an inconsistent state.

**Delete + update race.** If `device_deleted` and `content_updated` for the same device arrive back-to-back: the delete kicks the user to home, then the update pulls them to a device that's no longer in `devices`. The contentMap has data for a device with no tab.

**Duplicate `device_created`.** The dedup check (`prev.some(d => d.id === msg.device.id)`) prevents double-adding, but `setActiveTab` still fires — so receiving the same create event twice causes a harmless but unnecessary tab switch.
