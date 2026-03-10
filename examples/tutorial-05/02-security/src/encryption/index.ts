/**
 * Encryption Manager
 * Handles data encryption and decryption using AES-256-GCM
 */

import { generateKey, encryptData, decryptData, hashData } from './crypto.js';
import { KeyManager } from './key-manager.js';

export interface EncryptionOptions {
  key?: string;
  keyId?: string;
  algorithm?: 'AES-256-GCM' | 'AES-256-CBC';
  keyDerivation?: {
    iterations: number;
    salt: string;
  };
}

export interface EncryptedData {
  data: string;
  iv: string;
  keyId?: string;
  algorithm: string;
  timestamp: number;
}

export class EncryptionManager {
  private keyManager: KeyManager;
  private algorithm: string;

  constructor(options: EncryptionOptions = {}) {
    this.keyManager = new KeyManager(options.key);
    this.algorithm = options.algorithm || 'AES-256-GCM';
  }

  /**
   * Encrypt data
   */
  async encrypt(data: any): Promise<EncryptedData> {
    const key = await this.keyManager.getCurrentKey();
    const dataString = JSON.stringify(data);

    const encrypted = await encryptData(dataString, key, this.algorithm);

    return {
      data: encrypted.data,
      iv: encrypted.iv,
      keyId: key.id,
      algorithm: this.algorithm,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: EncryptedData): Promise<any> {
    const key = encryptedData.keyId
      ? await this.keyManager.getKey(encryptedData.keyId)
      : await this.keyManager.getCurrentKey();

    if (!key) {
      throw new Error('Encryption key not found');
    }

    const decrypted = await decryptData(
      encryptedData.data,
      encryptedData.iv,
      key.value,
      encryptedData.algorithm
    );

    return JSON.parse(decrypted);
  }

  /**
   * Encrypt bulk data
   */
  async encryptBulk(items: any[]): Promise<EncryptedData[]> {
    return Promise.all(items.map(item => this.encrypt(item)));
  }

  /**
   * Decrypt bulk data
   */
  async decryptBulk(items: EncryptedData[]): Promise<any[]> {
    return Promise.all(items.map(item => this.decrypt(item)));
  }

  /**
   * Hash data
   */
  async hash(data: string): Promise<string> {
    return hashData(data);
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string): Promise<boolean> {
    const computedHash = await this.hash(data);
    return computedHash === hash;
  }

  /**
   * Generate new encryption key
   */
  async generateKey(): Promise<void> {
    await this.keyManager.generateKey();
  }

  /**
   * Rotate keys
   */
  async rotateKeys(): Promise<void> {
    await this.keyManager.rotateKeys();
  }

  /**
   * Get key info
   */
  async getKeyInfo(): Promise<{ keyId: string; created: number }[]> {
    return this.keyManager.getKeyInfo();
  }
}
