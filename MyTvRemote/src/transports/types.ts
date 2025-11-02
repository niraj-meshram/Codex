export interface DiscoveryResult {
  id: string;
  name: string;
  address: string;
  protocol: 'ir' | 'bluetooth' | 'wifi' | 'hdmi-cec';
  metadata?: Record<string, unknown>;
}

export interface CommandPayload {
  command: string;
  parameters?: Record<string, unknown>;
}

export interface TransportAdapter {
  readonly protocol: DiscoveryResult['protocol'];
  discover(): Promise<DiscoveryResult[]>;
  sendCommand(deviceId: string, payload: CommandPayload): Promise<void>;
  supportsCommand(command: string): boolean;
}
