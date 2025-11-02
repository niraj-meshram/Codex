import { CommandPayload, DiscoveryResult } from '../transports/types';

export interface VendorClient {
  discover(): Promise<DiscoveryResult[]>;
  execute(deviceId: string, payload: CommandPayload): Promise<void>;
  syncState?(deviceId: string): Promise<Record<string, unknown>>;
}
