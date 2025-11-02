import { CommandDispatcher } from '../dispatcher/CommandDispatcher';
import { CommandPayload, DiscoveryResult } from '../transports/types';
import { CommandProfile } from '../config/CommandProfile';
import { VendorClient } from './types';

export interface VendorIntegrationConfig {
  clients: VendorClient[];
  fallbackProfile: CommandProfile;
}

export class VendorIntegrationService {
  constructor(private readonly dispatcher: CommandDispatcher, private readonly config: VendorIntegrationConfig) {}

  async synchronizeDevices(): Promise<DiscoveryResult[]> {
    const vendorDevices = await Promise.all(this.config.clients.map((client) => client.discover()));
    const flattened = vendorDevices.flat();
    return flattened;
  }

  async execute(deviceId: string, payload: CommandPayload): Promise<void> {
    for (const client of this.config.clients) {
      try {
        await client.execute(deviceId, payload);
        return;
      } catch (error) {
        continue;
      }
    }

    await this.dispatcher.send(deviceId, payload.command, payload.parameters);
  }

  getFallbackProfile(): CommandProfile {
    return this.config.fallbackProfile;
  }
}
