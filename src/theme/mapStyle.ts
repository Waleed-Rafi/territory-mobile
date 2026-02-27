/**
 * Dark map style for Android (Google Maps customMapStyle).
 * Keeps the map dark regardless of system theme. iOS uses userInterfaceStyle="dark".
 */
export const darkMapStyle: Array<{
  elementType?: string;
  stylers: Array<{ color?: string }>;
}> = [
  { elementType: "geometry", stylers: [{ color: "#0f1729" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1729" }] },
];
