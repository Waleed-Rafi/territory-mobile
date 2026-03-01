export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed: number | null;
  /** Altitude in meters (from device GPS). Null if unavailable. */
  altitude: number | null;
}

const MAX_SPEED_KMH = 25;
const MIN_ACCURACY_M = 50;
const MIN_DISTANCE_KM = 0.1;

/** Max distance (m) between two path points to consider the loop "closed" at that pair. */
export const CLOSE_LOOP_RADIUS_M = 50;
/** Min distance (m) from loop anchor that the path must reach – avoids tiny loops. */
const MIN_LOOP_EXTENT_M = 50;
/** Min enclosed area (m²) so the loop has a real gap (not a straight out-and-back). */
const MIN_LOOP_AREA_SQM = 2000;
/** Min number of points in a loop segment (i to j). */
const MIN_LOOP_POINTS = 15;
/** Max claimable loops per run (avoid noise). */
const MAX_CLAIMABLE_LOOPS = 10;

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateTotalDistance(points: GpsPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    );
  }
  return total;
}

/**
 * Elevation gain in meters: sum of positive altitude differences between consecutive points.
 * Points without altitude are skipped (no contribution to gain).
 */
export function calculateElevationGain(points: GpsPoint[]): number {
  let gain = 0;
  let prevAlt: number | null = null;
  for (const p of points) {
    const alt = p.altitude != null && Number.isFinite(p.altitude) ? p.altitude : null;
    if (prevAlt != null && alt != null && alt > prevAlt) gain += alt - prevAlt;
    if (alt != null) prevAlt = alt;
  }
  return gain;
}

/** Build a closed polygon from a slice of points (path from i to j, then back to i). */
function sliceToClosedPolygon(points: GpsPoint[], i: number, j: number): [number, number][] {
  const step = Math.max(1, Math.floor((j - i + 1) / 50));
  const out: [number, number][] = [];
  for (let k = i; k <= j; k += step) out.push([points[k].lat, points[k].lng]);
  if (out.length > 0) out.push([points[i].lat, points[i].lng]);
  return out;
}

/** Ray-casting: true if (lat, lng) is inside polygon (closed: first point = last point). */
function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  const n = polygon.length - 1;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/**
 * Find all closed loops in the path with a "good gap" (sufficient enclosed area, not a straight line).
 * A loop is when the path comes back within CLOSE_LOOP_RADIUS_M of a previous point; the segment
 * between them forms a closed region. No requirement to return to the start.
 * Returns polygons suitable for claiming as territories (deduped, max MAX_CLAIMABLE_LOOPS).
 */
export function getClosedLoopPolygons(points: GpsPoint[]): [number, number][][] {
  const polygons: [number, number][][] = [];
  const n = points.length;
  if (n < MIN_LOOP_POINTS + 5) return polygons;

  for (let i = 0; i <= n - MIN_LOOP_POINTS; i++) {
    const anchor = points[i];
    for (let j = i + MIN_LOOP_POINTS; j < n; j++) {
      const d = haversineDistance(anchor.lat, anchor.lng, points[j].lat, points[j].lng);
      if (d > CLOSE_LOOP_RADIUS_M) continue;

      const poly = sliceToClosedPolygon(points, i, j);
      if (poly.length < 4) continue;

      const area = calculatePolygonArea(poly);
      if (area < MIN_LOOP_AREA_SQM) continue;

      let maxExtent = 0;
      for (let k = i; k <= j; k++) {
        const dist = haversineDistance(anchor.lat, anchor.lng, points[k].lat, points[k].lng);
        if (dist > maxExtent) maxExtent = dist;
      }
      if (maxExtent < MIN_LOOP_EXTENT_M) continue;

      polygons.push(poly);
    }
  }

  if (polygons.length === 0) return [];
  polygons.sort((a, b) => calculatePolygonArea(b) - calculatePolygonArea(a));

  const kept: [number, number][][] = [];
  for (const poly of polygons) {
    if (kept.length >= MAX_CLAIMABLE_LOOPS) break;
    const center = getPolygonCenter(poly);
    const contained = kept.some((k) => isPointInPolygon(center.lat, center.lng, k));
    if (!contained) kept.push(poly);
  }
  return kept;
}

/** True if the route contains at least one claimable closed loop (with good gap). */
export function isClosedLoop(points: GpsPoint[]): boolean {
  return getClosedLoopPolygons(points).length > 0;
}

