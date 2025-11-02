import EventEmitter from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { BaseTransportAdapter } from './BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from './types';

export interface BluetoothClient {
  scan(timeoutMs: number): Promise<DiscoveryResult[]>;
  send(deviceId: string, payload: CommandPayload): Promise<void>;
  events: EventEmitter;
}

export class BluetoothTransportAdapter extends BaseTransportAdapter {
  public readonly protocol = 'bluetooth' as const;

  public constructor(private readonly client: BluetoothClient, commands: string[]) {
    super(commands);
  }

  async discover(): Promise<DiscoveryResult[]> {
    const results = await this.client.scan(5000);
    return results.map((device) => ({
      ...device,
      protocol: this.protocol,
      metadata: {
        ...device.metadata,
        lastSeen: Date.now()
      }
    }));
  }

  async sendCommand(deviceId: string, payload: CommandPayload): Promise<void> {
    await this.client.send(deviceId, payload);
  }

  public static createMockClient(): BluetoothClient {
    const events = new EventEmitter();
    return {
      events,
      async scan(timeoutMs: number): Promise<DiscoveryResult[]> {
        events.emit('scan:start', { timeoutMs });
        await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 50)));
        const mockDevice: DiscoveryResult = {
          id: uuid(),
          name: 'Bluetooth TV',
          address: 'bt://mock-tv',
          protocol: 'bluetooth',
          metadata: { manufacturer: 'Mock', model: 'BT-1000' }
        };
        events.emit('scan:complete', { count: 1 });
        return [mockDevice];
      },
      async send(deviceId: string, payload: CommandPayload): Promise<void> {
        events.emit('send', { deviceId, payload });
      }
    };
  }
}
