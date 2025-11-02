import axios, { AxiosInstance } from 'axios';
import { CommandPayload, DiscoveryResult } from '../transports/types';
import { VendorClient } from './types';

export class AndroidTvClient implements VendorClient {
  private readonly http: AxiosInstance;

  constructor(private readonly host: string, private readonly pairingKey: string) {
    this.http = axios.create({
      baseURL: `https://${host}:6466`,
      headers: { 'X-Auth-PSK': pairingKey },
      httpsAgent: { rejectUnauthorized: false }
    });
  }

  async discover(): Promise<DiscoveryResult[]> {
    const { data } = await this.http.get('/ssdp/device-desc.xml');
    const name = this.extractTagValue(data, 'friendlyName');
    const id = this.extractTagValue(data, 'UDN');
    return [
      {
        id,
        name,
        address: `androidtv://${this.host}`,
        protocol: 'wifi',
        metadata: { vendor: 'Android TV', raw: data }
      }
    ];
  }

  async execute(_: string, payload: CommandPayload): Promise<void> {
    await this.http.post('/sony/ircc', {
      method: 'IRCC',
      params: [payload.command],
      id: 1,
      version: '1.0'
    });
  }

  private extractTagValue(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'i'));
    return match ? match[1] : tag;
  }
}
