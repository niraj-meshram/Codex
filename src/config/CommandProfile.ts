import { DiscoveryResult } from '../transports/types';

export interface CommandProfileEntry {
  protocols: DiscoveryResult['protocol'][];
  deviceIds?: string[];
}

export type CommandProfile = Record<string, CommandProfileEntry>;

export const defaultCommandProfile: CommandProfile = {
  powerOn: { protocols: ['wifi', 'bluetooth', 'ir', 'hdmi-cec'] },
  powerOff: { protocols: ['wifi', 'bluetooth', 'ir', 'hdmi-cec'] },
  volumeUp: { protocols: ['wifi', 'bluetooth', 'ir', 'hdmi-cec'] },
  volumeDown: { protocols: ['wifi', 'bluetooth', 'ir', 'hdmi-cec'] },
  launchNetflix: { protocols: ['wifi'] },
  openSettings: { protocols: ['wifi', 'bluetooth'] }
};
