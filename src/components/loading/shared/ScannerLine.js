/**
 * ScannerLine - Horizontal scanning line effect
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../../theme/colors';

const ScannerLine = ({
  width = 180,
  height = 100,
  lineHeight = 2,
  duration = 2000,
  color = COLORS.accent,
}) => {
  const translateY = useRef(new Animated.Value(-lineHeight)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: height,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -lineHeight,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(300),
      ])
    ).start();

    return () => translateY.stopAnimation();
  }, [height, duration]);

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Scanner line with glow */}
      <Animated.View
        style={[
          styles.lineContainer,
          {
            width,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Glow above */}
        <LinearGradient
          colors={['transparent', `${color}40`]}
          style={[styles.glow, { width, height: 20 }]}
        />
        {/* Main line */}
        <View
          style={[
            styles.line,
            {
              width,
              height: lineHeight,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
        {/* Glow below */}
        <LinearGradient
          colors={[`${color}40`, 'transparent']}
          style={[styles.glow, { width, height: 20 }]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'absolute',
  },
  lineContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
  },
  line: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default ScannerLine;
