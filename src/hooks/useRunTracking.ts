import { useState, useRef, useCallback, useEffect } from "react";
import * as Location from "expo-location";
import type { GpsPoint } from "../lib/gps";
import { validatePoint } from "../lib/gps";

const INTERVAL_MS = 2000;

export interface RunTrackingState {
  tracking: boolean;
  points: GpsPoint[];
  currentPosition: Location.LocationObject | null;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

export function useRunTracking(): RunTrackingState {
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastAddRef = useRef<number>(0);

  const startTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Location permission denied");
      return;
    }
    setPoints([]);
    setError(null);
    setTracking(true);

    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setCurrentPosition(initial);
      const firstPoint: GpsPoint = {
        lat: initial.coords.latitude,
        lng: initial.coords.longitude,
        timestamp: initial.timestamp,
        accuracy: initial.coords.accuracy ?? 0,
        speed: initial.coords.speed ?? null,
        altitude: initial.coords.altitude ?? null,
      };
      setPoints([firstPoint]);
      lastAddRef.current = Date.now();
    } catch {
      // continue without initial point; watch will get first update
    }

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: INTERVAL_MS,
        distanceInterval: 5,
      },
      (loc) => {
        setCurrentPosition(loc);
        const newPoint: GpsPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy ?? 0,
          speed: loc.coords.speed ?? null,
          altitude: loc.coords.altitude ?? null,
        };
        setPoints((prev) => {
          const last = prev[prev.length - 1];
          if (!validatePoint(newPoint, last).valid) return prev;
          if (Date.now() - lastAddRef.current < INTERVAL_MS && prev.length > 0) return prev;
          lastAddRef.current = Date.now();
          return [...prev, newPoint];
        });
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setTracking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove();
    };
  }, []);

  return { tracking, points, currentPosition, error, startTracking, stopTracking };
}
