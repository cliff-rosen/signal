const tabBar = document.getElementById('tab-bar');
const main = document.getElementById('main');

// Extract namespace from URL: /s/a7f3x9k2
const namespace = window.location.pathname.split('/')[2];
const API_BASE = `/s/${namespace}/api`;

let devices = [];
let activeTab = 'home';
let ws = null;
let globalWs = null;
let reconnectDelay = 1000;

// ── Tab bar ──

async function loadDevices() {
  const res = await fetch(`${API_BASE}/devices`);
  devices = await res.json();
  renderTabs();
}

function renderTabs() {
  tabBar.innerHTML = '';

  // Back to landing
  const backLink = document.createElement('a');
  backLink.className = 'back-link';
  backLink.href = '/';
  backLink.textContent = 'BotBeam';
  tabBar.appendChild(backLink);

  // Home tab
  const homeTab = document.createElement('button');
  homeTab.className = `tab ${activeTab === 'home' ? 'active' : ''}`;
  homeTab.textContent = 'Home';
  homeTab.onclick = () => switchTab('home');
  tabBar.appendChild(homeTab);

  // Device tabs
  for (const d of devices) {
    const tab = document.createElement('button');
    tab.className = `tab ${activeTab === d.id ? 'active' : ''}`;

    const label = document.createElement('span');
    label.textContent = d.name;
    tab.appendChild(label);

    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '\u00d7';
    close.title = 'Delete tab';
    close.onclick = (e) => {
      e.stopPropagation();
      confirmDeleteDevice(d);
    };
    tab.appendChild(close);

    tab.onclick = () => switchTab(d.id);
    tabBar.appendChild(tab);
  }

  // Add button
  const addTab = document.createElement('button');
  addTab.className = 'tab tab-add';
  addTab.textContent = '+';
  addTab.onclick = showModal;
  tabBar.appendChild(addTab);
}

function switchTab(id) {
  activeTab = id;
  renderTabs();
  if (ws) { ws.close(); ws = null; }

  if (id === 'home') {
    renderHome();
  } else {
    renderDisplay(id);
  }
}

// ── Home view ──

