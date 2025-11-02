import EventEmitter from 'eventemitter3';
import { CommandPayload, DiscoveryResult, TransportAdapter } from '../transports/types';
import { CommandProfile, CommandProfileEntry } from '../config/CommandProfile';

type DispatcherEvents = {
  'command:sent': [
    {
      deviceId: string;
      protocol: DiscoveryResult['protocol'];
      payload: CommandPayload;
    }
  ];
  'command:unsupported': [
    {
      deviceId: string;
      payload: CommandPayload;
    }
  ];
};

export class CommandDispatcher {
  private readonly emitter = new EventEmitter<DispatcherEvents>();

  constructor(private readonly transports: TransportAdapter[], private readonly profile: CommandProfile) {}

  async send(deviceId: string, command: string, parameters?: Record<string, unknown>): Promise<void> {
    const payload: CommandPayload = { command, parameters };
    const targetAdapter = this.selectAdapter(command, deviceId);

    if (!targetAdapter) {
      this.emitter.emit('command:unsupported', [{ deviceId, payload }]);
      throw new Error(`No transport available for command ${command}`);
    }

    await targetAdapter.sendCommand(deviceId, payload);
    this.emitter.emit('command:sent', [{
      deviceId,
      protocol: targetAdapter.protocol,
      payload
    }]);
  }

  async discover(): Promise<DiscoveryResult[]> {
    const results = await Promise.all(this.transports.map((transport) => transport.discover()));
    return results.flat();
  }

  on<Event extends keyof DispatcherEvents>(event: Event, listener: (...args: DispatcherEvents[Event]) => void) {
    this.emitter.on(event, listener);
  }

  off<Event extends keyof DispatcherEvents>(event: Event, listener: (...args: DispatcherEvents[Event]) => void) {
    this.emitter.off(event, listener);
  }

  private selectAdapter(command: string, deviceId: string): TransportAdapter | undefined {
    const profileEntry = this.profile[command];
    if (profileEntry) {
      const matchingAdapter = this.transports.find((adapter) =>
        this.applyProfile(adapter, profileEntry, deviceId)
      );
      if (matchingAdapter) {
        return matchingAdapter;
      }
    }

    return this.transports.find((adapter) => adapter.supportsCommand(command));
  }

  private applyProfile(
    adapter: TransportAdapter,
    entry: CommandProfileEntry,
    deviceId: string
  ): boolean {
    if (!entry.protocols.includes(adapter.protocol)) {
      return false;
    }

    if (entry.deviceIds && !entry.deviceIds.includes(deviceId)) {
      return false;
    }

    return true;
  }
}
