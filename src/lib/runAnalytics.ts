/**
 * Run analytics: splits, pace profile, elevation profile, fastest split.
 * Works with full GPS points (timestamp, altitude) or fallback from route_polyline + duration.
 */

import type { GpsPoint } from "./gps";
import { haversineDistance } from "./gps";

/** Point with cumulative distance (m) and optional time/altitude */
export interface DistancePoint {
  distance: number;
  time?: number;
  altitude?: number;
}

/** Single split (e.g. 1 km) */
export interface Split {
  index: number;
  distanceStart: number;
  distanceEnd: number;
  segmentDistance: number;
  duration: number;
  paceMps: number;
}

/** Pace profile: distance (m) and pace (m/s) for chart */
export interface PaceProfilePoint {
  distance: number;
  paceMps: number;
}

/** Elevation profile: distance (m) and altitude (m) for chart */
export interface ElevationProfilePoint {
  distance: number;
  altitude: number;
}

/** Parse gps_points from run JSON. Handles old format without altitude. */
export function parseGpsPoints(raw: unknown): GpsPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => p != null && typeof p === "object")
    .map((p) => ({
      lat: Number(p.lat) || 0,
      lng: Number(p.lng) || 0,
      timestamp: Number(p.timestamp) || 0,
      accuracy: Number(p.accuracy) ?? 0,
      speed: p.speed != null && typeof p.speed === "number" ? p.speed : null,
      altitude: p.altitude != null && typeof p.altitude === "number" ? p.altitude : null,
    }))
    .filter((p) => p.lat && p.lng);
}

/** Build distance/time/altitude series from GPS points */
function buildDistanceSeries(points: GpsPoint[]): DistancePoint[] {
  if (points.length === 0) return [];
  const out: DistancePoint[] = [{ distance: 0, time: points[0].timestamp, altitude: points[0].altitude ?? undefined }];
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    );
    out.push({
      distance: dist,
      time: points[i].timestamp,
      altitude: points[i].altitude ?? undefined,
    });
  }
  return out;
}

/** Compute splits (e.g. per km). Uses interpolation at segment boundaries. */
export function computeSplits(
  points: GpsPoint[],
  totalDistance: number,
  totalDuration: number,
  segmentMeters = 1000
): { splits: Split[]; fastestSplitIndex: number } {
  const series = buildDistanceSeries(points);
  if (series.length < 2 || totalDuration <= 0) return { splits: [], fastestSplitIndex: -1 };

  const splits: Split[] = [];
  let dist = 0;
  let fastestPaceMps = 0;
  let fastestIndex = -1;

  while (dist + segmentMeters <= totalDistance) {
    const startDist = dist;
    const endDist = dist + segmentMeters;
    const { time: startTime } = interpolateAtDistance(series, startDist);
    const { time: endTime } = interpolateAtDistance(series, endDist);
    const duration = endTime != null && startTime != null ? (endTime - startTime) / 1000 : totalDuration * (segmentMeters / totalDistance);
    const paceMps = duration > 0 ? segmentMeters / duration : 0;

    splits.push({
      index: splits.length + 1,
      distanceStart: startDist,
      distanceEnd: endDist,
      segmentDistance: segmentMeters,
      duration,
      paceMps,
    });

    if (paceMps > 0 && paceMps > fastestPaceMps) {
      fastestPaceMps = paceMps;
      fastestIndex = splits.length - 1;
    }
    dist += segmentMeters;
  }

  const remainder = totalDistance - dist;
  if (remainder > 100) {
    const { time: startTime } = interpolateAtDistance(series, dist);
    const endTime = series[series.length - 1].time ?? 0;
    const duration = startTime != null ? (endTime - startTime) / 1000 : totalDuration * (remainder / totalDistance);
    const paceMps = duration > 0 ? remainder / duration : 0;
    splits.push({
      index: splits.length + 1,
      distanceStart: dist,
      distanceEnd: totalDistance,
      segmentDistance: remainder,
      duration,
      paceMps,
    });
  }

  return { splits, fastestSplitIndex: fastestIndex };
}

