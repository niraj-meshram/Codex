import axios from 'axios';
import { CommandDispatcher } from '../dispatcher/CommandDispatcher';
import { DiscoveryResult } from '../transports/types';
import { CommandName } from './commands';
import { SamsungTizenTransportAdapter } from '../transports/SamsungTizenTransportAdapter';
import { LgWebOsClient } from '../vendors/LgWebOsClient';

export class CommandLayer {
  constructor(private readonly dispatcher: CommandDispatcher) {}

  async send(device: DiscoveryResult, command: CommandName, parameters?: Record<string, unknown>): Promise<void> {
    const vendor = (device.metadata && (device.metadata as any).vendor) as string | undefined;
    if (vendor && /samsung/i.test(vendor)) {
      const tizen = new SamsungTizenTransportAdapter([
        { id: device.id, name: device.name, ip: extractHost(device.address) || device.address, port: extractPort(device.address) || 8001 }
      ], ['*']);
      await tizen.sendCommand(device.id, { command, parameters });
      return;
    }

    if (vendor && /roku/i.test(vendor)) {
      const base = device.address.startsWith('http') ? device.address : `http://${device.address}`;
      await axios.post(`${base}/keypress/${mapRoku(command)}`, undefined, { timeout: 2000, validateStatus: () => true });
      return;
    }

    if (vendor && /webos/i.test(vendor)) {
      // Minimal webOS mapping via existing client; assumes open control port
      const host = extractHost(device.address) || device.address;
      const client = new LgWebOsClient(host, device.id);
      const payload = mapWebOs(command, parameters);
      await client.execute(device.id, payload);
      return;
    }

    // Fallback to dispatcher (e.g., IR/Bluetooth/Wi‑Fi generic)
    await this.dispatcher.send(device.id, command, parameters);
  }
}

function extractHost(addr: string): string | null {
  try {
    const u = new URL(addr);
    return u.hostname;
  } catch {
    return null;
  }
}

function extractPort(addr: string): number | null {
  try {
    const u = new URL(addr);
    return u.port ? parseInt(u.port, 10) : null;
  } catch {
    return null;
  }
}

function mapRoku(cmd: CommandName): string {
  switch (cmd) {
    case 'powerOn':
    case 'powerOff':
    case 'powerToggle':
      return 'Power';
    case 'home':
      return 'Home';
    case 'back':
      return 'Back';
    case 'up':
      return 'Up';
    case 'down':
      return 'Down';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
    case 'select':
      return 'Select';
    case 'volumeUp':
      return 'VolumeUp';
    case 'volumeDown':
      return 'VolumeDown';
    case 'mute':
      return 'VolumeMute';
    case 'channelUp':
      return 'ChannelUp';
    case 'channelDown':
      return 'ChannelDown';
    default:
      return 'Home';
  }
}

function mapWebOs(command: CommandName, parameters?: Record<string, unknown>) {
  // Use the LgWebOsClient generic API shape
  if (command === 'home') return { command: 'ssap://system.launcher/launch', parameters: { id: 'com.webos.app.home' } };
  if (command === 'powerOff') return { command: 'ssap://system/turnOff' } as any;
  // For other commands, fall back to dispatcher in send(); this is a minimal stub
  return { command, parameters } as any;
}