export function validatePoint(point: GpsPoint, prevPoint?: GpsPoint): { valid: boolean; reason?: string } {
  if (point.accuracy > MIN_ACCURACY_M) {
    return { valid: false, reason: "Low GPS accuracy" };
  }
  if (prevPoint) {
    const dist = haversineDistance(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
    const timeDiff = (point.timestamp - prevPoint.timestamp) / 1000;
    if (timeDiff > 0) {
      const speedKmh = (dist / timeDiff) * 3.6;
      if (speedKmh > MAX_SPEED_KMH) {
        return { valid: false, reason: `Speed too high: ${speedKmh.toFixed(1)} km/h` };
      }
    }
  }
  return { valid: true };
}

export function validateRun(points: GpsPoint[]): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const totalDist = calculateTotalDistance(points);
  if (totalDist < MIN_DISTANCE_KM * 1000) {
    reasons.push(`Distance too short: ${(totalDist / 1000).toFixed(2)} km (min ${MIN_DISTANCE_KM} km)`);
  }
  let invalidPoints = 0;
  for (let i = 1; i < points.length; i++) {
    const result = validatePoint(points[i], points[i - 1]);
    if (!result.valid) invalidPoints++;
  }
  if (invalidPoints > points.length * 0.3) {
    reasons.push("Too many invalid GPS points");
  }
  return { valid: reasons.length === 0, reasons };
}

export function pointsToPolygon(points: GpsPoint[]): [number, number][] {
  const step = Math.max(1, Math.floor(points.length / 50));
  const simplified: [number, number][] = [];
  for (let i = 0; i < points.length; i += step) {
    simplified.push([points[i].lat, points[i].lng]);
  }
  if (simplified.length > 0) simplified.push(simplified[0]);
  return simplified;
}

export function calculatePolygonArea(polygon: [number, number][]): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = polygon[i][1] * 111320 * Math.cos((polygon[i][0] * Math.PI) / 180);
    const yi = polygon[i][0] * 110540;
    const xj = polygon[j][1] * 111320 * Math.cos((polygon[j][0] * Math.PI) / 180);
    const yj = polygon[j][0] * 110540;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area / 2);
}

export function getPolygonCenter(polygon: [number, number][]): { lat: number; lng: number } {
  let latSum = 0, lngSum = 0;
  const n = polygon.length - 1;
  for (let i = 0; i < n; i++) {
    latSum += polygon[i][0];
    lngSum += polygon[i][1];
  }
  return { lat: latSum / n, lng: lngSum / n };
}

export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return "—";
  const minPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatElevation(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  return `${Math.round(meters)} m`;
}

/** Map region (center + deltas) for fitting a polyline in a MapView. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Padding factor for polylineToMapRegion. Use TIGHT_FIT so the path nearly fills the map. */
export const MAP_FIT_TIGHT = 1.15;
/** Slightly more padding than TIGHT_FIT (e.g. for small thumbnails). */
export const MAP_FIT_NORMAL = 1.35;

/** Minimum lat/lng delta (degrees). ~0.002 ≈ 220m – allows tight zoom on short routes. */
const MIN_REGION_DELTA = 0.002;

/**
 * Compute the visible map region (zoom/center) that fits the route. The map *container* height
 * is always fixed by the caller; only the region inside the map changes (zoomed in for short
 * routes, zoomed out for long routes). Pass viewAspectRatio = width/height of the map view
 * so the route fills the frame with no letterboxing.
 */
export function polylineToMapRegion(
  polyline: [number, number][],
  paddingFactor = MAP_FIT_NORMAL,
  viewAspectRatio?: number
): MapRegion | null {
  if (!polyline?.length) return null;
  const lats = polyline.map(([lat]) => lat);
  const lngs = polyline.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  let latDelta = Math.max(MIN_REGION_DELTA, (maxLat - minLat) * paddingFactor || MIN_REGION_DELTA);
  let lngDelta = Math.max(MIN_REGION_DELTA, (maxLng - minLng) * paddingFactor || MIN_REGION_DELTA);

  if (viewAspectRatio != null && viewAspectRatio > 0) {
    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    const regionAspect = (lngDelta * cosLat) / latDelta;
    if (regionAspect < viewAspectRatio) {
      lngDelta = (latDelta * viewAspectRatio) / cosLat;
    } else if (regionAspect > viewAspectRatio) {
      latDelta = (lngDelta * cosLat) / viewAspectRatio;
    }
  }

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
