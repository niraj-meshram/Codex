import WebSocket from 'ws';
import { CommandPayload, DiscoveryResult } from '../transports/types';
import { VendorClient } from './types';

interface AppLaunchPayload {
  id: string;
  params?: Record<string, unknown>;
}

export class LgWebOsClient implements VendorClient {
  constructor(private readonly host: string, private readonly registrationKey: string) {}

  async discover(): Promise<DiscoveryResult[]> {
    return [
      {
        id: this.registrationKey,
        name: 'LG webOS TV',
        address: `ws://${this.host}:3000`,
        protocol: 'wifi',
        metadata: { vendor: 'LG webOS', registrationKey: this.registrationKey }
      }
    ];
  }

  async execute(_: string, payload: CommandPayload): Promise<void> {
    const socket = new WebSocket(`ws://${this.host}:3000`);
    await new Promise((resolve, reject) => {
      socket.on('open', resolve);
      socket.on('error', reject);
    });

    const message = this.createMessage(payload);
    socket.send(JSON.stringify(message));
    socket.close();
  }

  private createMessage(payload: CommandPayload): AppLaunchPayload {
    if (payload.command.startsWith('launchApp:')) {
      const [, appId] = payload.command.split(':');
      return { id: 'ssap://system.launcher/launch', params: { id: appId } };
    }

    return { id: payload.command, params: payload.parameters };
  }
}
