import { BaseTransportAdapter } from './BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from './types';
import { ssdpSearch } from '../discovery/SsdpDiscovery';
import { SamsungTizenTransportAdapter } from './SamsungTizenTransportAdapter';

export class SamsungTizenAutoAdapter extends BaseTransportAdapter {
  public readonly protocol = 'wifi' as const;
  private inner?: SamsungTizenTransportAdapter;
  private cache: DiscoveryResult[] = [];

  constructor(commands: string[]) {
    super(commands);
  }

  async discover(): Promise<DiscoveryResult[]> {
    const matches = await ssdpSearch({
      st: [
        'urn:schemas-upnp-org:device:MediaRenderer:1',
        'ssdp:all',
      ],
      timeoutMs: 1000,
      attempts: 2,
    });

    const samsung: { id: string; name: string; ip: string; port?: number }[] = [];
    for (const r of matches) {
      const server = (r.server || '').toLowerCase();
      const loc = r.location || '';
      if (server.includes('samsung') || /samsung/i.test(loc)) {
        const ip = extractHost(loc) || r.address;
        const id = `samsung-${ip}`;
        samsung.push({ id, name: 'Samsung TV', ip, port: 8001 });
      }
    }

    if (samsung.length > 0) {
      this.inner = new SamsungTizenTransportAdapter(samsung, Array.from(this.supportedCommands));
      this.cache = await this.inner.discover();
    } else {
      this.inner = undefined;
      this.cache = [];
    }

    return this.cache;
  }

  async sendCommand(deviceId: string, payload: CommandPayload): Promise<void> {
    if (!this.inner) throw new Error('samsung-auto: no devices discovered');
    return this.inner.sendCommand(deviceId, payload);
  }
}

function extractHost(locationUrl: string): string | null {
  try {
    const u = new URL(locationUrl);
    return u.hostname || null;
  } catch {
    return null;
  }
}
