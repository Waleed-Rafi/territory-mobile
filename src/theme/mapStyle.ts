/**
 * Dark map style for Google Maps (iOS + Android).
 * Same look on both platforms: dark background (#0f1729), muted labels, green-accent friendly.
 * Used with provider={PROVIDER_GOOGLE} and mapType="none" for consistent Uber/Strava-style maps.
 */
export const darkMapStyle: Array<{
  elementType?: string;
  featureType?: string;
  stylers: Array<{ color?: string; visibility?: string; lightness?: number }>;
}> = [
  { elementType: "geometry", stylers: [{ color: "#0f1729" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1729" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1729" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];
