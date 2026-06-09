/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShareableFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // Standard browsers blob url or base64 representation
  blob?: Blob;
}

export interface TransferLog {
  id: string;
  fileName: string;
  fileCount: number;
  totalSize: number;
  type: 'send' | 'receive';
  status: 'completed' | 'failed' | 'in_progress';
  progress: number; // 0 to 100
  timestamp: string;
  speed: string; // e.g., "45.2 MB/s"
  peerDeviceName: string;
}

export interface NetworkConfig {
  ipAddress: string;
  port: number;
  ssid: string;
  isConnected: boolean;
}

export interface SubscriptionState {
  isPremium: boolean;
  priceNaira: number;
  activatedAt?: string;
}

export interface DevicePreference {
  deviceName: string;
  avatarId: string;
}
