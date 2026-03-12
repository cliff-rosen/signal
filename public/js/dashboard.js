const grid = document.getElementById('devices');

async function loadDevices() {
  const res = await fetch('/api/devices');
  const devices = await res.json();

  grid.innerHTML = '';

  for (const d of devices) {
    const contentRes = await fetch(`/api/devices/${d.id}/content`);
    const hasContent = contentRes.ok;

    const a = document.createElement('a');
    a.className = 'device-card';
    a.href = `/display/${d.id}`;
    a.innerHTML = `
      <div class="name">${d.name}</div>
      <div class="status ${hasContent ? 'has-content' : ''}">${hasContent ? 'Displaying content' : 'Waiting for content'}</div>
    `;
    grid.appendChild(a);
  }

  const add = document.createElement('div');
  add.className = 'add-device';
  add.textContent = '+ Add Device';
  add.onclick = showModal;
  grid.appendChild(add);
}

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
    loadDevices();
  }

  create.onclick = doCreate;
  input.onkeydown = (e) => { if (e.key === 'Enter') doCreate(); };
}

loadDevices();
