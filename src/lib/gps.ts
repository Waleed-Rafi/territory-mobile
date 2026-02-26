export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed: number | null;
}

const MAX_SPEED_KMH = 25;
const MIN_ACCURACY_M = 50;
const MIN_DISTANCE_KM = 0.1;
const CLOSE_LOOP_RADIUS_M = 100;

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

export function isClosedLoop(points: GpsPoint[]): boolean {
  if (points.length < 10) return false;
  const first = points[0];
  const last = points[points.length - 1];
  const dist = haversineDistance(first.lat, first.lng, last.lat, last.lng);
  return dist <= CLOSE_LOOP_RADIUS_M;
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
