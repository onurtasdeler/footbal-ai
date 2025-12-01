/**
 * DataBar - Animated progress bar with label
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../../theme/colors';

const DataBar = ({
  label,
  targetPercent = 85,
  delay = 0,
  duration = 800,
  color = COLORS.accent,
  width = 160,
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Loop animation: fill up -> hold -> reset
    const animate = () => {
      Animated.sequence([
        Animated.delay(delay),
        // Fill up
        Animated.parallel([
          Animated.timing(widthAnim, {
            toValue: targetPercent,
            duration,
            useNativeDriver: false, // width requires JS driver
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: false,
          }),
        ]),
        // Hold
        Animated.delay(1000),
        // Reset
        Animated.parallel([
          Animated.timing(widthAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: false,
          }),
        ]),
        // Small pause before restart
        Animated.delay(200),
      ]).start(() => animate());
    };

    animate();

    return () => {
      widthAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, [targetPercent, delay, duration]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { width }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animatedWidth,
              backgroundColor: color,
              opacity: opacityAnim,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    color: COLORS.gray500,
    marginBottom: 4,
    fontWeight: '500',
  },
  track: {
    height: 4,
    backgroundColor: COLORS.gray800,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});

export default DataBar;
