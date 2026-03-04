/**
 * Mapbox run map – live route polyline + user location during tracking.
 * Renders placeholder in Expo Go (Mapbox requires dev build).
 */

import React, { useMemo, useRef, useEffect } from "react";
import { StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import type { Camera } from "@rnmapbox/maps";
import { isMapboxAvailable } from "../lib/mapboxAvailable";
import { MapPlaceholder } from "./MapPlaceholder";
import { polylineToGeoJSON, MAPBOX_DARK_STYLE } from "../lib/mapbox";
import { colors } from "../theme";

export interface MapboxRunMapProps {
  polyline: [number, number][];
  userLocation?: { latitude: number; longitude: number } | null;
  tracking: boolean;
  style?: StyleProp<ViewStyle>;
}

const PADDING = { top: 48, right: 24, bottom: 24, left: 24 };
const FALLBACK_CENTER: [number, number] = [73.0479, 33.6844]; // Pakistan

export function MapboxRunMap({
  polyline,
  userLocation,
  tracking,
  style,
}: MapboxRunMapProps): React.ReactElement {
  if (!isMapboxAvailable()) {
    return <MapPlaceholder style={style} />;
  }
  const Mapbox = require("@rnmapbox/maps").default;
  return <MapboxRunMapInner Mapbox={Mapbox} polyline={polyline} userLocation={userLocation} tracking={tracking} style={style} />;
}

function MapboxRunMapInner({
  Mapbox,
  polyline,
  userLocation,
  tracking,
  style,
}: MapboxRunMapProps & { Mapbox: typeof import("@rnmapbox/maps").default }): React.ReactElement {
  const cameraRef = useRef<React.ComponentRef<typeof Camera>>(null);

  const lineGeoJSON = useMemo(() => {
    if (!polyline?.length) return null;
    const coords = polylineToGeoJSON(polyline);
    if (coords.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: coords,
      },
    };
  }, [polyline]);

  const fitPoints = useMemo(() => {
    const points = [...polyline];
    if (userLocation && tracking) {
      points.push([userLocation.latitude, userLocation.longitude]);
    }
    return points;
  }, [polyline, userLocation, tracking]);

  const initialCenter = useMemo((): [number, number] => {
    if (userLocation) return [userLocation.longitude, userLocation.latitude];
    if (polyline.length > 0) return [polyline[0][1], polyline[0][0]];
    return FALLBACK_CENTER;
  }, [userLocation, polyline]);

  useEffect(() => {
    if (!tracking || fitPoints.length < 2) return;
    if (fitPoints.length === 1 && userLocation) {
      cameraRef.current?.moveTo([userLocation.longitude, userLocation.latitude], 350);
      return;
    }
    const lats = fitPoints.map(([lat]) => lat);
    const lngs = fitPoints.map(([, lng]) => lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const pad = 1.15;
    const dLat = Math.max(0.002, (maxLat - minLat) * pad) / 2;
    const dLng = Math.max(0.002, (maxLng - minLng) * pad) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const ne: [number, number] = [centerLng + dLng, centerLat + dLat];
    const sw: [number, number] = [centerLng - dLng, centerLat - dLat];
    const padding = [PADDING.top, PADDING.right, PADDING.bottom, PADDING.left];
    cameraRef.current?.fitBounds(ne, sw, padding, 350);
  }, [tracking, fitPoints.length]);

  const hasRoute = lineGeoJSON != null;

  return (
    <Mapbox.MapView
      style={[styles.map, style]}
      styleURL={MAPBOX_DARK_STYLE}
      compassEnabled={false}
      logoEnabled={false}
      attributionEnabled={false}
    >
      <Mapbox.Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: initialCenter,
          zoomLevel: 15,
        }}
      />
      <Mapbox.LocationPuck puckBearingEnabled={false} />
      {hasRoute && (
        <Mapbox.ShapeSource id="run-route" shape={lineGeoJSON}>
          <Mapbox.LineLayer
            id="run-route-line"
            style={{
              lineColor: colors.primary,
              lineWidth: 4,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </Mapbox.ShapeSource>
      )}
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
