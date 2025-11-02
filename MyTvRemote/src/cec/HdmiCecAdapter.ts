import { BaseTransportAdapter } from '../transports/BaseTransportAdapter';
import { CommandPayload, DiscoveryResult } from '../transports/types';

export interface HdmiCecClient {
  listDevices(): Promise<DiscoveryResult[]>;
  transmit(command: CommandPayload & { logicalAddress: number }): Promise<void>;
}

export class HdmiCecAdapter extends BaseTransportAdapter {
  public readonly protocol = 'hdmi-cec' as const;

  public constructor(private readonly client: HdmiCecClient, commands: string[]) {
    super(commands);
  }

  async discover(): Promise<DiscoveryResult[]> {
    const devices = await this.client.listDevices();
    return devices.map((device) => ({ ...device, protocol: this.protocol }));
  }

  async sendCommand(deviceId: string, payload: CommandPayload): Promise<void> {
    const logicalAddress = parseInt(deviceId, 10);
    await this.client.transmit({ ...payload, logicalAddress });
  }
}
