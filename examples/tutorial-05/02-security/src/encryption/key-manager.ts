/**
 * Key Manager
 * Manages encryption keys with rotation support
 */

import { generateKey as generateEncryptionKey } from './crypto.js';

export interface KeyInfo {
  id: string;
  value: string;
  created: number;
  expires?: number;
  active: boolean;
}

export class KeyManager {
  private keys: Map<string, KeyInfo> = new Map();
  private currentKeyId?: string;

  constructor(masterKey?: string) {
    if (masterKey) {
      this.initializeFromMasterKey(masterKey);
    }
  }

  /**
   * Initialize from master key
   */
  private initializeFromMasterKey(masterKey: string): void {
    const keyInfo: KeyInfo = {
      id: 'master',
      value: masterKey,
      created: Date.now(),
      active: true
    };

    this.keys.set('master', keyInfo);
    this.currentKeyId = 'master';
  }

  /**
   * Generate new key
   */
  async generateKey(expiresIn?: number): Promise<KeyInfo> {
    const keyInfo: KeyInfo = {
      id: this.generateKeyId(),
      value: await generateEncryptionKey(),
      created: Date.now(),
      expires: expiresIn ? Date.now() + expiresIn : undefined,
      active: true
    };

    this.keys.set(keyInfo.id, keyInfo);
    this.currentKeyId = keyInfo.id;

    return keyInfo;
  }

  /**
   * Get current active key
   */
  async getCurrentKey(): Promise<KeyInfo> {
    if (!this.currentKeyId) {
      await this.generateKey();
    }

    const key = this.keys.get(this.currentKeyId!);
    if (!key) {
      throw new Error('Current key not found');
    }

    return key;
  }

  /**
   * Get key by ID
   */
  async getKey(keyId: string): Promise<KeyInfo | undefined> {
    return this.keys.get(keyId);
  }

  /**
   * Deactivate key
   */
  deactivateKey(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.active = false;
    }
  }

  /**
   * Rotate keys
   */
  async rotateKeys(): Promise<void> {
    // Deactivate old key
    if (this.currentKeyId) {
      this.deactivateKey(this.currentKeyId);
    }

    // Generate new key
    await this.generateKey();
  }

  /**
   * Get all key info
   */
  getKeyInfo(): Array<{ keyId: string; created: number; active: boolean }> {
    return Array.from(this.keys.values()).map(key => ({
      keyId: key.id,
      created: key.created,
      active: key.active
    }));
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys(): void {
    const now = Date.now();
    for (const [id, key] of this.keys.entries()) {
      if (key.expires && key.expires < now && !key.active) {
        this.keys.delete(id);
      }
    }
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
