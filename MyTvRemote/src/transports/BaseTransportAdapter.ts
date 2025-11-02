import { CommandPayload, DiscoveryResult, TransportAdapter } from './types';

export abstract class BaseTransportAdapter implements TransportAdapter {
  public abstract readonly protocol: DiscoveryResult['protocol'];
  protected supportedCommands: Set<string>;

  protected constructor(commands: string[]) {
    this.supportedCommands = new Set(commands);
  }

  abstract discover(): Promise<DiscoveryResult[]>;

  abstract sendCommand(deviceId: string, payload: CommandPayload): Promise<void>;

  supportsCommand(command: string): boolean {
    return this.supportedCommands.has(command) || this.supportedCommands.has('*');
  }
}
