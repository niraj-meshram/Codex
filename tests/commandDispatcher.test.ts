import { CommandDispatcher } from '../src/dispatcher/CommandDispatcher';
import { BaseTransportAdapter } from '../src/transports/BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from '../src/transports/types';
import { CommandProfile } from '../src/config/CommandProfile';

class MockTransport extends BaseTransportAdapter {
  public readonly protocol: DiscoveryResult['protocol'];
  public sent: CommandPayload[] = [];
  public discovered: DiscoveryResult[];

  constructor(protocol: DiscoveryResult['protocol'], commands: string[]) {
    super(commands);
    this.protocol = protocol;
    this.discovered = [
      {
        id: `${protocol}-1`,
        name: `${protocol} device`,
        address: `${protocol}://device`,
        protocol
      }
    ];
  }

  async discover(): Promise<DiscoveryResult[]> {
    return this.discovered;
  }

  async sendCommand(_: string, payload: CommandPayload): Promise<void> {
    this.sent.push(payload);
  }
}

describe('CommandDispatcher', () => {
  const profile: CommandProfile = {
    powerOn: { protocols: ['wifi', 'bluetooth'] }
  };

  it('selects transport based on profile', async () => {
    const wifi = new MockTransport('wifi', ['powerOn']);
    const ir = new MockTransport('ir', ['powerOn']);

    const dispatcher = new CommandDispatcher([ir, wifi], profile);
    await dispatcher.send('wifi-1', 'powerOn');

    expect(wifi.sent).toHaveLength(1);
    expect(ir.sent).toHaveLength(0);
  });

  it('falls back to supported command when no profile entry matches', async () => {
    const wifi = new MockTransport('wifi', ['powerOff']);
    const ir = new MockTransport('ir', ['*']);
    const dispatcher = new CommandDispatcher([wifi, ir], profile);

    await dispatcher.send('unknown', 'volumeUp');
    expect(ir.sent[0]).toEqual({ command: 'volumeUp', parameters: undefined });
  });

  it('aggregates discovery results from transports', async () => {
    const wifi = new MockTransport('wifi', ['powerOff']);
    const ir = new MockTransport('ir', ['*']);
    const dispatcher = new CommandDispatcher([wifi, ir], profile);

    const devices = await dispatcher.discover();
    expect(devices).toHaveLength(2);
  });
});
