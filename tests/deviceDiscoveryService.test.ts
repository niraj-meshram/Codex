import { CommandDispatcher } from '../src/dispatcher/CommandDispatcher';
import {
  DeviceDiscoveryService,
  DeviceSnapshotUpdate
} from '../src/discovery/DeviceDiscoveryService';
import { BaseTransportAdapter } from '../src/transports/BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from '../src/transports/types';

class MockTransport extends BaseTransportAdapter {
  public readonly protocol: DiscoveryResult['protocol'];

  constructor(protocol: DiscoveryResult['protocol'], private readonly devices: DiscoveryResult[]) {
    super(['*']);
    this.protocol = protocol;
  }

  async discover(): Promise<DiscoveryResult[]> {
    return this.devices;
  }

  async sendCommand(): Promise<void> {
    return;
  }
}

describe('DeviceDiscoveryService', () => {
  it('caches snapshot results and tracks diff metadata', async () => {
    const transport = new MockTransport('wifi', [
      { id: '1', name: 'TV', address: 'wifi://tv', protocol: 'wifi' }
    ]);
    const dispatcher = new CommandDispatcher([transport], { powerOn: { protocols: ['wifi'] } });
    const service = new DeviceDiscoveryService(dispatcher);

    expect(service.getCachedDevices()).toEqual([]);
    await service.snapshot();
    expect(service.getCachedDevices()).toHaveLength(1);
    expect(service.getLastDiff().added).toHaveLength(1);
    expect(service.getLastDiff().removed).toHaveLength(0);
  });

  it('merges duplicate results and surfaces polling diff information', async () => {
    const transport = new MockTransport('wifi', [
      { id: '1', name: 'Living Room', address: 'wifi://tv', protocol: 'wifi' },
      { id: '1', name: 'Living Room', address: 'wifi://tv', protocol: 'wifi', metadata: { brand: 'Acme' } },
      { id: '2', name: 'Bedroom', address: 'wifi://bedroom', protocol: 'wifi' }
    ]);

    const dispatcher = new CommandDispatcher([transport], { powerOn: { protocols: ['wifi'] } });
    const service = new DeviceDiscoveryService(dispatcher);

    const updates: DeviceSnapshotUpdate[] = [];

    service.startPolling({ pollingIntervalMs: 10 }, (update) => {
      updates.push(update);
    });

    await new Promise((resolve) => setTimeout(resolve, 40));
    service.stopPolling();

    expect(updates.length).toBeGreaterThan(0);
    const [firstUpdate] = updates;
    expect(firstUpdate.devices).toHaveLength(2);
    expect(firstUpdate.devices[0].metadata).toEqual({ brand: 'Acme' });
    expect(firstUpdate.diff.added.length).toBeGreaterThan(0);
  });
});
