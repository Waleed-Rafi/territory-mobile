/**
 * Simple line chart using react-native-svg.
 * Renders a line from data points with optional fill area below.
 */

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "../../theme";

export interface LineChartDataPoint {
  x: number;
  y: number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillGradient?: boolean;
  /** If set, invert y so higher values appear higher on chart (e.g. pace: lower is "better" so we might invert) */
  invertY?: boolean;
  padding?: number;
}

export function LineChart({
  data,
  width = Dimensions.get("window").width - 48,
  height = 120,
  strokeColor = colors.primary,
  fillGradient = true,
  invertY = false,
  padding = 12,
}: LineChartProps): React.ReactElement {
  if (data.length < 2) return <View style={[styles.container, { width, height }]} />;

  const w = width - 2 * padding;
  const h = height - 2 * padding;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const toSvg = (x: number, y: number) => {
    const sx = padding + ((x - minX) / rangeX) * w;
    const ny = invertY ? 1 - (y - minY) / rangeY : (y - minY) / rangeY;
    const sy = padding + ny * h;
    return [sx, sy] as const;
  };

  const pathD = data
    .map((p, i) => {
      const [sx, sy] = toSvg(p.x, p.y);
      return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
    })
    .join(" ");

  const [firstX] = toSvg(data[0].x, data[0].y);
  const [lastX] = toSvg(data[data.length - 1].x, data[data.length - 1].y);
  const [, lastY] = toSvg(data[data.length - 1].x, data[data.length - 1].y);
  const fillD = fillGradient
    ? `${pathD} L ${lastX} ${height - padding} L ${firstX} ${height - padding} Z`
    : "";

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={strokeColor} stopOpacity="0.35" />
            <Stop offset="1" stopColor={strokeColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {fillGradient && fillD ? (
          <Path d={fillD} fill="url(#lineGrad)" />
        ) : null}
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
