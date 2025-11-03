import axios from 'axios';
import { DiscoveryResult } from '../../transports/types';
import { TVConnector, ConnectResult } from '../TVConnector';

export class RokuConnector implements TVConnector {
  public readonly vendor = 'Roku';

  canHandle(device: DiscoveryResult): boolean {
    return (device.metadata?.vendor === 'Roku') || /roku/i.test(device.name || '');
  }

  async connect(device: DiscoveryResult): Promise<ConnectResult> {
    try {
      // Roku ECP: POST /keypress/home
      const base = device.address.startsWith('http') ? device.address : `http://${device.address}`;
      await axios.post(`${base}/keypress/Home`, undefined, { timeout: 2000, validateStatus: () => true });
      return { ok: true };
    } catch (e) {
      return { ok: false, requiresAuth: false, message: (e as Error).message };
    }
  }
}

