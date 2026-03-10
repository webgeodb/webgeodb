/**
 * Cryptographic Utilities
 * Provides encryption, decryption, and hashing functions
 */

import * as crypto from 'crypto';

export interface EncryptionResult {
  data: string;
  iv: string;
  authTag?: string;
}

/**
 * Generate random encryption key
 */
export async function generateKey(): Promise<string> {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate random IV
 */
export function generateIV(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptData(
  data: string,
  key: string,
  algorithm: string = 'AES-256-GCM'
): Promise<EncryptionResult> {
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = generateIV();
  const ivBuffer = Buffer.from(iv, 'hex');

  let cipher: crypto.CipherGCM | crypto.Cipher;

  if (algorithm === 'AES-256-GCM') {
    cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, ivBuffer);
  } else {
    cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  }

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const result: EncryptionResult = {
    data: encrypted,
    iv: iv
  };

  if (algorithm === 'AES-256-GCM' && 'getAuthTag' in cipher) {
    result.authTag = (cipher as crypto.CipherGCM).getAuthTag().toString('hex');
  }

  return result;
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(
  encryptedData: string,
  iv: string,
  key: string,
  algorithm: string = 'AES-256-GCM'
): Promise<string> {
  const keyBuffer = Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const dataBuffer = Buffer.from(encryptedData, 'hex');

  let decipher: crypto.DecipherGCM | crypto.Decipher;

  if (algorithm === 'AES-256-GCM') {
    decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
  } else {
    decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  }

  let decrypted = decipher.update(dataBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Hash data using SHA-256
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data with salt
 */
export function hashDataWithSalt(data: string, salt: string): string {
  return crypto.createHash('sha256').update(data + salt).digest('hex');
}

/**
 * Generate random salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Derive key from password using PBKDF2
 */
export function deriveKey(
  password: string,
  salt: string,
  iterations: number = 100000
): string {
  return crypto
    .pbkdf2Sync(password, salt, iterations, 32, 'sha256')
    .toString('hex');
}

/**
 * Generate HMAC signature
 */
export function generateHMAC(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, key: string, signature: string): boolean {
  const computed = generateHMAC(data, key);
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(signature, 'hex')
  );
}