async function renderHome() {
  main.innerHTML = '';
  main.className = 'main home-view';

  const homeContent = document.createElement('div');
  homeContent.className = 'home-content';

  // Bookmark reminder
  const bookmarkBanner = document.createElement('div');
  bookmarkBanner.className = 'bookmark-banner';
  bookmarkBanner.id = 'bookmark-banner';
  const dismissed = localStorage.getItem(`botbeam-bookmark-${namespace}`);
  if (!dismissed) {
    bookmarkBanner.innerHTML = `
      <div class="bookmark-icon">&#x1f516;</div>
      <div class="bookmark-text">
        <strong>Bookmark this page!</strong> This URL is your BotBeam — it's how you get back to your displays. There's no login, so if you lose this link, you lose access.
      </div>
      <button class="btn btn-ghost bookmark-dismiss" id="bookmark-dismiss">Got it</button>
    `;
    homeContent.appendChild(bookmarkBanner);
  }

  // MCP endpoint banner
  const mcpUrl = `${location.origin}/s/${namespace}/mcp`;
  const banner = document.createElement('div');
  banner.className = 'endpoint-banner';
  banner.innerHTML = `
    <div class="endpoint-label">Your MCP Endpoint</div>
    <div class="endpoint-row">
      <code class="endpoint-url" id="mcp-url">${mcpUrl}</code>
      <button class="btn btn-primary btn-copy" id="copy-btn">Copy</button>
    </div>
  `;
  homeContent.appendChild(banner);

  // Setup instructions
  const setup = document.createElement('div');
  setup.className = 'setup-instructions';
  setup.innerHTML = `
    <div class="setup-heading">Connect your AI</div>
    <p class="setup-intro">Copy the MCP endpoint above, then add it as a connector in ChatGPT or Claude. Once connected, just tell your AI what to show and which tab to put it in — it handles the rest.</p>
    <div class="setup-tabs">
      <button class="setup-tab active" data-target="chatgpt">ChatGPT</button>
      <button class="setup-tab" data-target="claude">Claude</button>
      <button class="setup-tab" data-target="claude-code">Claude Code</button>
    </div>
    <div class="setup-panel" id="setup-chatgpt">
      <ol class="setup-steps">
        <li>Open <strong>ChatGPT</strong> and start a new chat</li>
        <li>Click the <strong>tools icon</strong> (hammer) in the message bar, then <strong>"Add more tools"</strong></li>
        <li>Select <strong>"Add MCP server"</strong></li>
        <li>Paste your MCP endpoint URL and give it a name (e.g. "BotBeam")</li>
        <li>When asked about authentication, select <strong>"None"</strong></li>
      </ol>
      <div class="setup-note">No authentication is needed — your namespace URL is your access key. Anyone with the link can push to your displays, but each namespace is isolated and URLs are unguessable.</div>
    </div>
    <div class="setup-panel" id="setup-claude" style="display:none">
      <ol class="setup-steps">
        <li>Open <a href="https://claude.ai" target="_blank">claude.ai</a> and go to <strong>Settings</strong></li>
        <li>Navigate to <strong>Integrations</strong></li>
        <li>Click <strong>"Add integration"</strong> and select <strong>MCP</strong></li>
        <li>Paste your MCP endpoint URL and give it a name (e.g. "BotBeam")</li>
        <li>When asked about authentication, select <strong>"None"</strong></li>
      </ol>
      <div class="setup-note">No authentication is needed — your namespace URL is your access key. Anyone with the link can push to your displays, but each namespace is isolated and URLs are unguessable.</div>
    </div>
    <div class="setup-panel" id="setup-claude-code" style="display:none">
      <ol class="setup-steps">
        <li>Open your project directory in a terminal</li>
        <li>Add this to <strong>.claude/mcp.json</strong> in your project (create the file if needed):</li>
      </ol>
      <pre class="setup-codeblock"><code id="claude-code-config">{
  "mcpServers": {
    "botbeam": {
      "type": "url",
      "url": "${mcpUrl}"
    }
  }
}</code></pre>
      <button class="btn btn-primary btn-copy btn-copy-config" id="copy-config-btn">Copy config</button>
      <ol class="setup-steps" start="3">
        <li>Restart Claude Code. It will pick up the MCP server automatically.</li>
      </ol>
    </div>
    <div class="setup-try">
      <div class="setup-try-heading">Try it out</div>
      <p>Once connected, try starting a conversation like this:</p>
      <div class="setup-prompts">
        <div class="setup-prompt-example">"I want to learn about X. List the key topics and beam them to me, then we'll go through each one."</div>
        <div class="setup-prompt-example">"Help me prep for my interview — give me a topic list, then a cheat sheet tab for each as we discuss them."</div>
        <div class="setup-prompt-example">"Research these 5 companies and create a tab for each with a summary."</div>
      </div>
      <p class="setup-try-hint">As you talk, your AI builds out tabs — each topic becomes its own reference card. By the end you have a complete, personalized workspace.</p>
    </div>
  `;
  homeContent.appendChild(setup);

  const grid = document.createElement('div');
  grid.className = 'device-grid';

  for (const d of devices) {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.onclick = () => switchTab(d.id);

    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `<div class="name">${d.name}</div>`;

    const preview = document.createElement('div');
    preview.className = 'card-preview';

    try {
      const contentRes = await fetch(`${API_BASE}/devices/${d.id}/content`);
      if (contentRes.ok) {
        const data = await contentRes.json();
        header.innerHTML += `<div class="status has-content">Live</div>`;
        renderPreview(preview, data);
      } else {
        header.innerHTML += `<div class="status">Empty</div>`;
        preview.innerHTML = `<div class="preview-empty"><span class="pulse"></span>Waiting for content</div>`;
      }
    } catch {
      header.innerHTML += `<div class="status">Empty</div>`;
      preview.innerHTML = `<div class="preview-empty"><span class="pulse"></span>Waiting for content</div>`;
    }

    card.appendChild(header);
    card.appendChild(preview);
    grid.appendChild(card);
  }

  homeContent.appendChild(grid);
  main.appendChild(homeContent);

  // Copy button handlers
  document.getElementById('copy-btn').onclick = () => {
    navigator.clipboard.writeText(mcpUrl).then(() => {
      const btn = document.getElementById('copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    });
  };

  document.getElementById('copy-config-btn').onclick = () => {
    const config = document.getElementById('claude-code-config').textContent;
    navigator.clipboard.writeText(config).then(() => {
      const btn = document.getElementById('copy-config-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy config', 2000);
    });
  };

  // Bookmark dismiss handler
  const dismissBtn = document.getElementById('bookmark-dismiss');
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      localStorage.setItem(`botbeam-bookmark-${namespace}`, '1');
      document.getElementById('bookmark-banner').remove();
    };
  }

  // Setup tab switching
  document.querySelectorAll('.setup-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.setup-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('setup-' + tab.dataset.target).style.display = '';
    };
  });
}

