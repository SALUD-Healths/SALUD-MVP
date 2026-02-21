import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useRecordsStore } from '@/store';
import { fieldElementsToString } from '@/lib/aleo-utils';
import type { MedicalRecord, RecordType } from '@/types/records';

const PROGRAM_ID = 'salud_health_records_v2.aleo';
const API_URL = 'https://api.provable.com/v2/testnet';

interface WalletRecord {
  recordPlaintext?: string;
  recordCiphertext?: string;
  nonce?: string;
  spent?: boolean;
}

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32ToInt(str: string): bigint {
  let value = BigInt(0);
  for (const c of str) {
    const idx = BigInt(CHARSET.indexOf(c.toLowerCase()));
    value = (value * BigInt(32)) + idx;
  }
  return value;
}

function addressToField(address: string): string {
  try {
    if (!address.startsWith('aleo1')) {
      return '0';
    }
    const data = address.slice(5);
    const dataPart = data.slice(0, -6);
    return bech32ToInt(dataPart).toString();
  } catch {
    return '0';
  }
}

function parseRecordType(typeStr: string | number): RecordType {
  if (typeof typeStr === 'number') {
    if (typeStr >= 1 && typeStr <= 10) return typeStr as RecordType;
    return 10;
  }
  const match = String(typeStr).match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 10) return num as RecordType;
  }
  return 10;
}

function parseRecordPlaintext(plaintextStr: string, ownerAddress: string): MedicalRecord | null {
  try {
    console.log('Parsing plaintext string:', plaintextStr);
    
    let jsObject: Record<string, unknown>;
    
    const extractValue = (key: string): string => {
      const regex = new RegExp(`${key}:\\s*([^,\\n]+)`);
      const match = plaintextStr.match(regex);
      return match ? match[1].trim() : '';
    };
    
    jsObject = {
      owner: extractValue('owner'),
      record_id: extractValue('record_id'),
      data_hash: extractValue('data_hash'),
      data_part1: extractValue('data_part1'),
      data_part2: extractValue('data_part2'),
      data_part3: extractValue('data_part3'),
      data_part4: extractValue('data_part4'),
      record_type: extractValue('record_type'),
      created_at: extractValue('created_at'),
      version: extractValue('version'),
    };
    
    for (const key of Object.keys(jsObject)) {
      const value = jsObject[key] as string;
      jsObject[key] = value.replace(/\.private$/, '').replace(/\.public$/, '')
        .replace(/u64$/, '').replace(/u32$/, '').replace(/u16$/, '').replace(/u8$/, '')
        .replace(/field$/, '').replace(/group$/, '').replace(/scalar$/, '');
    }
    console.log('JsObject:', jsObject);

    const dataPart1 = String(jsObject.data_part1 || '0').replace(/field$/, '');
    const dataPart2 = String(jsObject.data_part2 || '0').replace(/field$/, '');
    const dataPart3 = String(jsObject.data_part3 || '0').replace(/field$/, '');
    const dataPart4 = String(jsObject.data_part4 || '0').replace(/field$/, '');

    console.log('Data parts:', { dataPart1, dataPart2, dataPart3, dataPart4 });

    const dataStr = fieldElementsToString(
      `${dataPart1}field`,
      `${dataPart2}field`,
      `${dataPart3}field`,
      `${dataPart4}field`
    );

    console.log('dataStr:', dataStr);

    let title = 'Onchain Record';
    let description = '';
    let createdAt = new Date();

    try {
      const jsonData = JSON.parse(dataStr);
      title = jsonData.title || title;
      description = jsonData.description || description;
      if (jsonData.timestamp) createdAt = new Date(jsonData.timestamp);
    } catch {
      if (dataStr && dataStr !== '0') {
        title = dataStr.slice(0, 40);
      }
    }

    const recordId = String(jsObject.record_id || '0').replace(/field$/, '');
    const dataHash = String(jsObject.data_hash || '0').replace(/field$/, '');
    const recordType = typeof jsObject.record_type === 'number' 
      ? jsObject.record_type 
      : parseRecordType(String(jsObject.record_type || '10'));

    return {
      id: recordId || crypto.randomUUID(),
      recordId: recordId || dataHash,
      title,
      description,
      recordType: recordType as RecordType,
      data: dataStr,
      dataHash,
      createdAt,
      updatedAt: createdAt,
      isEncrypted: true,
      ownerAddress,
    };
  } catch (error) {
    console.error('Error parsing record:', error);
    return null;
  }
}

