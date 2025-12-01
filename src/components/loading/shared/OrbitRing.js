/**
 * OrbitRing - Rotating dots in a circular orbit
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../../theme/colors';

const OrbitRing = ({
  radius = 50,
  dotCount = 5,
  dotSize = 8,
  color = COLORS.accent,
  duration = 3000,
  clockwise = true,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: clockwise ? 1 : -1,
        duration,
        useNativeDriver: true,
      })
    ).start();

    return () => rotation.stopAnimation();
  }, [clockwise, duration]);

  const spin = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  // Calculate dot positions
  const dots = [];
  for (let i = 0; i < dotCount; i++) {
    const angle = (i * (360 / dotCount) - 90) * (Math.PI / 180);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    dots.push({ x, y, key: i });
  }

  const containerSize = radius * 2 + dotSize;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          transform: [{ rotate: spin }],
        },
      ]}
    >
      {dots.map((dot) => (
        <View
          key={dot.key}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              left: radius + dot.x - dotSize / 2 + dotSize / 2,
              top: radius + dot.y - dotSize / 2 + dotSize / 2,
              shadowColor: color,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default OrbitRing;
