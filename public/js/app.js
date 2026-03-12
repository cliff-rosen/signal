const tabBar = document.getElementById('tab-bar');
const main = document.getElementById('main');

let devices = [];
let activeTab = 'home';
let ws = null;
let globalWs = null;
let reconnectDelay = 1000;

// ── Tab bar ──

async function loadDevices() {
  const res = await fetch('/api/devices');
  devices = await res.json();
  renderTabs();
}

function renderTabs() {
  tabBar.innerHTML = '';

  // Signal/Home tab
  const homeTab = document.createElement('button');
  homeTab.className = `tab ${activeTab === 'home' ? 'active' : ''}`;
  homeTab.textContent = 'Signal';
  homeTab.onclick = () => switchTab('home');
  tabBar.appendChild(homeTab);

  // Device tabs
  for (const d of devices) {
    const tab = document.createElement('button');
    tab.className = `tab ${activeTab === d.id ? 'active' : ''}`;
    tab.textContent = d.name;
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
      const contentRes = await fetch(`/api/devices/${d.id}/content`);
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

  main.appendChild(grid);
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
    const res = await fetch(`/api/devices/${deviceId}/content`);
    if (res.ok) {
      const data = await res.json();
      showContent(data);
    }
  } catch {}
}

function connectWS(deviceId) {
  reconnectDelay = 1000;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?device=${deviceId}`);

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
      urlFrame.src = data.body;
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
    await fetch('/api/devices', {
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

// ── Global WebSocket (watches for device/content changes) ──

function connectGlobalWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  globalWs = new WebSocket(`${proto}://${location.host}/ws?device=_global`);

  globalWs.onmessage = async (e) => {
    const msg = JSON.parse(e.data);

    if (msg.event === 'device_created') {
      await loadDevices();
      switchTab(msg.device.id);
    } else if (msg.event === 'device_deleted') {
      const wasActive = activeTab === msg.deviceId;
      await loadDevices();
      if (wasActive) switchTab('home');
      else if (activeTab === 'home') renderHome();
      else renderTabs();
    } else if (msg.event === 'content_updated') {
      switchTab(msg.deviceId);
    } else if (msg.event === 'content_cleared') {
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
