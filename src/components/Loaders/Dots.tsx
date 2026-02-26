import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing } from "../../theme";

interface DotsProps {
  color?: string;
  dotSize?: number;
  style?: ViewStyle;
}

export function Dots({ color = colors.primary, dotSize = 6, style }: DotsProps) {
  const a = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const anim = (index: number) =>
      Animated.sequence([
        Animated.timing(a[index], { toValue: 1, useNativeDriver: true, duration: 280 }),
        Animated.timing(a[index], { toValue: 0, useNativeDriver: true, duration: 280 }),
      ]);
    const loopAnim = Animated.loop(Animated.stagger(120, [anim(0), anim(1), anim(2)]));
    loopAnim.start();
    return () => loopAnim.stop();
  }, [a]);

  return (
    <View style={[styles.wrap, style]}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              opacity: a[i].interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [
                {
                  scale: a[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  dot: {},
});
