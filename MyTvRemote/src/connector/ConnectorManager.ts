import { DiscoveryResult } from '../transports/types';
import { TVConnector, ConnectResult } from './TVConnector';
import { SamsungTizenConnector } from './connectors/SamsungTizenConnector';
import { RokuConnector } from './connectors/RokuConnector';

export class ConnectorManager {
  private readonly connectors: TVConnector[];

  constructor(connectors?: TVConnector[]) {
    this.connectors = connectors ?? [new SamsungTizenConnector(), new RokuConnector()];
  }

  select(device: DiscoveryResult): TVConnector | undefined {
    return this.connectors.find((c) => c.canHandle(device));
  }

  async connect(device: DiscoveryResult, credentials?: Record<string, unknown>): Promise<ConnectResult> {
    const connector = this.select(device);
    if (!connector) return { ok: false, message: 'No connector available for device' };
    return connector.connect(device, credentials);
  }
}

