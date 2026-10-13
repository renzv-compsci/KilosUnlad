const axios = require('axios');
const Joi = require('joi');
const environment = require('../config/environment');
const TIMEOUT_MS = 2500;

// updated feature objects to match data dictionary and added validation for shap_explainability description field
const features = {
  head_education_level: Joi.number().integer().min(0).max(3).required(),
  head_formal_employment: Joi.number().integer().min(0).max(1).required(),
  remittance_income_flag: Joi.number().integer().min(0).max(1).required(),
  housing_material_score: Joi.number().integer().min(1).max(3).required(),
  appliance_density_index: Joi.number().min(0).max(3).required(),
  dependency_ratio: Joi.number().min(0).required()
};

const requestSchema = Joi.object({ 
  household_id: Joi.string().trim().required(),
  household_size: Joi.number().integer().min(1).max(20).required(),
  demographics: Joi.object(features).required() 
}).required();

const responseSchema = Joi.object({
  household_id: Joi.string().required(),
  ml_evaluation: Joi.object({
    predicted_swdi_level: Joi.number().integer().valid(1, 2, 3).required(),
    class_probabilities: Joi.object({
      level_1_survival: Joi.number().min(0).max(1).required(),
      level_2_subsistence: Joi.number().min(0).max(1).required(),
      level_3_self_sufficiency: Joi.number().min(0).max(1).required()
    }).required(),
    shap_explainability: Joi.array().items(Joi.object({
      indicator: Joi.string().required(),
      contribution_weight: Joi.number().required(), description: Joi.string().required()
    })).required()
  }).required(),
  evaluated_at: Joi.string().isoDate().pattern(/(?:Z|[+-]\d{2}:\d{2})$/).required()
}).required();
const validation = { convert: false, abortEarly: false, allowUnknown: false };
class MlClientError extends Error {
  constructor(code, message) { super(message); this.name = 'MlClientError'; this.code = code; }
}

// Internal client only. Destination is trusted server configuration, not user input.
function createMlClient({ baseURL = environment.ML_SERVICE_URL } = {}) {
  const url = new URL(baseURL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new TypeError('ML_SERVICE_URL must be an HTTP(S) origin without credentials.');
  }
  const http = axios.create({ baseURL: url.origin, timeout: TIMEOUT_MS,
    maxRedirects: 0, maxContentLength: 1024 * 1024, proxy: false, validateStatus: () => true });
  return { async predict(payload) {
    const input = requestSchema.validate(payload, validation);
    if (input.error) throw new MlClientError('INVALID_FEATURE_VECTOR',
      'One or more demographic features are missing or outside valid bounds.');
    // Bound connection and response time together; no retries extend the deadline.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await http.post('/api/v1/predict-swdi', input.value, {
        signal: controller.signal, headers: { 'Content-Type': 'application/json' }
      });
      if (response.status === 422) throw new MlClientError('INVALID_FEATURE_VECTOR',
        'One or more demographic features are missing or outside valid bounds.');
      if (response.status !== 200) throw new MlClientError('ML_UNAVAILABLE', 'ML service is temporarily unavailable.');
      const output = responseSchema.validate(response.data, validation);
      if (output.error || output.value.household_id !== input.value.household_id) {
        throw new MlClientError('INVALID_ML_RESPONSE', 'ML service returned an invalid prediction response.');
      }
      // Tolerance accommodates rounded probabilities, without inventing classes.
      const sum = Object.values(output.value.ml_evaluation.class_probabilities).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 0.01) throw new MlClientError('INVALID_ML_RESPONSE', 'ML service returned an invalid prediction response.');
      return output.value;
    } catch (error) {
      if (error instanceof MlClientError) throw error;
      if (controller.signal.aborted || ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error.code)) {
        throw new MlClientError('ML_TIMEOUT', 'ML service exceeded the 2500 ms deadline.');
      }
      // Do not expose Axios configuration, upstream bodies or connection details.
      throw new MlClientError('ML_UNAVAILABLE', 'ML service is temporarily unavailable.');
    } finally { clearTimeout(timer); }
  } };
}
module.exports = { createMlClient, MlClientError, requestSchema };
