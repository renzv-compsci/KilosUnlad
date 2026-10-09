export interface GeolocationReading {
  latitude: number;
  longitude: number;
  accuracy_m: number;
}

export function readDeviceLocation(geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined): Promise<GeolocationReading> {
  if (!geolocation) return Promise.reject(new Error('Location is not supported. Use a device with location services.'));
  return new Promise((resolve, reject) => geolocation.getCurrentPosition(
    ({ coords }) => {
      if (!Number.isFinite(coords.latitude) || Math.abs(coords.latitude) > 90 ||
          !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180 ||
          !Number.isFinite(coords.accuracy) || coords.accuracy < 0) {
        reject(new Error('The device returned invalid coordinates. Try capturing location again.'));
        return;
      }
      resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy_m: coords.accuracy });
    },
    ({ code }) => reject(new Error(code === 1
      ? 'Location permission was denied. Allow location for this site, then retry.'
      : code === 3 ? 'Location request timed out. Move to an open area, then retry.'
      : 'Location is unavailable. Check device location services, then retry.')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  ));
}
