/**
 * Mapbox territory map – polygons on dark style.
 * Polygon format: [lat, lng][] (same as app/DB), must form closed ring.
 * Renders placeholder in Expo Go (Mapbox requires dev build).
 */

import React, { useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { isMapboxAvailable } from "../lib/mapboxAvailable";
import { MapPlaceholder } from "./MapPlaceholder";
import { polygonToGeoJSON, MAPBOX_DARK_STYLE } from "../lib/mapbox";

export interface TerritoryPolygon {
  id: string;
  polygon: [number, number][];
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface MapboxTerritoryMapProps {
  territories: TerritoryPolygon[];
  center: { latitude: number; longitude: number };
  zoomLevel?: number;
  style?: StyleProp<ViewStyle>;
  showsUserLocation?: boolean;
}

export interface MapboxTerritoryMapRef {
  fitToUser: (target?: { latitude: number; longitude: number }) => void;
}

const DEFAULT_ZOOM = 14;

export const MapboxTerritoryMap = forwardRef<MapboxTerritoryMapRef, MapboxTerritoryMapProps>(
  function MapboxTerritoryMap(
    { territories, center, zoomLevel = DEFAULT_ZOOM, style, showsUserLocation = true },
    ref
  ) {
    if (!isMapboxAvailable()) {
      useImperativeHandle(ref, () => ({ fitToUser: () => {} }));
      return <MapPlaceholder style={style} />;
    }
    const Mapbox = require("@rnmapbox/maps").default;
    return (
      <MapboxTerritoryMapInner
        Mapbox={Mapbox}
        ref={ref}
        territories={territories}
        center={center}
        zoomLevel={zoomLevel}
        style={style}
        showsUserLocation={showsUserLocation}
      />
    );
  }
);

const MapboxTerritoryMapInner = forwardRef<MapboxTerritoryMapRef, MapboxTerritoryMapProps & { Mapbox: typeof import("@rnmapbox/maps").default }>(
  function MapboxTerritoryMapInner(
    { Mapbox, territories, center, zoomLevel = DEFAULT_ZOOM, style, showsUserLocation = true },
    ref
  ) {
    const cameraRef = useRef<import("@rnmapbox/maps").Camera>(null);

    useImperativeHandle(ref, () => ({
      fitToUser: (target) => {
        const t = target ?? center;
        cameraRef.current?.flyTo([t.longitude, t.latitude], 500);
      },
    }));

    const cameraConfig = useMemo(
      () => ({
        centerCoordinate: [center.longitude, center.latitude] as [number, number],
        zoomLevel,
      }),
      [center.longitude, center.latitude, zoomLevel]
    );

    return (
      <Mapbox.MapView
        style={[styles.map, style]}
        styleURL={MAPBOX_DARK_STYLE}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera ref={cameraRef} defaultSettings={cameraConfig} />
        {showsUserLocation && <Mapbox.LocationPuck puckBearingEnabled={false} />}
        {territories.map((t) => {
          const ring = polygonToGeoJSON(t.polygon);
          if (ring.length < 3) return null;
          const geoJSON = {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Polygon" as const,
              coordinates: [ring],
            },
          };
          return (
            <Mapbox.ShapeSource key={t.id} id={`territory-${t.id}`} shape={geoJSON}>
              <Mapbox.FillLayer
                id={`territory-fill-${t.id}`}
                style={{
                  fillColor: t.fillColor,
                  fillOpacity: 0.25,
                  fillOutlineColor: t.strokeColor,
                }}
              />
            </Mapbox.ShapeSource>
          );
        })}
      </Mapbox.MapView>
    );
  }
);

const styles = StyleSheet.create({
  map: { flex: 1 },
});
