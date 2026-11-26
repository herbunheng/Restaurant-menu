const PBKDF2_PREFIX = 'pbkdf2:';
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Web Crypto PBKDF2-HMAC-SHA256 Password Hashing Utility
 * (100% native to Cloudflare Workers and Web API standards)
 * Format: pbkdf2:100000:<salt_hex>:<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BYTES * 8
  );

  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedBits)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Legacy SHA-256 password hashing helper for backwards compatibility
 */
export async function hashPasswordLegacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':app_salt_cloudflare_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface VerifyPasswordResult {
  isValid: boolean;
  isLegacy: boolean;
}

/**
 * Verifies if plain text password matches stored hash (PBKDF2 or legacy SHA-256).
 */
export async function verifyPassword(password: string, storedHash: string): Promise<VerifyPasswordResult> {
  if (!storedHash) {
    return { isValid: false, isLegacy: false };
  }

  // Check if hash is in new PBKDF2 format: pbkdf2:100000:<saltHex>:<hashHex>
  if (storedHash.startsWith(PBKDF2_PREFIX)) {
    const parts = storedHash.slice(PBKDF2_PREFIX.length).split(':');
    if (parts.length !== 3) {
      return { isValid: false, isLegacy: false };
    }

    const iterations = parseInt(parts[0], 10);
    const saltHex = parts[1];
    const expectedHashHex = parts[2];

    const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_BYTES * 8
    );

    const actualHashHex = Array.from(new Uint8Array(derivedBits)).map((b) => b.toString(16).padStart(2, '0')).join('');

    return {
      isValid: actualHashHex === expectedHashHex,
      isLegacy: false,
    };
  }

  // Fallback: Legacy SHA-256 hash comparison
  const legacyHash = await hashPasswordLegacy(password);
  const isValid = legacyHash === storedHash;

  return {
    isValid,
    isLegacy: true,
  };
}

const CONFIG_SECRET = 'app_public_config_secret_key_2026';

/**
 * Double Encrypts a JWT token string using Web Crypto AES-256-GCM
 * Output format: enc:v1:<iv_hex>:<ciphertext_hex>
 */
export async function encryptToken(token: string, customSecret?: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = customSecret || CONFIG_SECRET;
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );

  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(encryptedBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `enc:v1:${ivHex}:${cipherHex}`;
}

/**
 * Decrypts a double-encrypted token string back into raw JWT
 */
export async function decryptToken(token: string, customSecret?: string): Promise<string> {
  if (!token || !token.startsWith('enc:v1:')) {
    // If not double-encrypted, return as plain token for backward compatibility
    return token;
  }

  const parts = token.slice('enc:v1:'.length).split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid double-encrypted token format');
  }

  const ivHex = parts[0];
  const cipherHex = parts[1];

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);

  const encoder = new TextEncoder();
  const secretKey = customSecret || CONFIG_SECRET;
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypts a JSON payload using Web Crypto AES-256-GCM
 * Returns payload in format: <iv_hex>:<ciphertext_hex>
 */
export async function encryptConfigPayload(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const jsonStr = JSON.stringify(data);

  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(CONFIG_SECRET));
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(jsonStr)
  );

  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(encryptedBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${ivHex}:${cipherHex}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string (<iv_hex>:<ciphertext_hex>) back into JSON payload
 */
export async function decryptConfigPayload<T = any>(encryptedStr: string): Promise<T> {
  const parts = encryptedStr.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted config payload format');
  }

  const ivHex = parts[0];
  const cipherHex = parts[1];

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(CONFIG_SECRET));
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}

