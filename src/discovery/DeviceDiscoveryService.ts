import { CommandDispatcher } from '../dispatcher/CommandDispatcher';
import { DiscoveryResult } from '../transports/types';

export interface DeviceDiscoveryOptions {
  pollingIntervalMs?: number;
}

export interface DeviceDiff {
  added: DiscoveryResult[];
  removed: DiscoveryResult[];
  updated: DiscoveryResult[];
}

export interface DeviceSnapshotUpdate {
  devices: DiscoveryResult[];
  diff: DeviceDiff;
}

export class DeviceDiscoveryService {
  private lastSnapshot: DiscoveryResult[] = [];
  private lastDiff: DeviceDiff = { added: [], removed: [], updated: [] };
  private pollHandle?: NodeJS.Timeout;

  constructor(private readonly dispatcher: CommandDispatcher) {}

  async snapshot(): Promise<DiscoveryResult[]> {
    const discovered = await this.dispatcher.discover();
    const deduped = this.dedupe(discovered);
    this.lastDiff = this.computeDiff(deduped);
    this.lastSnapshot = deduped;
    return this.lastSnapshot;
  }

  startPolling(
    options: DeviceDiscoveryOptions,
    onUpdate: (update: DeviceSnapshotUpdate) => void
  ) {
    const interval = options.pollingIntervalMs ?? 30000;
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }

    this.pollHandle = setInterval(async () => {
      const discovered = await this.dispatcher.discover();
      const deduped = this.dedupe(discovered);
      const diff = this.computeDiff(deduped);
      this.lastSnapshot = deduped;
      this.lastDiff = diff;
      onUpdate({ devices: this.lastSnapshot, diff });
    }, interval);
  }

  stopPolling() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = undefined;
    }
  }

  getCachedDevices(): DiscoveryResult[] {
    return this.lastSnapshot;
  }

  getLastDiff(): DeviceDiff {
    return this.lastDiff;
  }

  private dedupe(devices: DiscoveryResult[]): DiscoveryResult[] {
    const map = new Map<string, DiscoveryResult>();
    for (const device of devices) {
      const existing = map.get(device.id);
      if (!existing) {
        map.set(device.id, device);
        continue;
      }

      map.set(device.id, {
        ...existing,
        ...device,
        metadata: {
          ...(existing.metadata ?? {}),
          ...(device.metadata ?? {})
        }
      });
    }

    return Array.from(map.values());
  }

  private computeDiff(nextSnapshot: DiscoveryResult[]): DeviceDiff {
    const previousMap = new Map(this.lastSnapshot.map((device) => [device.id, device]));
    const nextMap = new Map(nextSnapshot.map((device) => [device.id, device]));

    const added: DiscoveryResult[] = [];
    const removed: DiscoveryResult[] = [];
    const updated: DiscoveryResult[] = [];

    for (const device of nextSnapshot) {
      const previous = previousMap.get(device.id);
      if (!previous) {
        added.push(device);
        continue;
      }

      if (this.deviceChanged(previous, device)) {
        updated.push(device);
      }
    }

    for (const [id, device] of previousMap.entries()) {
      if (!nextMap.has(id)) {
        removed.push(device);
      }
    }

    return { added, removed, updated };
  }

  private deviceChanged(previous: DiscoveryResult, next: DiscoveryResult): boolean {
    if (previous.name !== next.name || previous.address !== next.address) {
      return true;
    }

    if (previous.protocol !== next.protocol) {
      return true;
    }

    const previousMetadata = previous.metadata ?? {};
    const nextMetadata = next.metadata ?? {};
    const keys = new Set([...Object.keys(previousMetadata), ...Object.keys(nextMetadata)]);
    for (const key of keys) {
      if (previousMetadata[key] !== nextMetadata[key]) {
        return true;
      }
    }

    return false;
  }
}