function renderPreview(el, data) {
  switch (data.type) {
    case 'text':
      el.innerHTML = `<div class="preview-text">${escapeHtml(data.body)}</div>`;
      break;
    case 'markdown':
      el.innerHTML = `<div class="preview-markdown">${marked.parse(data.body)}</div>`;
      break;
    case 'html':
      el.innerHTML = `<div class="preview-text" style="color:var(--text-muted)">HTML content</div>`;
      break;
    case 'url':
      el.innerHTML = `<div class="preview-url"><div class="preview-url-icon">&#x1f310;</div><div class="preview-url-text">${escapeHtml(data.body)}</div></div>`;
      break;
    case 'image':
      el.innerHTML = `<img class="preview-image" src="${escapeHtml(data.body)}" alt="preview">`;
      break;
    case 'list': {
      const items = JSON.parse(data.body);
      const html = items.slice(0, 5).map(item => {
        const text = typeof item === 'object' ? item.text : item;
        const checked = typeof item === 'object' && item.checked;
        return `<div class="preview-list-item ${checked ? 'checked' : ''}"><div class="check"></div><span>${escapeHtml(text)}</span></div>`;
      }).join('');
      el.innerHTML = html + (items.length > 5 ? `<div class="preview-more">+${items.length - 5} more</div>` : '');
      break;
    }
    case 'dashboard': {
      const cards = JSON.parse(data.body);
      el.innerHTML = `<div class="preview-dashboard">${cards.slice(0, 4).map(c =>
        `<div class="preview-dash-card"><div class="title">${c.title}</div><div class="value">${c.value}</div></div>`
      ).join('')}</div>`;
      break;
    }
    default:
      el.innerHTML = `<div class="preview-text">${escapeHtml(data.body)}</div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Display view ──

function renderDisplay(deviceId) {
  main.innerHTML = '';
  main.className = 'main display-view';

  const waiting = document.createElement('div');
  waiting.className = 'waiting';
  waiting.id = 'waiting';
  const device = devices.find(d => d.id === deviceId);
  waiting.innerHTML = `
    <div class="device-name">${device ? device.name : deviceId}</div>
    <p><span class="pulse"></span>Waiting for content...</p>
  `;

  const content = document.createElement('div');
  content.className = 'content';
  content.id = 'content';
  content.style.display = 'none';

  main.appendChild(waiting);
  main.appendChild(content);

  // Fetch current content
  fetchContent(deviceId);
  connectWS(deviceId);
}

async function fetchContent(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/content`);
    if (res.ok) {
      const data = await res.json();
      showContent(data);
    }
  } catch {}
}

function connectWS(deviceId) {
  reconnectDelay = 1000;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?namespace=${namespace}&device=${deviceId}`);

  ws.onopen = () => { reconnectDelay = 1000; };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.event === 'content') {
      showContent(msg.data);
    } else if (msg.event === 'clear') {
      clearContent();
    }
  };

  ws.onclose = () => {
    if (activeTab === deviceId) {
      setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 10000);
        if (activeTab === deviceId) connectWS(deviceId);
      }, reconnectDelay);
    }
  };
}

function showContent(data) {
  const waiting = document.getElementById('waiting');
  const content = document.getElementById('content');
  if (!waiting || !content) return;

  waiting.style.display = 'none';
  content.style.display = 'block';
  content.className = 'content';

  switch (data.type) {
    case 'text':
      content.className += ' content-text';
      content.textContent = data.body;
      break;

    case 'markdown':
      content.className += ' content-markdown';
      content.innerHTML = marked.parse(data.body);
      break;

    case 'html':
      content.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.className = 'content-html';
      iframe.sandbox = 'allow-scripts';
      iframe.srcdoc = data.body;
      content.appendChild(iframe);
      break;

    case 'url': {
      content.innerHTML = '';
      const urlFrame = document.createElement('iframe');
      urlFrame.className = 'content-url';
      urlFrame.src = `${API_BASE}/proxy?url=${encodeURIComponent(data.body)}`;
      urlFrame.setAttribute('allowfullscreen', '');
      content.appendChild(urlFrame);
      break;
    }

    case 'image': {
      content.innerHTML = '';
      content.className += ' content-image-wrap';
      const img = document.createElement('img');
      img.className = 'content-image';
      img.src = data.body;
      img.alt = 'Signal display';
      content.appendChild(img);
      break;
    }

    case 'list': {
      content.innerHTML = '';
      const items = JSON.parse(data.body);
      const ul = document.createElement('ul');
      ul.className = 'content-list';
      for (const item of items) {
        const li = document.createElement('li');
        if (typeof item === 'object') {
          if (item.checked) li.className = 'checked';
          li.innerHTML = `<div class="check"></div><span>${item.text}</span>`;
        } else {
          li.innerHTML = `<div class="check"></div><span>${item}</span>`;
        }
        ul.appendChild(li);
      }
      content.appendChild(ul);
      break;
    }

    case 'dashboard': {
      content.innerHTML = '';
      const cards = JSON.parse(data.body);
      const grid = document.createElement('div');
      grid.className = 'content-dashboard';
      for (const card of cards) {
        const div = document.createElement('div');
        div.className = 'dash-card';
        div.innerHTML = `
          <div class="title">${card.title}</div>
          <div class="value">${card.value}</div>
          ${card.subtitle ? `<div class="subtitle">${card.subtitle}</div>` : ''}
        `;
        grid.appendChild(div);
      }
      content.appendChild(grid);
      break;
    }

    default:
      content.className += ' content-text';
      content.textContent = data.body;
  }
}

function clearContent() {
  const waiting = document.getElementById('waiting');
  const content = document.getElementById('content');
  if (!waiting || !content) return;
  waiting.style.display = '';
  content.style.display = 'none';
  content.innerHTML = '';
}

// ── Add device modal ──

function showModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>New Device</h2>
      <input type="text" id="device-input" placeholder="Device name (e.g. kitchen)" autofocus>
      <div class="actions">
        <button class="btn btn-ghost" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="create-btn">Create</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById('device-input');
  const cancel = document.getElementById('cancel-btn');
  const create = document.getElementById('create-btn');

  cancel.onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  async function doCreate() {
    const name = input.value.trim();
    if (!name) return;
    await fetch(`${API_BASE}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    overlay.remove();
    await loadDevices();
    switchTab(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }

  create.onclick = doCreate;
  input.onkeydown = (e) => { if (e.key === 'Enter') doCreate(); };
}

