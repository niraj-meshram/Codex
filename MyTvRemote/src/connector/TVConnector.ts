import { DiscoveryResult } from '../transports/types';

export interface ConnectResult {
  ok: boolean;
  requiresAuth?: boolean;
  message?: string;
}

export interface TVConnector {
  readonly vendor: string;
  canHandle(device: DiscoveryResult): boolean;
  connect(device: DiscoveryResult, credentials?: Record<string, unknown>): Promise<ConnectResult>;
}

