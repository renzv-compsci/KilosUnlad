// Internal prerequisite only. Inputs must be server-loaded records and Dates.
// Provisional interval: declared_at <= now < expires_at; omitted expiry is open-ended.
// Confirm these semantics before connecting automatic compliance workflows.
function invalid() {
  throw new TypeError('Valid stored calamity zones, household location and server time are required.');
}
const text = value => typeof value === 'string' && value.trim().length > 0;
function time(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) invalid();
  return value.getTime();
}

function hasActiveCalamityMoratorium({ zones, address, now } = {}) {
  if (!Array.isArray(zones) || !address || !text(address.province) || !text(address.municipality)) invalid();
  const current = time(now);
  // Validate the entire configuration before evaluating; malformed data must not
  // silently clear a hold or hide behind an earlier matching entry.
  const intervals = zones.map(zone => {
    if (!zone || !text(zone.province) || !text(zone.municipality) || typeof zone.is_active !== 'boolean') invalid();
    const start = time(zone.declared_at);
    const end = zone.expires_at === undefined ? Infinity : time(zone.expires_at);
    if (end <= start) invalid();
    return { zone, start, end };
  });
  return intervals.some(({ zone, start, end }) => zone.is_active &&
    zone.province === address.province && zone.municipality === address.municipality &&
    current >= start && current < end);
}

module.exports = { hasActiveCalamityMoratorium };
