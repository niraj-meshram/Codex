// Interactive TUI for MyTvRemote
// - Lists discovered devices
// - Lets you connect to one (Enter)
// - Start/Stop via keyboard ([S] powerOn, [P] powerOff)
// - Refresh discovery with [R]
// - Quit with [Q] or Ctrl+C

const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
let GLOBAL_KEYPRESS = null;
const {
  CommandDispatcher,
  IrTransportAdapter,
  BluetoothTransportAdapter,
  WifiTransportAdapter,
  // bring in compiled Samsung adapter at runtime via dist
} = require('../dist/index.js');

function clear() {
  process.stdout.write('\x1Bc');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function loadWifiConfig() {
  const cfgPath = path.resolve(__dirname, '..', 'config', 'wifi.json');
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    events.log.push(`[wifi] failed to parse config: ${e.message || e}`);
    return null;
  }
}

function createWifiAdapterFromConfig(cfg) {
  if (!cfg || !Array.isArray(cfg.devices) || cfg.devices.length === 0) return null;
  const registryFn = WifiTransportAdapter.createInMemoryRegistry(cfg.devices);

  if (cfg.controllerBaseUrl) {
    const http = WifiTransportAdapter.createHttpClient(cfg.controllerBaseUrl);
    return new WifiTransportAdapter(http, registryFn, cfg.supportedCommands || ['powerOn', 'powerOff']);
  }

  // Fallback: dynamic per-device posting using absolute URLs
  const deviceMap = new Map(cfg.devices.map((d) => [d.id, d]));
  const http = {
    async post(url, payload) {
      // url is like /devices/<id>/commands â€” translate to device base
      const m = String(url).match(/\/devices\/([^/]+)\/commands/);
      const id = m && m[1];
      const entry = id && deviceMap.get(id);
      if (!entry) throw new Error(`wifi: unknown device ${id}`);
      const base = `http://${entry.ip}:${entry.port}`;
      // Attempt to POST to a generic endpoint; adjust to your device API if needed
      const finalUrl = `${base}/devices/${id}/commands`;
      return axios.post(finalUrl, payload, { timeout: 2500 });
    },
  };
  return new WifiTransportAdapter(http, registryFn, cfg.supportedCommands || ['powerOn', 'powerOff']);
}

function createSamsungAdapterIfAny(cfg) {
  try {
    const samsungDevices = (cfg.devices || []).filter((d) => String(d.vendor || '').toLowerCase() === 'samsung-tizen')
      .map((d) => ({ id: d.id, name: d.name || 'Samsung TV', ip: d.ip, port: d.port }));
    if (samsungDevices.length === 0) return null;
    // dynamic import from dist to avoid TS coupling in this script
    const { SamsungTizenTransportAdapter } = require('../dist/transports/SamsungTizenTransportAdapter.js');
    return new SamsungTizenTransportAdapter(samsungDevices, ['powerOn', 'powerOff', 'volumeUp', 'volumeDown', 'mute', 'home']);
  } catch (e) {
    events.log.push(`[wifi] samsung adapter load failed: ${(e && e.message) || e}`);
    return null;
  }
}

async function createDispatcher() {
  const ir = new IrTransportAdapter(
    {
      async emit(code) {
        // Simulate IR emitter
        events.log.push(`[IR] emit ${code}`);
      },
    },
    ['powerOn', 'powerOff', '*']
  );

  const btClient = BluetoothTransportAdapter.createMockClient();
  const bt = new BluetoothTransportAdapter(btClient, ['powerOn', 'powerOff']);

  const transports = [];
  const wifiCfg = loadWifiConfig();
  if (wifiCfg) {
    const samsung = createSamsungAdapterIfAny(wifiCfg);
    if (samsung) transports.push(samsung); // prefer vendor adapter first
    const wifi = createWifiAdapterFromConfig(wifiCfg);
    if (wifi) transports.push(wifi);
  }
  transports.push(bt);
  transports.push(ir);

  const dispatcher = new CommandDispatcher(transports, {
    powerOn: { protocols: ['bluetooth', 'wifi', 'ir'] },
    powerOff: { protocols: ['bluetooth', 'wifi', 'ir'] },
  });

  return dispatcher;
}

const events = { log: [] };

