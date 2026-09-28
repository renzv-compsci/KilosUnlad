import { useCallback, useState } from 'react';

export interface GeolocationReading {
  latitude: number;
  longitude: number;
  accuracy_m: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const capturePosition = useCallback(async (): Promise<GeolocationReading> => {
    if (!navigator.geolocation) throw new Error('Geolocation is not supported by this device.');
    setIsLocating(true);
    setError(null);
    try {
      const reading = await new Promise<GeolocationReading>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy_m: coords.accuracy }),
          (reason) => reject(new Error(reason.message || 'Unable to acquire GPS coordinates.')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      });
      setPosition(reading);
      return reading;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to acquire GPS coordinates.');
      throw reason;
    } finally {
      setIsLocating(false);
    }
  }, []);

  return { position, error, isLocating, capturePosition };
}
