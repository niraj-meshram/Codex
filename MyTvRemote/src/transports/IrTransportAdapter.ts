import { v4 as uuid } from 'uuid';
import { BaseTransportAdapter } from './BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from './types';

export interface IrEmitter {
  emit(code: string): Promise<void>;
}

export class IrTransportAdapter extends BaseTransportAdapter {
  public readonly protocol = 'ir' as const;

  public constructor(private readonly emitter: IrEmitter, commands: string[]) {
    super(commands);
  }

  async discover(): Promise<DiscoveryResult[]> {
    return [
      {
        id: uuid(),
        name: 'Fallback IR Television',
        address: 'ir://local-emitter',
        protocol: this.protocol,
        metadata: {
          manufacturer: 'Generic',
          notes: 'Uses fallback IR profile'
        }
      }
    ];
  }

  async sendCommand(_: string, payload: CommandPayload): Promise<void> {
    await this.emitter.emit(payload.command);
  }
}
