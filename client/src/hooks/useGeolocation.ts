import { useCallback, useState } from 'react';
import { readDeviceLocation, type GeolocationReading } from '../utils/deviceLocation';
export type { GeolocationReading } from '../utils/deviceLocation';

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const capturePosition = useCallback(async (): Promise<GeolocationReading> => {
    setIsLocating(true);
    setError(null);
    setPosition(null);
    try {
      const reading = await readDeviceLocation(navigator.geolocation);
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
