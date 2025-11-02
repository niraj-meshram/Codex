// Interactive TUI for MyTvRemote
// - Lists discovered devices
// - Lets you connect to one (Enter)
// - Start/Stop via keyboard ([S] powerOn, [P] powerOff)
// - Refresh discovery with [R]
// - Quit with [Q] or Ctrl+C

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const {
  CommandDispatcher,
  IrTransportAdapter,
  BluetoothTransportAdapter,
  WifiTransportAdapter,
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
      // url is like /devices/<id>/commands — translate to device base
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

  const transports = [ir, bt];
  const wifiCfg = loadWifiConfig();
  if (wifiCfg) {
    const wifi = createWifiAdapterFromConfig(wifiCfg);
    if (wifi) transports.push(wifi);
  }

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
  }

  await discover();

  function header() {
    return [
      'MyTvRemote – Interactive Controller',
      ''.padEnd(60, '─'),
      `Connected: ${connectedId ? connectedId : 'None'}`,
      ''.padEnd(60, '─'),
    ].join('\n');
  }

  function deviceLine(idx, d) {
    const pointer = idx === selected ? '>' : ' ';
    const tag = d.id === connectedId ? ' (connected)' : '';
    return `${pointer} ${d.id}  ${d.name} [${d.protocol}] ${tag}`;
  }

  function help() {
    return [
      ''.padEnd(60, '─'),
      'Keys: ↑/↓ select  Enter connect  S start(powerOn)  P stop(powerOff)  R refresh  Q quit',
      ''.padEnd(60, '─'),
    ].join('\n');
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
    events.log.push(`[ui] connected to ${connectedId}`);
  }

  async function start() {
    if (!connectedId) {
      events.log.push('[ui] no device connected');
      return;
    }
    try {
      await dispatcher.send(connectedId, 'powerOn');
    } catch (e) {
      events.log.push(`[error] ${e.message || e}`);
    }
  }

  async function stop() {
    if (!connectedId) {
      events.log.push('[ui] no device connected');
      return;
    }
    try {
      await dispatcher.send(connectedId, 'powerOff');
    } catch (e) {
      events.log.push(`[error] ${e.message || e}`);
    }
  }

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('keypress', async (_str, key) => {
    if (!key) return;
    if (key.ctrl && key.name === 'c') {
      cleanupAndExit();
      return;
    }

    switch (key.name) {
      case 'up':
        selected = clamp(selected - 1, 0, Math.max(0, devices.length - 1));
        break;
      case 'down':
        selected = clamp(selected + 1, 0, Math.max(0, devices.length - 1));
        break;
      case 'return':
      case 'enter':
        connectSelected();
        break;
      case 's':
        await start();
        break;
      case 'p':
        await stop();
        break;
      case 'r':
        await discover();
        break;
      case 'q':
        cleanupAndExit();
        return;
      default:
        break;
    }
    render();
  });

  function cleanupAndExit() {
    clear();
    console.log('Goodbye!');
    try {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    } catch (_) {}
    process.stdin.pause();
    process.exit(0);
  }

  render();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
