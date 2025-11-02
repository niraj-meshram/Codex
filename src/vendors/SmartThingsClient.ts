import axios, { AxiosInstance } from 'axios';
import { CommandPayload, DiscoveryResult } from '../transports/types';
import { VendorClient } from './types';

interface SmartThingsDevice {
  deviceId: string;
  label: string;
  roomName?: string;
}

export class SmartThingsClient implements VendorClient {
  private readonly http: AxiosInstance;

  constructor(token: string) {
    this.http = axios.create({
      baseURL: 'https://api.smartthings.com/v1',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async discover(): Promise<DiscoveryResult[]> {
    const { data } = await this.http.get<{ items: SmartThingsDevice[] }>('/devices');
    return data.items.map((device) => ({
      id: device.deviceId,
      name: device.label,
      address: `smartthings://${device.deviceId}`,
      protocol: 'wifi',
      metadata: { room: device.roomName, vendor: 'Samsung SmartThings' }
    }));
  }

  async execute(deviceId: string, payload: CommandPayload): Promise<void> {
    await this.http.post(`/devices/${deviceId}/commands`, {
      commands: [
        {
          capability: 'mediaInputSource',
          command: payload.command,
          arguments: payload.parameters ? Object.values(payload.parameters) : []
        }
      ]
    });
  }
}
