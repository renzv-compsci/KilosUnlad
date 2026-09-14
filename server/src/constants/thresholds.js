const THRESHOLDS = Object.freeze({
  // RA 11552 Power Lifeline Limit (kWh/month)
  POWER_LIFELINE_MAX_KWH: 200,

  // Water Utility Indigent Consumption Limit (cu.m/month)
  WATER_LIFELINE_MAX_CU_M: 25,

  // Audit Risk Score Trigger (Out of 100)
  RISK_SCORE_FLAG_TRIGGER: 70.0,

  // Sangla-ATM Loan-Shark Detection Triggers
  SANGLA_MAX_SWIPE_INTERVAL_SECONDS: 45,
  SANGLA_NOCTURNAL_START_HOUR: 1, // 01:00 AM
  SANGLA_NOCTURNAL_END_HOUR: 4,   // 04:30 AM
  SANGLA_CLUSTER_REPEAT_RATIO: 0.70,

  // Field Verification Geofence Distance (Meters)
  MAX_GEOFENCE_VARIANCE_METERS: 250
});

module.exports = THRESHOLDS;