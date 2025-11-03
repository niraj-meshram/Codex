// Simple, universal remote CLI UI
// - Shows connected Wi-Fi
// - Scan for TVs (SSDP auto + optional config)
// - Connect to a TV (handles pairing if needed)
// - Send common commands

const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  CommandDispatcher,
  SamsungTizenAutoAdapter,
  SamsungTizenTransportAdapter,
  WifiTransportAdapter,
  ConnectorManager,
  CommandLayer,
} = require('../dist/index.js');

function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 3000, windowsHide: true, ...options }, (err, stdout) => {
      if (err) return reject(err);
      resolve(String(stdout || ''));
    });
  });
}

async function detectSsid() {
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      try {
        const out = await execPromise('netsh wlan show interfaces');
        const lines = out.split(/\r?\n/);
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('SSID') && !t.startsWith('BSSID')) {
            const parts = t.split(':');
            if (parts.length >= 2) return parts.slice(1).join(':').trim();
          }
        }
      } catch {}
      try {
        const out2 = await execPromise("powershell -NoProfile -Command \"(Get-NetConnectionProfile | Where-Object {$_.IPv4Connectivity -ne 'Disconnected'} | Where-Object {$_.InterfaceAlias -match 'Wi-Fi|WLAN'} | Select-Object -First 1 -ExpandProperty Name)\"");
        const name = out2.trim();
        if (name) return name;
      } catch {}
    } else if (platform === 'darwin') {
      try {
        const out = await execPromise('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');
        const m = out.match(/\n\s*SSID:\s*(.+)\n/i);
        if (m) return m[1].trim();
      } catch {}
      const out2 = await execPromise('networksetup -getairportnetwork en0');
      const m2 = out2.match(/Current Wi-Fi Network: (.+)/i);
      if (m2) return m2[1].trim();
    } else {
      try {
        const out = await execPromise('iwgetid -r');
        const ssid = out.trim();
        if (ssid) return ssid;
      } catch {}
      const out2 = await execPromise('nmcli -t -f active,ssid dev wifi');
      const line = out2.split(/\r?\n/).find((l) => l.startsWith('yes:'));
      if (line) return line.split(':').slice(1).join(':');
    }
  } catch {}
  return 'Unknown';
}

function loadWifiConfig() {
  try {
    const p = path.resolve(__dirname, '..', 'config', 'wifi.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function buildDispatcher() {
  const transports = [];
  try {
    transports.push(new SamsungTizenAutoAdapter(['powerOn','powerOff','powerToggle','volumeUp','volumeDown','mute','home','back','left','right','up','down','select','*']));
  } catch {}
  const cfg = loadWifiConfig();
  if (cfg && Array.isArray(cfg.devices) && cfg.devices.length) {
    try { transports.push(new SamsungTizenTransportAdapter(cfg.devices.filter(d=>String(d.vendor||'').toLowerCase()==='samsung-tizen'), ['*'])); } catch {}
    try {
      const registryFn = WifiTransportAdapter.createInMemoryRegistry(cfg.devices);
      const http = cfg.controllerBaseUrl ? WifiTransportAdapter.createHttpClient(cfg.controllerBaseUrl) : {
        async post(url, payload) {
          const m = String(url).match(/\/devices\/([^/]+)\/commands/);
          const id = m && m[1];
          const entry = cfg.devices.find((d)=>d.id===id);
          if (!entry) throw new Error('unknown device');
          const base = `http://${entry.ip}:${entry.port}`;
          const axios = require('axios');
          return axios.post(`${base}/devices/${id}/commands`, payload, { timeout: 2500 });
        }
      };
      transports.push(new WifiTransportAdapter(http, registryFn, cfg.supportedCommands || ['*']));
    } catch {}
  }
  return new CommandDispatcher(transports, { powerOn:{protocols:['wifi','bluetooth','ir']}, powerOff:{protocols:['wifi','bluetooth','ir']} });
}

function printHeader(ssid, connectedName) {
  console.log('MyTvRemote - Universal Remote');
  console.log('------------------------------------------------------------');
  console.log(`Wi-Fi: ${ssid} | Connected: ${connectedName || 'None'}`);
  console.log('------------------------------------------------------------');
}

function printMenu(devices) {
  console.log('[S] Scan TVs    [C] Change Wi-Fi    [Q] Quit');
  if (devices && devices.length) {
    console.log('Devices:');
    devices.forEach((d, i) => {
      const vendor = (d.metadata && d.metadata.vendor) ? ` (${d.metadata.vendor})` : '';
      console.log(` ${i+1}) ${d.name}${vendor} [${d.protocol}]`);
    });
    console.log('[1..N] Connect  [P] Power  [+]/[-] Volume  [H] Home  [B] Back');
  }
}

async function main() {
  const dispatcher = await buildDispatcher();
  const connector = new ConnectorManager();
  const commander = new CommandLayer(dispatcher);

  let ssid = await detectSsid();
  let devices = [];
  let connected = null; // DiscoveryResult

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  async function render() {
    console.clear();
    printHeader(ssid, connected ? connected.name : null);
    printMenu(devices);
  }

  async function scan() {
    try { devices = await dispatcher.discover(); } catch { devices = []; }
  }

  async function changeWifi() {
    console.log('Available Wi-Fi networks:');
    try {
      const out = await execPromise('netsh wlan show networks');
      console.log(out);
    } catch {
      console.log('Open your OS Wi-Fi menu to change networks.');
    }
    await question('Switch Wi-Fi via OS now, then press Enter...');
    ssid = await detectSsid();
  }

  async function connectByIndex(idx) {
    if (!devices[idx]) return console.log('Invalid selection');
    const dev = devices[idx];
    const res = await connector.connect(dev);
    if (res.ok) {
      connected = dev;
      console.log('Connected.');
    } else if (res.requiresAuth) {
      console.log('Please approve pairing on the TV, then press Enter to retry.');
      await question('Press Enter to retry connect...');
      const retry = await connector.connect(dev);
      if (retry.ok) { connected = dev; console.log('Connected.'); } else { console.log('Connect failed:', retry.message || 'unknown'); }
    } else {
      console.log('Connect failed:', res.message || 'unknown');
    }
  }

  async function send(cmd) {
    if (!connected) { console.log('No device connected.'); return; }
    try { await commander.send(connected, cmd); console.log('OK'); } catch (e) { console.log('Error:', e.message || e); }
  }

  function question(q) { return new Promise((res)=> rl.question(q, ()=>res())); }

  await scan();
  await render();

  rl.on('line', async (line) => {
    const input = line.trim().toLowerCase();
    if (!input) return render();
    if (input === 'q') { rl.close(); return; }
    if (input === 's') { await scan(); return render(); }
    if (input === 'c') { await changeWifi(); await scan(); return render(); }
    if (input === 'p') { await send('powerToggle'); return render(); }
    if (input === '+') { await send('volumeUp'); return render(); }
    if (input === '-') { await send('volumeDown'); return render(); }
    if (input === 'h') { await send('home'); return render(); }
    if (input === 'b') { await send('back'); return render(); }
    const n = parseInt(input, 10);
    if (!isNaN(n) && n >= 1 && n <= devices.length) { await connectByIndex(n-1); return render(); }
    console.log('Unknown command. Use S (scan), C (Wi-Fi), 1..N (connect), P/+/-/H/B, Q.');
    return render();
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

