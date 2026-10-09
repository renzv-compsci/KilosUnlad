import { api } from './api';

export interface AuditRange { start: number; end: number }
export interface AuditVerification {
  is_chain_valid: boolean;
  total_blocks_verified: number;
  verification_timestamp: string;
  genesis_hash: string;
  head_hash: string;
  broken_blocks: Array<{
    sequence_index: number;
    recorded_hash: string;
    calculated_hash: string;
    target_entity: string;
    entity_id: string;
    tamper_detected_at: string;
  }>;
}

export function parseAuditRange(startText: string, endText: string): AuditRange {
  const start = Number(startText);
  const end = Number(endText);
  if (!/^[1-9]\d*$/.test(startText) || !/^[1-9]\d*$/.test(endText) ||
      !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start || end - start >= 1000) {
    throw new Error('Enter positive whole sequence numbers, with the end at or after the start (maximum 1,000 blocks).');
  }
  return { start, end };
}

export function parseAuditVerification(value: unknown, range: AuditRange): AuditVerification {
  const result = value as AuditVerification | null;
  const hash = /^[a-f0-9]{64}$/;
  if (!result || typeof result.is_chain_valid !== 'boolean' ||
      result.total_blocks_verified !== range.end - range.start + 1 ||
      typeof result.verification_timestamp !== 'string' || !Number.isFinite(Date.parse(result.verification_timestamp)) ||
      result.genesis_hash !== '0'.repeat(64) || typeof result.head_hash !== 'string' ||
      !Array.isArray(result.broken_blocks) ||
      result.is_chain_valid !== (result.broken_blocks.length === 0) ||
      (result.is_chain_valid && !hash.test(result.head_hash)) ||
      result.broken_blocks.some(block => !block || !Number.isSafeInteger(block.sequence_index) ||
        block.sequence_index < range.start || block.sequence_index > range.end ||
        typeof block.recorded_hash !== 'string' || typeof block.calculated_hash !== 'string' ||
        !hash.test(block.calculated_hash) || typeof block.target_entity !== 'string' ||
        typeof block.entity_id !== 'string' || typeof block.tamper_detected_at !== 'string' ||
        !Number.isFinite(Date.parse(block.tamper_detected_at))) ||
      new Set(result.broken_blocks.map(block => block.sequence_index)).size !== result.broken_blocks.length) {
    throw new Error('The backend returned an invalid verification response. No integrity result is available.');
  }
  return result;
}

export async function verifyAuditChain(range: AuditRange, signal?: AbortSignal): Promise<AuditVerification> {
  parseAuditRange(String(range.start), String(range.end));
  const response = await api.get('/audit/verify-chain', {
    signal, params: { start_sequence: range.start, end_sequence: range.end },
  });
  if (response.headers['x-kilosunlad-mock'] === 'true') throw new Error('Disable backend mock mode before verifying audit records.');
  return parseAuditVerification(response.data?.data ?? response.data, range);
}
