/**
 * Encryption Utilities for Medical Record Data
 * 
 * Uses Web Crypto API for AES-GCM encryption.
 * Data is encrypted client-side before being stored on-chain.
 */

import type { EncryptedRecordData } from './types';

// Constants
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const VERSION = 1;

/**
 * Generate a cryptographically secure random nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a random field value for Aleo
 */
export function generateFieldNonce(): string {
  // Generate a random 253-bit number (Aleo field size)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Convert to BigInt and ensure it's within field bounds
  const bigInt = BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join(''));
  // Aleo field modulus is approximately 2^253, so we take modulo to be safe
  const fieldModulus = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041');
  const fieldValue = bigInt % fieldModulus;
  return fieldValue.toString() + 'field';
}

/**
 * Derive an encryption key from a password/private key
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(
  plaintext: string,
  encryptionKey: string
): Promise<EncryptedRecordData> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV and salt
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Derive key from encryption key
  const key = await deriveKey(encryptionKey, salt);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // Return as base64-encoded strings
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    version: VERSION,
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encrypted: EncryptedRecordData,
  encryptionKey: string
): Promise<string> {
  const decoder = new TextDecoder();

  // Decode from base64
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const salt = base64ToArrayBuffer(encrypted.salt);

  // Derive key from encryption key
  const key = await deriveKey(encryptionKey, new Uint8Array(salt));

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv) },
    key,
    ciphertext
  );

  return decoder.decode(plaintext);
}

/**
 * Hash data using SHA-256 (for data integrity)
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hash to Aleo field format
 */
export function hashToField(hash: string): string {
  // Take first 253 bits of the hash
  const bigInt = BigInt('0x' + hash.substring(0, 62)); // ~248 bits to be safe
  return bigInt.toString() + 'field';
}

/**
 * Split encrypted data into 4 field elements for on-chain storage
 * Each field can hold ~253 bits, so we have ~1012 bits total (~126 bytes)
 */
export function splitDataToFields(data: string): [string, string, string, string] {
  // Pad data to fixed length
  const maxLength = 124; // Leave some room for padding info
  const truncated = data.substring(0, maxLength);
  const padded = truncated.padEnd(maxLength, '\0');
  
  // Split into 4 chunks
  const chunkSize = Math.ceil(padded.length / 4);
  const chunks: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    const chunk = padded.substring(i * chunkSize, (i + 1) * chunkSize);
    // Convert to BigInt (using ASCII values)
    let bigInt = BigInt(0);
    for (let j = 0; j < chunk.length; j++) {
      bigInt = bigInt * BigInt(256) + BigInt(chunk.charCodeAt(j));
    }
    chunks.push(bigInt.toString() + 'field');
  }
  
  return chunks as [string, string, string, string];
}

/**
 * Reconstruct data from 4 field elements
 */
export function fieldsToData(fields: [string, string, string, string]): string {
  const chunkSize = 31; // Each chunk is ~31 bytes
  let result = '';
  
  for (const field of fields) {
    // Remove 'field' suffix and convert to BigInt
    const numStr = field.replace('field', '');
    let bigInt = BigInt(numStr);
    
    // Convert back to string
    const chars: string[] = [];
    while (bigInt > 0) {
      chars.unshift(String.fromCharCode(Number(bigInt % BigInt(256))));
      bigInt = bigInt / BigInt(256);
    }
    
    // Pad if needed
    while (chars.length < chunkSize) {
      chars.unshift('\0');
    }
    
    result += chars.join('');
  }
  
  // Remove null padding
  return result.replace(/\0+$/, '');
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Prepare medical record data for on-chain storage
 */
export async function prepareRecordData(
  plaintext: string,
  encryptionKey: string
): Promise<{
  fields: [string, string, string, string];
  dataHash: string;
  encryptedData: EncryptedRecordData;
}> {
  // Hash the original data for integrity
  const hash = await hashData(plaintext);
  const dataHash = hashToField(hash);
  
  // Encrypt the data
  const encryptedData = await encryptData(plaintext, encryptionKey);
  
  // Split ciphertext into fields for on-chain storage
  // Note: In production, you might store the full encrypted data off-chain
  // and only store a reference/hash on-chain
  const compactData = JSON.stringify({
    c: encryptedData.ciphertext.substring(0, 100), // Truncated for demo
    i: encryptedData.iv,
    s: encryptedData.salt,
  });
  
  const fields = splitDataToFields(compactData);
  
  return {
    fields,
    dataHash,
    encryptedData,
  };
}
