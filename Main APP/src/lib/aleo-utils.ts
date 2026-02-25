/**
 * Aleo Utility Functions
 * 
 * Helper functions to encode/decode data for Aleo blockchain transactions
 */

import type { RecordType } from '@/types/records';

const NUM_FIELD_PARTS = 8;
const BYTES_PER_FIELD = 30;

/**
 * Convert a string to bytes and then to field elements
 * Using 8 fields to get ~240 bytes capacity
 */
export function stringToFieldElements(data: string): string[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  const fields: string[] = [];
  
  for (let i = 0; i < NUM_FIELD_PARTS; i++) {
    const start = i * BYTES_PER_FIELD;
    const end = Math.min(start + BYTES_PER_FIELD, bytes.length);
    const part = bytes.slice(start, end);
    fields.push(bytesToField(part));
  }
  
  // Pad remaining fields with zeros
  while (fields.length < NUM_FIELD_PARTS) {
    fields.push('0field');
  }
  
  return fields;
}

/**
 * Convert bytes to a field element (as a decimal string + 'field')
 */
function bytesToField(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '0field';
  }
  
  let value = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    value = (value << BigInt(8)) | BigInt(bytes[i]);
  }
  
  return `${value.toString()}field`;
}

/**
 * Convert field elements back to string
 */
export function fieldElementsToString(fields: string[]): string {
  const allBytes: number[] = [];
  
  for (const fieldStr of fields) {
    const bytes = fieldToBytes(fieldStr);
    allBytes.push(...bytes);
  }
  
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(allBytes));
}

/**
 * Convert a field element string to bytes
 */
function fieldToBytes(fieldStr: string): Uint8Array {
  const valueStr = fieldStr.replace('field', '');
  
  if (valueStr === '0' || valueStr === '') {
    return new Uint8Array(0);
  }
  
  let value = BigInt(valueStr);
  const bytes: number[] = [];
  
  while (value > 0) {
    bytes.unshift(Number(value & BigInt(0xff)));
    value = value >> BigInt(8);
  }
  
  return new Uint8Array(bytes);
}

/**
 * Hash data using a simple hash function (for data_hash)
 */
export function hashData(data: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  let hash = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    hash = hash + BigInt(bytes[i]) * BigInt(i + 1);
  }
  
  hash = hash * BigInt(31) + BigInt(17);
  
  return `${hash.toString()}field`;
}

/**
 * Generate a random nonce for unique ID generation
 */
export function generateNonce(): string {
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
  data_part5: string;
  data_part6: string;
  data_part7: string;
  data_part8: string;
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
  const dataStr = createRecordData(title, description);
  
  const [part1, part2, part3, part4, part5, part6, part7, part8] = stringToFieldElements(dataStr);
  
  const dataHash = hashData(dataStr);
  const nonce = generateNonce();
  
  return {
    data_part1: part1,
    data_part2: part2,
    data_part3: part3,
    data_part4: part4,
    data_part5: part5,
    data_part6: part6,
    data_part7: part7,
    data_part8: part8,
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
    inputs.data_part5,
    inputs.data_part6,
    inputs.data_part7,
    inputs.data_part8,
    inputs.record_type,
    inputs.data_hash,
    inputs.nonce,
    inputs.make_discoverable,
  ];
}
