const stringify = require('fast-json-stable-stringify');

/**
 * Deterministically stringifies a JavaScript object.
 * Guarantees identical string output regardless of key insertion order.
 * @param {Object} data - The payload to serialize
 * @returns {string} - Canonically sorted JSON string
 */
const canonicalStringify = (data) => {
  if (!data) return '';
  return stringify(data);
};

module.exports = canonicalStringify;