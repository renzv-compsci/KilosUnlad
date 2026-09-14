const crypto = require('crypto');
const canonicalStringify = require('./canonicalJson');

/**
 * Calculates a standard SHA-256 hex string from raw data or string.
 * @param {string|Buffer} data - Data to hash
 * @returns {string} - 64-character hex string
 */
const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Calculates the Digital Seal hash for an audit log entry.
 * Mathematically binds the current event to the previous entry's hash.
 * 
 * Formula: SHA-256( sequence_index + previous_hash + timestamp + actor_id + action + canonical_delta )
 */
const computeEntryHash = ({
  sequenceIndex,
  previousEntryHash,
  timestamp,
  actorId,
  action,
  stateDelta
}) => {
  const normalizedDelta = canonicalStringify(stateDelta || {});
  const payloadString = `${sequenceIndex}:${previousEntryHash}:${timestamp}:${actorId}:${action}:${normalizedDelta}`;
  
  return sha256(payloadString);
};

module.exports = {
  sha256,
  computeEntryHash
};