const Joi = require('joi');
const { RISK_SCORE_FLAG_TRIGGER } = require('../constants/thresholds');

// Internal inputs, not an HTTP contract. The caller must supply an explicitly
// resolved nonnegative level gap and indicators from an agreed mapping policy.
const schema = Joi.object({
  swdiDifference: Joi.number().integer().min(0).max(2).required(),
  power: Joi.boolean().required(),
  water: Joi.boolean().required(),
  telecom: Joi.boolean().required(),
  vehicle: Joi.boolean().required()
}).required();

// Published composite-score weights (also served read-only by GET /system/policy).
const WEIGHTS = Object.freeze({ swdi_per_level: 40, power: 20, water: 15, telecom: 25, vehicle: 30 });

function calculateRiskScore(input) {
  const { value, error } = schema.validate(input, { convert: false, allowUnknown: false });
  if (error) throw new TypeError('A SWDI difference from 0 to 2 and all four boolean indicators are required.');
  const contributions = {
    swdi: WEIGHTS.swdi_per_level * value.swdiDifference,
    power: value.power ? WEIGHTS.power : 0,
    water: value.water ? WEIGHTS.water : 0,
    telecom: value.telecom ? WEIGHTS.telecom : 0,
    vehicle: value.vehicle ? WEIGHTS.vehicle : 0
  };
  const score = Math.min(100, Object.values(contributions).reduce((sum, points) => sum + points, 0));
  return { score, meetsFlagThreshold: score >= RISK_SCORE_FLAG_TRIGGER, contributions };
}

module.exports = { calculateRiskScore, WEIGHTS };
