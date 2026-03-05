/**
 * Wraps Mapbox MapView to avoid "Invalid size" errors.
 * Delays rendering until the container has valid dimensions (avoids 0x0 layout).
 */

import React, { useState, useCallback } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

interface MapWithLayoutGuardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function MapWithLayoutGuard({ children, style }: MapWithLayoutGuardProps): React.ReactElement {
  const [hasLayout, setHasLayout] = useState(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setHasLayout(true);
    }
  }, []);

  return (
    <View style={[{ flex: 1 }, style]} onLayout={onLayout}>
      {hasLayout ? children : null}
    </View>
  );
}