async function main() {
  const dispatcher = await createDispatcher();
  let devices = [];
  let selected = 0;
  let connectedId = null;
  let currentSsid = null;
  let keypressHandler = null;
  let wizardShown = false;

  function loadPreferredWifi() {
    try {
      const p = path.resolve(__dirname, '..', 'config', 'wifi-preferences.json');
      if (!fs.existsSync(p)) return null;
      const raw = fs.readFileSync(p, 'utf8');
      const cfg = JSON.parse(raw);
      if (!cfg || !cfg.preferredSsid) return null;
      return cfg;
    } catch (e) {
      events.log.push(`[wifi] failed to read preferences: ${(e && e.message) || e}`);
      return null;
    }
  }

  function execPromise(cmd, options = {}) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: 2000, windowsHide: true, ...options }, (err, stdout, stderr) => {
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
            const trimmed = line.trim();
            if (trimmed.startsWith('SSID') && !trimmed.startsWith('BSSID')) {
              const parts = trimmed.split(':');
              if (parts.length >= 2) {
                return parts.slice(1).join(':').trim();
              }
            }
          }
        } catch { /* fallthrough */ }
        try {
          const out2 = await execPromise('powershell -NoProfile -Command "(Get-NetConnectionProfile | Where-Object {$_.IPv4Connectivity -ne \'Disconnected\'} | Where-Object {$_.InterfaceAlias -match \'Wi-Fi|WLAN\'} | Select-Object -First 1 -ExpandProperty Name)"');
          const name = out2.trim();
          if (name) return name;
        } catch { /* ignore */ }
      } else if (platform === 'darwin') {
        try {
          const out = await execPromise('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');
          const m = out.match(/\n\s*SSID:\s*(.+)\n/i);
          if (m) return m[1].trim();
        } catch { /* fallthrough */ }
        const out2 = await execPromise('networksetup -getairportnetwork en0');
        const m2 = out2.match(/Current Wi-Fi Network: (.+)/i);
        if (m2) return m2[1].trim();
      } else {
        try {
          const out = await execPromise('iwgetid -r');
          const ssid = out.trim();
          if (ssid) return ssid;
        } catch { /* fallthrough */ }
        const out2 = await execPromise("nmcli -t -f active,ssid dev wifi");
        const line = out2.split(/\r?\n/).find(l => l.startsWith('yes:'));
        if (line) return line.split(':').slice(1).join(':');
      }
    } catch (e) {
      events.log.push(`[wifi] ssid detect error ${(e && e.message) || e}`);
    }
    return null;
  }

  dispatcher.on('command:sent', (evt) => {
    events.log.push(`[event] command:sent ${evt.protocol} ${evt.payload.command} -> ${evt.deviceId}`);
    render();
  });
  dispatcher.on('command:unsupported', (evt) => {
    events.log.push(`[event] command:unsupported ${evt.payload.command} -> ${evt.deviceId}`);
    render();
  });

  async function discover() {
    devices = await dispatcher.discover();
    selected = clamp(selected, 0, Math.max(0, devices.length - 1));
    currentSsid = await detectSsid();

    // On first run, guide user through Wi‑Fi selection, then device selection
    const pref = loadPreferredWifi();
    if (!wizardShown && ((pref && pref.preferredSsid && currentSsid !== pref.preferredSsid) || !currentSsid)) {
      wizardShown = true;
      const res = await wifiSetupFlow(true); // allow skip; user chooses network and verifies
      currentSsid = await detectSsid();
      if (res && res.verified) {
        // Refresh discovery and ask which device to connect
        devices = await dispatcher.discover();
        if (devices.length > 0) {
          console.log("Discovered devices:\n");
          devices.forEach((d, i) => {
            const vendor = (d.metadata && d.metadata.vendor) ? ` (${d.metadata.vendor})` : "";
            console.log(`  [${i + 1}] ${d.name}${vendor} [${d.protocol}]`);
          });
          const pick = await promptLine(`Select device [1-${devices.length}] (or Enter to skip): `);
          const n = parseInt(pick, 10);
          if (!isNaN(n) && n >= 1 && n <= devices.length) {
            selected = n - 1;
            connectedId = devices[selected].id;
            events.log.push(`[ui] connected to ${connectedId}`);
          }
        } else {
          events.log.push("[discover] no devices found after Wi‑Fi verification");
        }
      }
    }
  }

  function header() {
    return [
      'MyTvRemote - Interactive Controller',
      ''.padEnd(60, '-'),
      `Connected: ${connectedId ? connectedId : 'None'}`,
      `Wi-Fi: ${currentSsid || 'Unknown'}`,
      ''.padEnd(60, '-')
    ].join('\n');
  }

  function deviceLine(idx, d) {
    const pointer = idx === selected ? '>' : ' ';
    const tag = d.id === connectedId ? ' (connected)' : '';
    return `${pointer} ${d.id}  ${d.name} [${d.protocol}] ${tag}`;
  }

  function help() {
    const hint = connectedId ? '' : ' (Press Enter to connect)';
    return [
      ''.padEnd(60, 'â”€'),
      `Keys: Up/Down select  Enter connect  S start  P stop  V verify  W Wi-Fi setup  R refresh  Q quit`,
      ''.padEnd(60, 'â”€'),
    ].join('\n');
  }

  function getWifiUrls(deviceId) {
    const cfg = loadWifiConfig();
    if (!cfg || !Array.isArray(cfg.devices)) return null;
    const entry = cfg.devices.find((d) => d.id === deviceId);
    if (!entry && !cfg.controllerBaseUrl) return null;
    if (cfg.controllerBaseUrl) {
      const baseUrl = cfg.controllerBaseUrl.replace(/\/$/, '');
      return {
        baseUrl,
        commandUrl: `${baseUrl}/devices/${deviceId}/commands`,
      };
    }
    if (entry) {
      const baseUrl = `http://${entry.ip}:${entry.port}`;
      return {
        baseUrl,
        commandUrl: `${baseUrl}/devices/${deviceId}/commands`,
      };
    }
    return null;
  }

  function render() {
    clear();
    console.log(header());
    if (devices.length === 0) {
      console.log('(no devices found)');
    } else {
      for (let i = 0; i < devices.length; i++) {
        console.log(deviceLine(i, devices[i]));
      }
    }
    console.log('\n' + help());
    const recent = events.log.slice(-8);
    if (recent.length) {
      console.log('Recent:');
      recent.forEach((m) => console.log('  ' + m));
    }
  }

  function connectSelected() {
  if (devices.length === 0) return;
  connectedId = devices[selected].id;
  events.log.push('connecting...');
  try {
    const { ConnectorManager } = require('../dist/index.js');
    const mgr = new ConnectorManager();
    const device = devices[selected];
    (async () => {
      const res = await mgr.connect(device);
      if (res.ok) {
        events.log.push('[ui] connected');
      } else if (res.requiresAuth) {
        events.log.push('[auth] Please accept pairing on TV, then press Enter');
      } else {
        events.log.push('connect failed');
      }
      render();
    })();
  } catch (e) {
    events.log.push('connector error');
  }
}n      render();\n    })();\n  } catch (e) {\n    events.log.push('connector error');\n  }\n}\n          }
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
  } catch (e) {
    events.log.push(`[wifi] ssid detect error ${(e && e.message) || e}`);
  }
  return null;
}