// ── Delete device confirmation ──

function confirmDeleteDevice(device) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Delete "${device.name}"?</h2>
      <p style="color:var(--text-muted);margin:0 0 20px">This will remove the tab and its content. This can't be undone.</p>
      <div class="actions">
        <button class="btn btn-ghost" id="cancel-delete-btn">Cancel</button>
        <button class="btn btn-danger" id="confirm-delete-btn">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('cancel-delete-btn').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  document.getElementById('confirm-delete-btn').onclick = async () => {
    overlay.remove();
    // Optimistically update UI before the API call
    const wasActive = activeTab === device.id;
    if (wasActive && ws) { ws.close(); ws = null; }
    devices = devices.filter(d => d.id !== device.id);
    if (wasActive) {
      activeTab = 'home';
      renderTabs();
      renderHome();
    } else {
      renderTabs();
      if (activeTab === 'home') renderHome();
    }
    // Fire the API call — the WS event will arrive but devices list is already updated
    await fetch(`${API_BASE}/devices/${device.id}`, { method: 'DELETE' });
  };
}

// ── Global WebSocket (watches for device/content changes) ──

function connectGlobalWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  globalWs = new WebSocket(`${proto}://${location.host}/ws?namespace=${namespace}&device=_global`);

  globalWs.onmessage = async (e) => {
    const msg = JSON.parse(e.data);

    if (msg.event === 'device_created') {
      // Add the tab without disrupting the user's current view
      await loadDevices();
      // Only switch if user is on home (they're not busy with another tab)
      if (activeTab === 'home') renderHome();

    } else if (msg.event === 'device_deleted') {
      const wasActive = activeTab === msg.deviceId;
      // Close the per-device WS if we're on the deleted tab
      if (wasActive && ws) { ws.close(); ws = null; }
      await loadDevices();
      if (wasActive) {
        activeTab = 'home';
        renderTabs();
        renderHome();
      } else if (activeTab === 'home') {
        renderHome();
      } else {
        renderTabs();
      }

    } else if (msg.event === 'content_updated') {
      // If we're on the target tab, the per-device WS handles it — skip
      if (activeTab === msg.deviceId) return;
      // If we're on home, refresh the card previews
      if (activeTab === 'home') {
        renderHome();
      }
      // Don't force-switch the user to a different tab

    } else if (msg.event === 'content_cleared') {
      // If we're on the cleared tab, the per-device WS handles it — skip
      if (activeTab === msg.deviceId) return;
      if (activeTab === 'home') renderHome();
    }
  };

  globalWs.onclose = () => {
    setTimeout(connectGlobalWS, 2000);
  };
}

// ── Init ──

loadDevices().then(() => renderHome());
connectGlobalWS();
