# WebSocket onMessage Handler Analysis

There are three WebSocket consumers in BotBeam, each handling a different subset of events with different branching logic depending on UI state.

---

## 1. Standalone Display Page (`public/js/display.js:34`)

Subscribes to a **single device** channel (`?device={deviceId}`).

| Event     | Action              |
|-----------|---------------------|
| `content` | `renderContent(msg.data)` — replaces the display with new content |
| `clear`   | `showWaiting()` — hides content, shows waiting spinner |

No branching. Two events, two actions.

---

## 2. Legacy Dashboard — Device WS (`public/js/app.js:350`)

Subscribes to a **single device** channel. Created/destroyed each time the user switches tabs via `connectWS(deviceId)`.

| Event     | Action              |
|-----------|---------------------|
| `content` | `showContent(msg.data)` — renders content in the active display view |
| `clear`   | `clearContent()` — hides content, shows waiting state |

Same shape as the standalone display. No branching here either — this WS only exists while a device tab is active.

---

## 3. Legacy Dashboard — Global WS (`public/js/app.js:600` → `handleGlobalMessage` at line 557)

Subscribes to the **`_global`** channel. Lives for the entire session. This is where the complexity is — every event branches on `activeTab` state.

Messages are serialized through a promise queue (`globalMsgQueue`) so async handlers don't interleave.

### `device_created`

| Condition | Behavior |
|-----------|----------|
| activeTab === `'home'` | `loadDevices()` → `renderHome()` (refreshes device grid with new card) |
| activeTab === some device | `loadDevices()` (updates tab bar only, no view change) |

### `device_deleted`

| Condition | Behavior |
|-----------|----------|
| activeTab === deleted device | Close device WS → `loadDevices()` → set activeTab to `'home'` → `renderTabs()` → `renderHome()` (kicked back to home) |
| activeTab === `'home'` | `loadDevices()` → `renderHome()` (refreshes grid to remove the card) |
| activeTab === different device | `loadDevices()` → `renderTabs()` (just updates tab bar, current view untouched) |

### `content_updated`

| Condition | Behavior |
|-----------|----------|
| activeTab === updated device | **No-op.** The device-specific WS (section 2) already handled it. |
| activeTab === `'home'` | `renderHome()` (refreshes preview cards to show new content) |
| activeTab === different device | **No-op.** Not visible anywhere. |

### `content_cleared`

| Condition | Behavior |
|-----------|----------|
| activeTab === cleared device | **No-op.** The device-specific WS (section 2) already handled it. |
| activeTab === `'home'` | `renderHome()` (refreshes preview cards to show empty state) |
| activeTab === different device | **No-op.** Not visible anywhere. |

### Summary: 4 events x 3 tab states = 10 distinct outcomes

| activeTab ↓ \ event → | `device_created` | `device_deleted` | `content_updated` | `content_cleared` |
|---|---|---|---|---|
| **home** | reload devices + re-render home | reload devices + re-render home | re-render home (preview update) | re-render home (preview update) |
| **this device** | reload devices (tab bar only) | close WS, kick to home | no-op (device WS handles it) | no-op (device WS handles it) |
| **other device** | reload devices (tab bar only) | reload devices + re-render tab bar | no-op | no-op |

---

## 4. React App — Global WS (`frontend/src/context/BotBeamContext.tsx:112`)

Subscribes to the **`_global`** channel. No device-specific WS — the React app handles everything through one connection and React state.

| Event | State updates |
|-------|--------------|
| `device_created` | Append device to list (deduped), auto-switch `activeTab` to new device, log |
| `device_deleted` | Remove from `devices`, remove from `contentMap`, if active tab was deleted switch to `'home'`, log |
| `content_updated` | Update `contentMap[deviceId]`, auto-switch `activeTab` to that device, log |
| `content_cleared` | Set `contentMap[deviceId]` to `null`, log |

No explicit branching on `activeTab` here — React re-renders handle the visual consequences. The only conditional is the auto-switch-away on `device_deleted` (`prev === msg.deviceId ? 'home' : prev`).

---

## Key differences between legacy and React

| Aspect | Legacy (`app.js`) | React (`BotBeamContext.tsx`) |
|--------|-------------------|----------------------------|
| WS connections | 2 (global + per-device) | 1 (global only) |
| Content delivery | Device WS pushes content directly to active display | Global WS updates `contentMap`, React re-renders |
| Tab auto-switch | No — stays on current tab | Yes — `content_updated` and `device_created` auto-switch to the affected device |
| No-op optimization | Skips work when event is for a non-visible device | None needed — React only re-renders what changed |
| Async serialization | Promise queue to prevent interleaving | React batches state updates automatically |