async function wifiSetupFlow(allowSkip = false) {
  // Temporarily switch to line mode prompts
  const savedRaw = process.stdin.isTTY ? process.stdin.isRaw : false;
  try { if (GLOBAL_KEYPRESS) process.stdin.off('keypress', GLOBAL_KEYPRESS); } catch (_) {}
  try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch (_) {}

  const ssids = await scanSsids();
  if (!ssids || ssids.length === 0) {
    events.log.push('[wifi] no networks found');
    const manual = (await promptLine('Enter SSID manually to verify after switching? [y/N]: ')).trim().toLowerCase();
    if (manual === 'y' || manual === 'yes') {
      const target = await promptLine('SSID: ');
      console.log(`\nPlease switch your computer to Wiâ€‘Fi '${target}' using the OS Wiâ€‘Fi menu.`);
      await promptLine('Press Enter after switching...');
      const now = await detectSsid();
      events.log.push(now === target ? `[wifi] verified SSID '${target}'` : `[wifi] current SSID '${now || 'Unknown'}' (expected '${target}')`);
      restoreKeyHandler(savedRaw);
      return { selectedSsid: target, verified: now === target };
    }
    restoreKeyHandler(savedRaw);
    return { selectedSsid: null, verified: false };
  }

  console.log('\nAvailable Wiâ€‘Fi networks:');
  if (allowSkip) console.log('  [0] Skip');
  ssids.forEach((s, i) => console.log(`  [${i + 1}] ${s}`));
  const range = allowSkip ? `0-${ssids.length}` : `1-${ssids.length}`;
  const pickStr = await promptLine(`\nSelect network [${range}]: `);
  const pickNum = parseInt(pickStr, 10);
  if (allowSkip && (!pickStr || isNaN(pickNum) || pickNum === 0)) {
    events.log.push('[wifi] skipped network selection');
    restoreKeyHandler(savedRaw);
    return { selectedSsid: null, verified: false };
  }
  const idx = Math.max(1, Math.min(ssids.length, pickNum || 1)) - 1;
  const ssid = ssids[idx];
  // If already on the selected SSID, just verify and continue
  const current = await detectSsid();
  if (current === ssid) {
    events.log.push(`[wifi] already connected to '${ssid}'`);
    restoreKeyHandler(savedRaw);
    return { selectedSsid: ssid, verified: true };
  }
  console.log(`\nPlease switch your computer to Wiâ€‘Fi '${ssid}' using the OS Wiâ€‘Fi menu.`);
  await promptLine('Press Enter after switching...');
  const now = await detectSsid();
  events.log.push(now === ssid ? `[wifi] verified SSID '${ssid}'` : `[wifi] current SSID '${now || 'Unknown'}' (expected '${ssid}')`);

  restoreKeyHandler(savedRaw);
  return { selectedSsid: ssid, verified: now === ssid };
}

