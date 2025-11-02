// Simple demo runner for MyTvRemote
// Discovers mock devices and sends a powerOn command using the Bluetooth mock

const {
  CommandDispatcher,
  IrTransportAdapter,
  BluetoothTransportAdapter,
} = require('../dist/index.js');

async function main() {
  const ir = new IrTransportAdapter({
    async emit(code) {
      console.log('[IR] emit', code);
    },
  }, ['*']);

  const btClient = BluetoothTransportAdapter.createMockClient();
  const bt = new BluetoothTransportAdapter(btClient, ['powerOn']);

  const dispatcher = new CommandDispatcher([
    ir,
    bt,
  ], {
    powerOn: { protocols: ['bluetooth', 'wifi'] },
  });

  dispatcher.on('command:sent', (evt) => {
    console.log('[EVENT] command:sent', evt);
  });
  dispatcher.on('command:unsupported', (evt) => {
    console.warn('[EVENT] command:unsupported', evt);
  });

  console.log('Discovering devices...');
  const devices = await dispatcher.discover();
  for (const d of devices) {
    console.log(`- ${d.id} ${d.name} (${d.protocol}) @ ${d.address}`);
  }

  // Pick the Bluetooth device if present, else fall back to IR
  const btDevice = devices.find(d => d.protocol === 'bluetooth');
  const targetId = btDevice ? btDevice.id : devices[0]?.id || 'unknown';

  console.log('Sending powerOn to', targetId);
  await dispatcher.send(targetId, 'powerOn');

  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

