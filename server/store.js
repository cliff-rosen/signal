const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const CONTENT_DIR = path.join(DATA_DIR, 'content');

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function loadDevices() {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveDevices(devices) {
  ensureDirs();
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2));
}

function createDevice(name) {
  const devices = loadDevices();
  const id = slugify(name);
  if (devices.find(d => d.id === id)) {
    return { exists: true, device: devices.find(d => d.id === id) };
  }
  const device = { id, name, createdAt: new Date().toISOString() };
  devices.push(device);
  saveDevices(devices);
  return { exists: false, device };
}

function deleteDevice(id) {
  const devices = loadDevices();
  const idx = devices.findIndex(d => d.id === id);
  if (idx === -1) return false;
  devices.splice(idx, 1);
  saveDevices(devices);
  const contentFile = path.join(CONTENT_DIR, `${id}.json`);
  try { fs.unlinkSync(contentFile); } catch {}
  return true;
}

function loadContent(deviceId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, `${deviceId}.json`), 'utf8'));
  } catch {
    return null;
  }
}

function saveContent(deviceId, content) {
  ensureDirs();
  const data = { ...content, updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(CONTENT_DIR, `${deviceId}.json`), JSON.stringify(data, null, 2));
  return data;
}

function deleteContent(deviceId) {
  try {
    fs.unlinkSync(path.join(CONTENT_DIR, `${deviceId}.json`));
    return true;
  } catch {
    return false;
  }
}

module.exports = { loadDevices, createDevice, deleteDevice, loadContent, saveContent, deleteContent, slugify };