/** Interpolate time/altitude at a given distance along the series */
function interpolateAtDistance(series: DistancePoint[], targetDist: number): { time?: number; altitude?: number } {
  if (series.length === 0) return {};
  if (targetDist <= series[0].distance) return { time: series[0].time, altitude: series[0].altitude };
  const last = series[series.length - 1];
  if (targetDist >= last.distance) return { time: last.time, altitude: last.altitude };

  for (let i = 1; i < series.length; i++) {
    if (series[i].distance >= targetDist) {
      const a = series[i - 1];
      const b = series[i];
      const t = (targetDist - a.distance) / (b.distance - a.distance || 1);
      return {
        time: a.time != null && b.time != null ? a.time + t * (b.time - a.time) : undefined,
        altitude: a.altitude != null && b.altitude != null ? a.altitude + t * (b.altitude - a.altitude) : undefined,
      };
    }
  }
  return {};
}

/** Pace profile with rolling window (smoothed pace over distance) */
export function computePaceProfile(
  points: GpsPoint[],
  totalDistance: number,
  totalDuration: number,
  windowMeters = 200,
  sampleIntervalM = 50
): PaceProfilePoint[] {
  const series = buildDistanceSeries(points);
  if (series.length < 2 || totalDuration <= 0) return [];

  const result: PaceProfilePoint[] = [];
  const halfWindow = windowMeters / 2;

  for (let d = 0; d <= totalDistance; d += sampleIntervalM) {
    const dStart = Math.max(0, d - halfWindow);
    const dEnd = Math.min(totalDistance, d + halfWindow);
    const { time: tStart } = interpolateAtDistance(series, dStart);
    const { time: tEnd } = interpolateAtDistance(series, dEnd);
    const segDist = dEnd - dStart;
    const segTime = tStart != null && tEnd != null ? (tEnd - tStart) / 1000 : totalDuration * (segDist / totalDistance);
    const paceMps = segTime > 0 ? segDist / segTime : 0;
    result.push({ distance: d, paceMps });
  }

  return result;
}

/** Elevation profile: distance and altitude for chart */
export function computeElevationProfile(points: GpsPoint[]): ElevationProfilePoint[] {
  const series = buildDistanceSeries(points);
  const hasAltitude = series.some((p) => p.altitude != null);
  if (!hasAltitude) return [];

  return series.map((p) => ({
    distance: p.distance,
    altitude: p.altitude ?? 0,
  }));
}

/** Fallback: compute splits from route_polyline + linear time (no GPS timestamps) */
export function computeSplitsFromPolyline(
  polyline: [number, number][],
  totalDistance: number,
  totalDuration: number,
  segmentMeters = 1000
): { splits: Split[]; fastestSplitIndex: number } {
  if (polyline.length < 2 || totalDuration <= 0) return { splits: [], fastestSplitIndex: -1 };

  const dists: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    dists.push(
      dists[i - 1] +
        haversineDistance(polyline[i - 1][0], polyline[i - 1][1], polyline[i][0], polyline[i][1])
    );
  }

  const splits: Split[] = [];
  let dist = 0;
  let fastestPaceMps = 0;
  let fastestIndex = -1;

  while (dist + segmentMeters <= totalDistance) {
    const duration = totalDuration * (segmentMeters / totalDistance);
    const paceMps = segmentMeters / duration;
    splits.push({
      index: splits.length + 1,
      distanceStart: dist,
      distanceEnd: dist + segmentMeters,
      segmentDistance: segmentMeters,
      duration,
      paceMps,
    });
    if (paceMps > fastestPaceMps) {
      fastestPaceMps = paceMps;
      fastestIndex = splits.length - 1;
    }
    dist += segmentMeters;
  }

  const remainder = totalDistance - dist;
  if (remainder > 100) {
    const duration = totalDuration * (remainder / totalDistance);
    const paceMps = remainder / duration;
    splits.push({
      index: splits.length + 1,
      distanceStart: dist,
      distanceEnd: totalDistance,
      segmentDistance: remainder,
      duration,
      paceMps,
    });
  }

  return { splits, fastestSplitIndex: fastestIndex };
}

/** Fallback: pace profile from polyline (linear time assumption) */
export function computePaceProfileFromPolyline(
  polyline: [number, number][],
  totalDistance: number,
  totalDuration: number,
  sampleIntervalM = 50
): PaceProfilePoint[] {
  if (polyline.length < 2 || totalDuration <= 0) return [];
  const avgPaceMps = totalDistance / totalDuration;
  const result: PaceProfilePoint[] = [];
  for (let d = 0; d <= totalDistance; d += sampleIntervalM) {
    result.push({ distance: d, paceMps: avgPaceMps });
  }
  return result;
}
