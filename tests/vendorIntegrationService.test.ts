import { CommandDispatcher } from '../src/dispatcher/CommandDispatcher';
import { VendorIntegrationService } from '../src/vendors/VendorIntegrationService';
import { VendorClient } from '../src/vendors/types';
import { BaseTransportAdapter } from '../src/transports/BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from '../src/transports/types';

class NoopTransport extends BaseTransportAdapter {
  public readonly protocol: DiscoveryResult['protocol'] = 'ir';
  public sent: CommandPayload[] = [];

  constructor() {
    super(['*']);
  }

  async discover(): Promise<DiscoveryResult[]> {
    return [];
  }

  async sendCommand(_: string, payload: CommandPayload): Promise<void> {
    this.sent.push(payload);
  }
}

describe('VendorIntegrationService', () => {
  it('attempts vendor execution then falls back to dispatcher', async () => {
    const transport = new NoopTransport();
    const dispatcher = new CommandDispatcher([transport], { powerOn: { protocols: ['ir'] } });

    const failingClient: VendorClient = {
      async discover() {
        return [];
      },
      async execute() {
        throw new Error('Vendor offline');
      }
    };

    const service = new VendorIntegrationService(dispatcher, {
      clients: [failingClient],
      fallbackProfile: { powerOn: { protocols: ['ir'] } }
    });

    await service.execute('1', { command: 'powerOn' });
    expect(transport.sent).toHaveLength(1);
  });
});
