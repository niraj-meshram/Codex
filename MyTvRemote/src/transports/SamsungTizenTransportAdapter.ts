import WebSocket from 'ws';
import { BaseTransportAdapter } from './BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from './types';

export interface SamsungDeviceEntry {
  id: string;
  name: string;
  ip: string;
  port?: number; // default 8001 (ws). Some models use 8002 (wss)
}

export class SamsungTizenTransportAdapter extends BaseTransportAdapter {
  public readonly protocol = 'wifi' as const;

  private readonly deviceMap: Map<string, SamsungDeviceEntry>;

  constructor(devices: SamsungDeviceEntry[], commands: string[]) {
    super(commands);
    this.deviceMap = new Map(devices.map((d) => [d.id, d]));
  }

  async discover(): Promise<DiscoveryResult[]> {
    return Array.from(this.deviceMap.values()).map((d) => ({
      id: d.id,
      name: d.name,
      address: `ws://${d.ip}:${d.port ?? 8001}`,
      protocol: this.protocol,
      metadata: { vendor: 'Samsung Tizen' }
    }));
  }

  async sendCommand(deviceId: string, payload: CommandPayload): Promise<void> {
    const entry = this.deviceMap.get(deviceId);
    if (!entry) throw new Error(`samsung-tizen: unknown device ${deviceId}`);

    const key = this.mapCommandToKey(payload.command);
    if (!key) throw new Error(`samsung-tizen: unsupported command ${payload.command}`);

    // Build WebSocket URL; many TVs accept unsecured ws on 8001
    const appName = Buffer.from('MyTvRemote', 'utf8').toString('base64');
    const port = entry.port ?? 8001;
    const scheme = port === 8002 ? 'wss' : 'ws';
    const url = `${scheme}://${entry.ip}:${port}/api/v2/channels/samsung.remote.control?name=${appName}`;

    const socket = new WebSocket(url, { rejectUnauthorized: false });
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('ws: connect timeout')), 2500);
      socket.once('open', () => { clearTimeout(to); resolve(); });
      socket.once('error', (e) => { clearTimeout(to); reject(e); });
    });

    const message = {
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: key,
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey'
      }
    };

    await new Promise<void>((resolve, reject) => {
      try {
        socket.send(JSON.stringify(message), (err) => {
          if (err) return reject(err);
          resolve();
        });
      } catch (e) {
        reject(e as Error);
      }
    });

    try { socket.close(); } catch (_) {}
  }

  private mapCommandToKey(command: string): string | null {
    switch (command) {
      case 'powerOn':
      case 'powerOff':
      case 'powerToggle':
        return 'KEY_POWER'; // May require WOL for powerOn if TV is in deep standby
      case 'volumeUp':
        return 'KEY_VOLUP';
      case 'volumeDown':
        return 'KEY_VOLDOWN';
      case 'mute':
        return 'KEY_MUTE';
      case 'channelUp':
        return 'KEY_CHUP';
      case 'channelDown':
        return 'KEY_CHDOWN';
      case 'home':
        return 'KEY_HOME';
      case 'select':
        return 'KEY_ENTER';
      case 'back':
        return 'KEY_RETURN';
      case 'left':
        return 'KEY_LEFT';
      case 'right':
        return 'KEY_RIGHT';
      case 'up':
        return 'KEY_UP';
      case 'down':
        return 'KEY_DOWN';
      default:
        return null;
    }
  }
}

