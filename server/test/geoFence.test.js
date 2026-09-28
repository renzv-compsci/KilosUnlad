const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDistanceMeters, verifyGeofence } = require('../src/utils/geoFence');
const north = meters => ({ latitude: meters / 6371000 * 180 / Math.PI, longitude: 0 });

test('geofence uses longitude-first GeoJSON and matches identical locations', () => {
  assert.deepEqual(verifyGeofence({ latitude: 14.2, longitude: 121.1 }, [121.1, 14.2]),
    { isMatched: true, distanceMeters: 0 });
  assert.equal(verifyGeofence({ latitude: 14.2, longitude: 121.1 }, [14.2, 121.1]).isMatched, false);
});

test('geofence compares unrounded distance at the inclusive 250 metre boundary', () => {
  assert.equal(verifyGeofence(north(249.99), [0, 0]).isMatched, true);
  assert.equal(verifyGeofence(north(250), [0, 0]).isMatched, true);
  assert.deepEqual(verifyGeofence(north(250.01), [0, 0]), { isMatched: false, distanceMeters: 250 });
});

test('malformed and non-finite coordinates fail closed', () => {
  for (const point of [null, {}, { latitude: '0', longitude: 0 }, { latitude: NaN, longitude: 0 },
    { latitude: 91, longitude: 0 }, { latitude: 0, longitude: Infinity }, { latitude: 0, longitude: 181 }]) {
    assert.deepEqual(verifyGeofence(point, [0, 0]), { isMatched: false, distanceMeters: null });
  }
  for (const target of [null, [], [0], [0, 0, 0], ['0', 0], [0, -91], '00']) {
    assert.deepEqual(verifyGeofence(north(0), target), { isMatched: false, distanceMeters: null });
  }
  assert.equal(calculateDistanceMeters(0, 0, 0, Infinity), null);
});

test('distance remains finite at antipodes and crosses the date line correctly', () => {
  assert.ok(Math.abs(calculateDistanceMeters(0, 0, 0, 180) - Math.PI * 6371000) < 0.001);
  const distance = calculateDistanceMeters(0, 179.999, 0, -179.999);
  assert.ok(distance > 222 && distance < 223);
});
