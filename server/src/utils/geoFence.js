const THRESHOLDS = require('../constants/thresholds');
const validPoint = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) &&
  Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

/**
 * Calculates the great-circle distance between two geographic points
 * using the Haversine formula (Earth radius: 6,371,000 meters).
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in meters
 */
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!validPoint(lat1, lon1) || !validPoint(lat2, lon2)) return null;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const bounded = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
  return R * c; // Preserve precision for threshold comparison.
};

/**
 * Verifies if the captured field coordinates fall within the acceptable geofence threshold.
 * @param {Object} capturedCoords - { latitude, longitude }
 * @param {Array} targetGeoJSONCoords - [longitude, latitude] from MongoDB 2dsphere
 * @returns {Object} - { isMatched: boolean, distanceMeters: number }
 */
const verifyGeofence = (capturedCoords, targetGeoJSONCoords) => {
  if (!capturedCoords || !Array.isArray(targetGeoJSONCoords) || targetGeoJSONCoords.length !== 2) {
    return { isMatched: false, distanceMeters: null };
  }

  // Note: MongoDB GeoJSON stores [longitude, latitude]
  const targetLon = targetGeoJSONCoords[0];
  const targetLat = targetGeoJSONCoords[1];

  const distanceMeters = calculateDistanceMeters(
    capturedCoords.latitude,
    capturedCoords.longitude,
    targetLat,
    targetLon
  );

  return {
    isMatched: distanceMeters !== null && distanceMeters <= THRESHOLDS.MAX_GEOFENCE_VARIANCE_METERS,
    distanceMeters: distanceMeters === null ? null : Math.round(distanceMeters * 10) / 10
  };
};

module.exports = {
  calculateDistanceMeters,
  verifyGeofence
};