function restoreKeyHandler(savedRaw) {
  readline.emitKeypressEvents(process.stdin);
  try { if (process.stdin.isTTY) process.stdin.setRawMode(savedRaw); } catch (_) {}
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  if (GLOBAL_KEYPRESS) process.stdin.on('keypress', GLOBAL_KEYPRESS);
}

function promptLine(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// No password prompting or OS-level connection; user switches via OS UI.

function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 5000, windowsHide: true, ...options }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(String(stdout || ''));
    });
  });
}

async function scanSsids() {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      // Try multiple strategies on Windows
      const ssids = new Set();
      async function tryCmd(cmd) {
        try {
          const out = await execPromise(cmd);
          const lines = out.split(/\r?\n/);
          for (const line of lines) {
            let m = line.match(/\s*SSID\s*\d+\s*:\s*(.+)$/i);
            if (m) {
              const name = m[1].trim();
              if (name) ssids.add(name);
              continue;
            }
            m = line.match(/\s*All User Profile\s*:\s*(.+)$/i);
            if (m) {
              const name = m[1].trim();
              if (name) ssids.add(name);
            }
          }
        } catch (_) { /* ignore */ }
      }

      // 1) Default scan
      await tryCmd('netsh wlan show networks mode=Bssid');
      // 2) Fallback: generic
      if (ssids.size === 0) await tryCmd('netsh wlan show networks');
      // 3) Fallback: specific interface
      if (ssids.size === 0) {
        try {
          const ifOut = await execPromise('netsh wlan show interfaces');
          const nameLine = ifOut.split(/\r?\n/).find(l => /\bName\s*:\s*/i.test(l));
          if (nameLine) {
            const iface = nameLine.split(':').slice(1).join(':').trim();
            if (iface) await tryCmd(`netsh wlan show networks interface=\"${iface}\"`);
          }
        } catch (_) { /* ignore */ }
      }
      // 4) Fallback: list known profiles
      if (ssids.size === 0) await tryCmd('netsh wlan show profiles');
      return Array.from(ssids);
    } else if (platform === 'darwin') {
      const out = await execPromise('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s');
      const lines = out.split(/\r?\n/).slice(1);
      const ssids = lines.map((l) => l.trim().split(/\s{2,}/)[0]).filter(Boolean);
      return Array.from(new Set(ssids));
    } else {
      const out = await execPromise('nmcli -t -f SSID dev wifi');
      const ssids = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      return Array.from(new Set(ssids));
    }
  } catch (e) {
    events.log.push(`[wifi] scan error ${(e && e.message) || e}`);
    return [];
  }
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function connectToWifi(ssid, password) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      const os = require('os');
      const tmp = os.tmpdir();
      const profilePath = path.join(tmp, `wlan-${Date.now()}.xml`);
      const xml = `<?xml version="1.0"?>\n<WLANProfile xmlns=\"http://www.microsoft.com/networking/WLAN/profile/v1\">\n  <name>${xmlEscape(ssid)}</name>\n  <SSIDConfig>\n    <SSID><name>${xmlEscape(ssid)}</name></SSID>\n  </SSIDConfig>\n  <connectionType>ESS</connectionType>\n  <connectionMode>auto</connectionMode>\n  <MSM>\n    <security>\n      <authEncryption>\n        <authentication>WPA2PSK</authentication>\n        <encryption>AES</encryption>\n        <useOneX>false</useOneX>\n      </authEncryption>\n      <sharedKey>\n        <keyType>passPhrase</keyType>\n        <protected>false</protected>\n        <keyMaterial>${xmlEscape(password)}</keyMaterial>\n      </sharedKey>\n    </security>\n  </MSM>\n</WLANProfile>`;
      fs.writeFileSync(profilePath, xml, 'utf8');
      try { await execPromise(`netsh wlan add profile filename=\"${profilePath}\" user=current`); } finally { try { fs.unlinkSync(profilePath); } catch (_) {} }
      await execPromise(`netsh wlan connect name=\"${ssid}\" ssid=\"${ssid}\"`);
      return true;
    } else if (platform === 'darwin') {
      // Best-effort: default device is usually en0
      await execPromise(`networksetup -setairportnetwork en0 '${ssid.replace(/'/g, "'\\''")}' '${password.replace(/'/g, "'\\''")}'`);
      return true;
    } else {
      await execPromise(`nmcli dev wifi connect '${ssid.replace(/'/g, "'\\''")}' password '${password.replace(/'/g, "'\\''")}'`);
      return true;
    }
  } catch (e) {
    events.log.push(`[wifi] connect error ${(e && e.message) || e}`);
    return false;
  }
}







