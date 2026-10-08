const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateRiskScore } = require('../src/services/discrepancy.service');
const base = { swdiDifference: 0, power: false, water: false, telecom: false, vehicle: false };

test('zero risk and individual documented contributions', () => {
  assert.deepEqual(calculateRiskScore(base), { score: 0, meetsFlagThreshold: false,
    contributions: { swdi: 0, power: 0, water: 0, telecom: 0, vehicle: 0 } });
  for (const [key, points] of [['power', 20], ['water', 15], ['telecom', 25], ['vehicle', 30]]) {
    const result = calculateRiskScore({ ...base, [key]: true });
    assert.equal(result.score, points);
    assert.equal(result.meetsFlagThreshold, false);
  }
  assert.equal(calculateRiskScore({ ...base, swdiDifference: 1 }).score, 40);
  assert.equal(calculateRiskScore({ ...base, swdiDifference: 2 }).score, 80);
});

test('flagging threshold is inclusive at 70 and the score caps at 100', () => {
  assert.equal(calculateRiskScore({ ...base, swdiDifference: 1, telecom: true }).meetsFlagThreshold, false);
  assert.deepEqual(calculateRiskScore({ ...base, swdiDifference: 1, vehicle: true }), {
    score: 70, meetsFlagThreshold: true, contributions: { swdi: 40, power: 0, water: 0, telecom: 0, vehicle: 30 }
  });
  assert.equal(calculateRiskScore({ ...base, swdiDifference: 2, power: true }).score, 100);
  const result = calculateRiskScore({ swdiDifference: 2, power: true, water: true, telecom: true, vehicle: true });
  assert.equal(result.score, 100);
  assert.equal(result.meetsFlagThreshold, true);
  assert.equal(Object.values(result.contributions).reduce((a, b) => a + b), 170);
});

test('missing, unknown or coerced inputs cannot silently become zero risk', () => {
  const invalid = [undefined, null, {}, [], { ...base, extra: true }];
  for (const key of Object.keys(base)) {
    const value = { ...base }; delete value[key]; invalid.push(value);
  }
  for (const swdiDifference of [-1, 3, 0.5, '1', null, NaN, Infinity]) invalid.push({ ...base, swdiDifference });
  for (const key of ['power', 'water', 'telecom', 'vehicle']) {
    for (const value of [0, 1, 'false', null, undefined]) invalid.push({ ...base, [key]: value });
  }
  for (const input of invalid) assert.throws(() => calculateRiskScore(input), TypeError);
});

test('calculation is deterministic and does not mutate input', () => {
  const input = Object.freeze({ ...base, swdiDifference: 1, water: true });
  const first = calculateRiskScore(input);
  first.contributions.water = 999;
  assert.equal(calculateRiskScore(input).score, 55);
  assert.equal(calculateRiskScore(input).contributions.water, 15);
  assert.deepEqual(input, { ...base, swdiDifference: 1, water: true });
});
