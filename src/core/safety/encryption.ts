/** Portable AES-256-GCM helpers for optional encrypted global memory adapters. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Derive a 32-byte key from a passphrase. */
export function deriveKey(secret: string): any {
  return createHash('sha256').update(secret).digest();
}

/** Encrypt UTF-8 text with AES-256-GCM. */
export function encryptText(text: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, body]).toString('base64');
}

/** Decrypt text produced by encryptText. */
export function decryptText(payload: string, secret: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const body = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}
