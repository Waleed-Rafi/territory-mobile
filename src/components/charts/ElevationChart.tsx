/**
 * Elevation profile chart: area fill under altitude vs distance.
 */

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "../../theme";

export interface ElevationDataPoint {
  distance: number;
  altitude: number;
}

interface ElevationChartProps {
  data: ElevationDataPoint[];
  width?: number;
  height?: number;
  fillColor?: string;
  strokeColor?: string;
  padding?: number;
}

export function ElevationChart({
  data,
  width = Dimensions.get("window").width - 48,
  height = 100,
  fillColor = colors.primary,
  strokeColor = colors.primary,
  padding = 12,
}: ElevationChartProps): React.ReactElement {
  if (data.length < 2) return <View style={[styles.container, { width, height }]} />;

  const w = width - 2 * padding;
  const h = height - 2 * padding;
  const minAlt = Math.min(...data.map((d) => d.altitude));
  const maxAlt = Math.max(...data.map((d) => d.altitude));
  const minDist = data[0].distance;
  const maxDist = data[data.length - 1].distance;
  const rangeAlt = maxAlt - minAlt || 1;
  const rangeDist = maxDist - minDist || 1;

  const toSvg = (dist: number, alt: number) => {
    const sx = padding + ((dist - minDist) / rangeDist) * w;
    const sy = padding + h - ((alt - minAlt) / rangeAlt) * h;
    return [sx, sy] as const;
  };

  const pathD = data
    .map((p, i) => {
      const [sx, sy] = toSvg(p.distance, p.altitude);
      return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
    })
    .join(" ");

  const [firstX] = toSvg(data[0].distance, data[0].altitude);
  const [lastX] = toSvg(data[data.length - 1].distance, data[data.length - 1].altitude);
  const fillD = `${pathD} L ${lastX} ${height - padding} L ${firstX} ${height - padding} Z`;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="elevGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={fillColor} stopOpacity="0.4" />
            <Stop offset="1" stopColor={fillColor} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <Path d={fillD} fill="url(#elevGrad)" />
        <Path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
});
