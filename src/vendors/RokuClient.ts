import axios, { AxiosInstance } from 'axios';
import { CommandPayload, DiscoveryResult } from '../transports/types';
import { VendorClient } from './types';

export class RokuClient implements VendorClient {
  private readonly http: AxiosInstance;

  constructor(private readonly baseUrl: string) {
    this.http = axios.create({ baseURL: baseUrl });
  }

  async discover(): Promise<DiscoveryResult[]> {
    const { data } = await this.http.get('/query/device-info');
    const name = this.extractTagValue(data, 'friendly-device-name');
    const id = this.extractTagValue(data, 'device-id');
    return [
      {
        id,
        name,
        address: this.baseUrl,
        protocol: 'wifi',
        metadata: { vendor: 'Roku', raw: data }
      }
    ];
  }

  async execute(_: string, payload: CommandPayload): Promise<void> {
    await this.http.post(`/keypress/${payload.command}`);
  }

  private extractTagValue(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'i'));
    return match ? match[1] : tag;
  }
}
