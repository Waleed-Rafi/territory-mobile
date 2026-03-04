/**
 * Mapbox coordinate helpers. Mapbox uses GeoJSON: coordinates as [lng, lat].
 * Our app and DB use [lat, lng] or { latitude, longitude }.
 */

import type { MapRegion } from "./gps";

/** Convert [lat, lng] to [lng, lat] for Mapbox GeoJSON. */
export function toMapboxCoord([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

/** Convert polyline [lat, lng][] to GeoJSON LineString coordinates [lng, lat][]. */
export function polylineToGeoJSON(
  polyline: [number, number][]
): [number, number][] {
  return polyline.map(([lat, lng]) => [lng, lat]);
}

/** Convert polygon [lat, lng][] to GeoJSON Polygon ring [lng, lat][] (must close: first = last). */
export function polygonToGeoJSON(
  polygon: [number, number][]
): [number, number][] {
  const coords: [number, number][] = polygon.map(
    ([lat, lng]): [number, number] => [lng, lat]
  );
  if (coords.length > 1 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
    coords.push(coords[0]);
  }
  return coords;
}

/** Mapbox dark style URL. */
export const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

/** Convert MapRegion to Mapbox Camera bounds { ne, sw } for fitBounds. */
export function mapRegionToBounds(
  region: MapRegion
): { ne: [number, number]; sw: [number, number] } {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
  const halfLat = latitudeDelta / 2;
  const halfLng = longitudeDelta / 2;
  return {
    ne: [longitude + halfLng, latitude + halfLat],
    sw: [longitude - halfLng, latitude - halfLat],
  };
}

/** Convert MapRegion to Mapbox center and zoom. zoomLevel ~ 14–18 for typical route views. */
export function mapRegionToCamera(region: MapRegion): {
  centerCoordinate: [number, number];
  zoomLevel: number;
} {
  const center: [number, number] = [region.longitude, region.latitude];
  // Approximate zoom from delta: smaller delta = higher zoom
  const avgDelta = (region.latitudeDelta + region.longitudeDelta) / 2;
  const zoomLevel = Math.max(10, Math.min(18, Math.round(14 - Math.log2(avgDelta * 100))));
  return { centerCoordinate: center, zoomLevel };
}
