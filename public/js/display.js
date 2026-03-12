const deviceName = window.location.pathname.split('/display/')[1];
const deviceLabel = document.getElementById('device-name');
const waitingEl = document.getElementById('waiting');
const contentEl = document.getElementById('content');

deviceLabel.textContent = decodeURIComponent(deviceName);
document.title = `Signal — ${decodeURIComponent(deviceName)}`;

// Fetch current content on load
async function fetchCurrent() {
  try {
    const res = await fetch(`/api/devices/${deviceName}/content`);
    if (res.ok) {
      const data = await res.json();
      renderContent(data);
    }
  } catch {}
}

// WebSocket connection with reconnect
let ws;
let reconnectDelay = 1000;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?device=${deviceName}`);

  ws.onopen = () => { reconnectDelay = 1000; };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.event === 'content') {
      renderContent(msg.data);
    } else if (msg.event === 'clear') {
      showWaiting();
    }
  };

  ws.onclose = () => {
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 10000);
      connect();
    }, reconnectDelay);
  };
}

function renderContent(data) {
  waitingEl.style.display = 'none';
  contentEl.style.display = 'block';
  contentEl.className = 'content';

  switch (data.type) {
    case 'text':
      contentEl.className += ' content-text';
      contentEl.textContent = data.body;
      break;

    case 'markdown':
      contentEl.className += ' content-markdown';
      contentEl.innerHTML = marked.parse(data.body);
      break;

    case 'html':
      contentEl.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.className = 'content-html';
      iframe.sandbox = 'allow-scripts';
      iframe.srcdoc = data.body;
      contentEl.appendChild(iframe);
      break;

    case 'url': {
      contentEl.innerHTML = '';
      const urlFrame = document.createElement('iframe');
      urlFrame.className = 'content-url';
      urlFrame.src = data.body;
      urlFrame.setAttribute('allowfullscreen', '');
      contentEl.appendChild(urlFrame);
      break;
    }

    case 'image': {
      contentEl.innerHTML = '';
      contentEl.className += ' content-image-wrap';
      const img = document.createElement('img');
      img.className = 'content-image';
      img.src = data.body;
      img.alt = 'Signal display';
      contentEl.appendChild(img);
      break;
    }

    case 'list': {
      contentEl.innerHTML = '';
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
      contentEl.appendChild(ul);
      break;
    }

    case 'dashboard': {
      contentEl.innerHTML = '';
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
      contentEl.appendChild(grid);
      break;
    }

    default:
      contentEl.className += ' content-text';
      contentEl.textContent = data.body;
  }
}

function showWaiting() {
  waitingEl.style.display = '';
  contentEl.style.display = 'none';
  contentEl.innerHTML = '';
}

fetchCurrent();
connect();
