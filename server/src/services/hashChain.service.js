const AuditLog = require('../models/AuditLog');
const { computeEntryHash } = require('../utils/cryptoHelper');
const { WorkflowError } = require('./workflowPersistence.service');

const GENESIS_HASH = '0'.repeat(64);
const MAX_BLOCKS = 1000;
const hashPattern = /^[a-f0-9]{64}$/;

function parseRange(query = {}) {
  const keys = Object.keys(query);
  if (keys.some(key => !['start_sequence', 'end_sequence'].includes(key))) {
    throw new WorkflowError(400, 'INVALID_QUERY', 'Only sequence range parameters are supported.');
  }
  const parse = value => typeof value === 'string' && /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value)) ? Number(value) : NaN;
  const start = parse(query.start_sequence);
  const end = parse(query.end_sequence);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start || end - start >= MAX_BLOCKS) {
    throw new WorkflowError(400, 'INVALID_QUERY', 'Supply an inclusive range of 1 to 1000 positive sequence numbers.');
  }
  return { start, end };
}

function createChainVerifier({ audits = AuditLog, now = () => new Date() } = {}) {
  return {
    async verifyChain(query) {
      const { start, end } = parseRange(query);
      const session = await audits.db.startSession();
      try {
        return await session.withTransaction(async () => {
          // Include the predecessor in the same snapshot to anchor partial ranges.
          const first = Math.max(1, start - 1);
          const entries = await audits.find({ sequence_index: { $gte: first, $lte: end } })
            .sort({ sequence_index: 1 }).limit(MAX_BLOCKS + 1).session(session).lean();
          if (entries.length !== end - first + 1 ||
              entries.some((entry, index) => entry.sequence_index !== first + index)) {
            throw new WorkflowError(409, 'AUDIT_RANGE_INCOMPLETE',
              'Requested audit range or its predecessor is missing.');
          }
          let previous = start === 1 ? GENESIS_HASH : entries.shift().entry_hash;
          const timestamp = now().toISOString();
          const broken = [];
          for (const entry of entries) {
            let calculated;
            try {
              if (!entry.actor || typeof entry.actor.user_id !== 'string' ||
                  !entry.actor.user_id || typeof entry.action !== 'string' || !entry.action ||
                  !entry.timestamp || !hashPattern.test(entry.previous_entry_hash)) throw new Error('Invalid audit entry');
              calculated = computeEntryHash({ sequenceIndex: entry.sequence_index,
                previousEntryHash: entry.previous_entry_hash, timestamp: entry.timestamp,
                actorId: entry.actor.user_id, action: entry.action, stateDelta: entry.state_delta });
            } catch {
              throw new WorkflowError(409, 'AUDIT_ENTRY_INVALID', 'An audit entry cannot be verified.');
            }
            if (!hashPattern.test(entry.entry_hash) || calculated !== entry.entry_hash ||
                entry.previous_entry_hash !== previous) {
              broken.push({ sequence_index: entry.sequence_index,
                recorded_hash: String(entry.entry_hash ?? ''), calculated_hash: calculated,
                target_entity: entry.target_entity?.collection_name || '',
                entity_id: entry.target_entity?.entity_id || '', tamper_detected_at: timestamp });
            }
            previous = entry.entry_hash;
          }
          return { is_chain_valid: broken.length === 0, total_blocks_verified: entries.length,
            verification_timestamp: timestamp, genesis_hash: GENESIS_HASH,
            head_hash: broken.length ? `INVALID_HASH_AT_SEQUENCE_${broken[0].sequence_index}` : previous,
            broken_blocks: broken };
        }, { readConcern: { level: 'snapshot' }, readPreference: 'primary' });
      } finally {
        await session.endSession();
      }
    }
  };
}

module.exports = { createChainVerifier, parseRange };
