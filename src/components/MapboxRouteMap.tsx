/**
 * Mapbox route map – polyline on dark style.
 * Polyline format: [lat, lng][] (same as app/DB).
 * Renders placeholder in Expo Go (Mapbox requires dev build).
 */

import React, { useMemo } from "react";
import { StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { isMapboxAvailable } from "../lib/mapboxAvailable";
import { MapPlaceholder } from "./MapPlaceholder";
import { polylineToGeoJSON, mapRegionToBounds, mapRegionToCamera, MAPBOX_DARK_STYLE } from "../lib/mapbox";
import type { MapRegion } from "../lib/gps";
import { colors } from "../theme";

export interface MapboxRouteMapProps {
  polyline: [number, number][];
  mapRegion?: MapRegion | null;
  strokeColor?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
}

export function MapboxRouteMap({
  polyline,
  mapRegion,
  strokeColor = colors.primary,
  strokeWidth = 4,
  style,
  scrollEnabled = true,
  zoomEnabled = true,
  pitchEnabled = false,
  rotateEnabled = true,
  padding,
}: MapboxRouteMapProps): React.ReactElement | null {
  if (!isMapboxAvailable()) {
    return <MapPlaceholder style={style} />;
  }
  const Mapbox = require("@rnmapbox/maps").default;
  return <MapboxRouteMapInner Mapbox={Mapbox} {...{ polyline, mapRegion, strokeColor, strokeWidth, style, scrollEnabled, zoomEnabled, pitchEnabled, rotateEnabled, padding }} />;
}

function MapboxRouteMapInner({
  Mapbox,
  polyline,
  mapRegion,
  strokeColor = colors.primary,
  strokeWidth = 4,
  style,
  scrollEnabled = true,
  zoomEnabled = true,
  pitchEnabled = false,
  rotateEnabled = true,
  padding,
}: MapboxRouteMapProps & { Mapbox: typeof import("@rnmapbox/maps").default }): React.ReactElement | null {
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

  const cameraConfig = useMemo(() => {
    if (!mapRegion) {
      if (!polyline?.length) return null;
      return mapRegionToCamera({
        latitude: polyline[0][0],
        longitude: polyline[0][1],
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
    const bounds = mapRegionToBounds(mapRegion);
    const pad = padding
      ? { paddingTop: padding.top ?? 0, paddingRight: padding.right ?? 0, paddingBottom: padding.bottom ?? 0, paddingLeft: padding.left ?? 0 }
      : undefined;
    return { bounds: { ...bounds, ...pad } };
  }, [mapRegion, polyline, padding]);

  if (!lineGeoJSON || !cameraConfig) {
    return null;
  }

  const isBounds = "bounds" in cameraConfig;
  const defaultSettings = isBounds
    ? { bounds: (cameraConfig as { bounds: { ne: [number, number]; sw: [number, number] } }).bounds }
    : { centerCoordinate: cameraConfig.centerCoordinate, zoomLevel: cameraConfig.zoomLevel };

  return (
    <Mapbox.MapView
      style={[styles.map, style]}
      styleURL={MAPBOX_DARK_STYLE}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      pitchEnabled={pitchEnabled}
      rotateEnabled={rotateEnabled}
      compassEnabled={false}
      logoEnabled={false}
      attributionEnabled={false}
    >
      <Mapbox.Camera defaultSettings={defaultSettings} />
      <Mapbox.ShapeSource id="route" shape={lineGeoJSON}>
        <Mapbox.LineLayer
          id="route-line"
          style={{
            lineColor: strokeColor,
            lineWidth: strokeWidth,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      </Mapbox.ShapeSource>
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
