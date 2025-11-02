import axios, { AxiosInstance } from 'axios';
import { BaseTransportAdapter } from './BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from './types';

export interface WifiRegistryEntry {
  id: string;
  name: string;
  ip: string;
  port: number;
  metadata?: Record<string, unknown>;
}

export class WifiTransportAdapter extends BaseTransportAdapter {
  public readonly protocol = 'wifi' as const;

  public constructor(
    private readonly http: AxiosInstance,
    private readonly registry: () => Promise<WifiRegistryEntry[]>,
    commands: string[]
  ) {
    super(commands);
  }

  async discover(): Promise<DiscoveryResult[]> {
    const entries = await this.registry();
    return entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      address: `http://${entry.ip}:${entry.port}`,
      protocol: this.protocol,
      metadata: entry.metadata
    }));
  }

  async sendCommand(deviceId: string, payload: CommandPayload): Promise<void> {
    await this.http.post(`/devices/${deviceId}/commands`, payload);
  }

  public static createInMemoryRegistry(devices: WifiRegistryEntry[]): () => Promise<WifiRegistryEntry[]> {
    return async () => devices;
  }

  public static createHttpClient(baseURL: string): AxiosInstance {
    return axios.create({ baseURL, timeout: 2500 });
  }
}
