/**
 * Aleo Utility Functions
 * 
 * Helper functions to encode/decode data for Aleo blockchain transactions
 */

import type { RecordType } from '@/types/records';

/**
 * Convert a string to bytes and then to field elements
 * Each field can hold ~31 bytes safely (we'll use 30 to be safe)
 */
export function stringToFieldElements(data: string): [string, string, string, string] {
  // Convert string to bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  // Split into 4 parts (30 bytes each max)
  const part1 = bytes.slice(0, 30);
  const part2 = bytes.slice(30, 60);
  const part3 = bytes.slice(60, 90);
  const part4 = bytes.slice(90, 120);
  
  // Convert each part to a field element
  const field1 = bytesToField(part1);
  const field2 = bytesToField(part2);
  const field3 = bytesToField(part3);
  const field4 = bytesToField(part4);
  
  return [field1, field2, field3, field4];
}

/**
 * Convert bytes to a field element (as a decimal string + 'field')
 */
function bytesToField(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '0field';
  }
  
  // Convert bytes to a big integer
  let value = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    value = (value << BigInt(8)) | BigInt(bytes[i]);
  }
  
  return `${value.toString()}field`;
}

/**
 * Convert field elements back to string
 */
export function fieldElementsToString(
  field1: string,
  field2: string,
  field3: string,
  field4: string
): string {
  const bytes1 = fieldToBytes(field1);
  const bytes2 = fieldToBytes(field2);
  const bytes3 = fieldToBytes(field3);
  const bytes4 = fieldToBytes(field4);
  
  // Combine all bytes
  const allBytes = new Uint8Array([...bytes1, ...bytes2, ...bytes3, ...bytes4]);
  
  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(allBytes);
}

/**
 * Convert a field element string to bytes
 */
function fieldToBytes(fieldStr: string): Uint8Array {
  // Remove 'field' suffix
  const valueStr = fieldStr.replace('field', '');
  
  if (valueStr === '0' || valueStr === '') {
    return new Uint8Array(0);
  }
  
  let value = BigInt(valueStr);
  const bytes: number[] = [];
  
  // Extract bytes
  while (value > 0) {
    bytes.unshift(Number(value & BigInt(0xff)));
    value = value >> BigInt(8);
  }
  
  return new Uint8Array(bytes);
}

/**
 * Hash data using a simple hash function (for data_hash)
 * In production, you might want to use a more robust hash
 */
export function hashData(data: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  // Simple hash: sum of all bytes multiplied by their position
  let hash = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    hash = hash + BigInt(bytes[i]) * BigInt(i + 1);
  }
  
  // Make it more random by adding a large prime
  hash = hash * BigInt(31) + BigInt(17);
  
  return `${hash.toString()}field`;
}

/**
 * Generate a random nonce for unique ID generation
 */
export function generateNonce(): string {
  // Generate a random bigint nonce
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  
  let nonce = BigInt(0);
  for (let i = 0; i < randomBytes.length; i++) {
    nonce = (nonce << BigInt(8)) | BigInt(randomBytes[i]);
  }
  
  return `${nonce.toString()}field`;
}

/**
 * Create the data string from title and description
 */
export function createRecordData(title: string, description: string): string {
  const data = {
    t: title,
    d: description,
  };
  
  return JSON.stringify(data);
}

/**
 * Format record type for Aleo transaction
 */
export function formatRecordType(recordType: RecordType): string {
  return `${recordType}u8`;
}

/**
 * Format boolean for Aleo transaction
 */
export function formatBoolean(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * Prepare inputs for create_record transaction
 */
export interface CreateRecordInputs {
  data_part1: string;
  data_part2: string;
  data_part3: string;
  data_part4: string;
  record_type: string;
  data_hash: string;
  nonce: string;
  make_discoverable: string;
}

export function prepareCreateRecordInputs(
  title: string,
  description: string,
  recordType: RecordType,
  makeDiscoverable: boolean = true
): CreateRecordInputs {
  // Create the data string
  const dataStr = createRecordData(title, description);
  
  // Convert to field elements
  const [part1, part2, part3, part4] = stringToFieldElements(dataStr);
  
  // Hash the data
  const dataHash = hashData(dataStr);
  
  // Generate a random nonce
  const nonce = generateNonce();
  
  return {
    data_part1: part1,
    data_part2: part2,
    data_part3: part3,
    data_part4: part4,
    record_type: formatRecordType(recordType),
    data_hash: dataHash,
    nonce: nonce,
    make_discoverable: formatBoolean(makeDiscoverable),
  };
}

/**
 * Convert inputs to array format for executeTransaction
 */
export function inputsToArray(inputs: CreateRecordInputs): string[] {
  return [
    inputs.data_part1,
    inputs.data_part2,
    inputs.data_part3,
    inputs.data_part4,
    inputs.record_type,
    inputs.data_hash,
    inputs.nonce,
    inputs.make_discoverable,
  ];
}
