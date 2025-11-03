import WebSocket from 'ws';
import { DiscoveryResult } from '../../transports/types';
import { TVConnector, ConnectResult } from '../TVConnector';

export class SamsungTizenConnector implements TVConnector {
  public readonly vendor = 'Samsung Tizen';

  canHandle(device: DiscoveryResult): boolean {
    return (device.metadata?.vendor === 'Samsung Tizen') || /samsung/i.test(device.name || '');
  }

  async connect(device: DiscoveryResult): Promise<ConnectResult> {
    try {
      const appName = Buffer.from('MyTvRemote', 'utf8').toString('base64');
      const url = `${device.address}/api/v2/channels/samsung.remote.control?name=${appName}`.replace('http', 'ws');
      const socket = new WebSocket(url, { rejectUnauthorized: false });
      await new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('connect timeout')), 2500);
        socket.once('open', () => { clearTimeout(to); resolve(); });
        socket.once('error', (e) => { clearTimeout(to); reject(e); });
      });
      // Send a non-intrusive key to validate the session
      const message = {
        method: 'ms.remote.control',
        params: { Cmd: 'Click', DataOfCmd: 'KEY_HOME', Option: 'false', TypeOfRemote: 'SendRemoteKey' }
      };
      await new Promise<void>((resolve, reject) => {
        try { socket.send(JSON.stringify(message), (err) => err ? reject(err) : resolve()); } catch (e) { reject(e as Error); }
      });
      try { socket.close(); } catch {}
      return { ok: true };
    } catch (e) {
      // Pairing required or network blocked
      return { ok: false, requiresAuth: true, message: (e as Error).message };
    }
  }
}