export function useSyncRecords() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const { requestRecords, decrypt, connected, address } = useWallet();
  const syncRecords = useRecordsStore((state) => state.syncRecords);
  const setOnchainCount = useRecordsStore((state) => state.setOnchainCount);
  const onchainCount = useRecordsStore((state) => state.onchainCount);

  const fetchOnchainCount = useCallback(async (walletAddress: string): Promise<number> => {
    try {
      const addressField = addressToField(walletAddress);
      
      const response = await fetch(
        `${API_URL}/programs/${PROGRAM_ID}/mapping/patient_record_count/${addressField}`
      );
      
      if (!response.ok) {
        console.log('Mapping fetch failed:', response.status, response.statusText);
        setOnchainCount(0);
        return 0;
      }
      
      const count = await response.text();
      
      if (!count || count === 'null') {
        setOnchainCount(0);
        return 0;
      }
      
      const countNum = parseInt(String(count).replace(/field$/, '').replace(/u64$/, '').replace(/u32$/, '').replace(/u8$/, ''), 10);
      setOnchainCount(countNum);
      return countNum;
    } catch (error) {
      console.error('Error fetching onchain count:', error);
      return 0;
    }
  }, [setOnchainCount]);

  const sync = useCallback(async () => {
    if (!connected || !address) {
      setSyncError('Wallet not connected');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      await fetchOnchainCount(address);

      if (!requestRecords) {
        setSyncError('Wallet does not support record fetching');
        return;
      }

      const records = await requestRecords(PROGRAM_ID, true) as WalletRecord[];
      
      console.log('Wallet requestRecords result:', records);
      console.log('Is array:', Array.isArray(records));
      
      if (!Array.isArray(records)) {
        console.log('No records returned from wallet');
        return;
      }

      console.log('Records count:', records.length);
      console.log('First record keys:', Object.keys(records[0]));
      console.log('First record:', records[0]);

      const transformedRecords: MedicalRecord[] = [];

      for (const record of records) {
        if (record.spent) continue;
        
        let plaintext: string | undefined;
        
        if (record.recordPlaintext) {
          plaintext = record.recordPlaintext;
          console.log('Found plaintext record');
          console.log('Plaintext:', plaintext);
        } else if (record.recordCiphertext && decrypt) {
          try {
            console.log('Decrypting ciphertext record...');
            plaintext = await decrypt(record.recordCiphertext);
            console.log('Decryption successful');
          } catch (e) {
            console.warn('Failed to decrypt record:', e);
            continue;
          }
        } else {
          console.log('No recordPlaintext or recordCiphertext found, skipping');
        }

        if (plaintext) {
          console.log('Attempting to parse plaintext...');
          const transformed = parseRecordPlaintext(plaintext, address);
          console.log('Transformed result:', transformed);
          if (transformed) {
            transformedRecords.push(transformed);
          } else {
            console.warn('Failed to parse record, skipping');
          }
        }
      }

      if (transformedRecords.length > 0) {
        console.log('Syncing records to store:', transformedRecords.length);
        syncRecords(transformedRecords);
      } else {
        console.log('No records to sync');
      }

      return transformedRecords.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync records';
      console.error('Sync error:', error);
      setSyncError(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [connected, address, requestRecords, decrypt, syncRecords, fetchOnchainCount]);

  const lastSyncAt = useRecordsStore((state) => state.lastSyncAt);

  return {
    sync,
    fetchOnchainCount,
    isSyncing,
    syncError,
    onchainCount,
    canSync: connected && !!address,
    lastSyncAt,
  };
}
