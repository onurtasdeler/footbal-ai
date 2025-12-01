/**
 * AnimatedFootball - Realistic pulsing football/soccer ball component
 * Features classic black pentagon pattern on white ball
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../../theme/colors';

const AnimatedFootball = ({ size = 60, pulseEnabled = true }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pulseEnabled) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.08,
              duration: 750,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.6,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 750,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();

      // Subtle rotation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      ).start();
    }

    return () => {
      scaleAnim.stopAnimation();
      glowAnim.stopAnimation();
      rotateAnim.stopAnimation();
    };
  }, [pulseEnabled]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Pentagon sizes - classic soccer ball has 12 pentagons
  const pentSize = size * 0.22;
  const pentRadius = pentSize * 0.5; // More rounded = more pentagon-like

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size * 0.8,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Football ball - white background */}
      <Animated.View
        style={[
          styles.football,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        {/* Inner gradient effect */}
        <View
          style={[
            styles.footballInner,
            {
              width: size - 4,
              height: size - 4,
              borderRadius: (size - 4) / 2,
            },
          ]}
        >
          {/* Center pentagon (black) */}
          <View
            style={[
              styles.pentagon,
              {
                width: pentSize,
                height: pentSize,
                borderRadius: pentRadius,
              },
            ]}
          />

          {/* Top pentagon */}
          <View
            style={[
              styles.pentagon,
              {
                width: pentSize * 0.8,
                height: pentSize * 0.8,
                borderRadius: pentRadius * 0.8,
                top: size * 0.08,
                left: size / 2 - (pentSize * 0.8) / 2 - 2,
              },
            ]}
          />

          {/* Top-left pentagon */}
          <View
            style={[
              styles.pentagon,
              {
                width: pentSize * 0.7,
                height: pentSize * 0.7,
                borderRadius: pentRadius * 0.7,
                top: size * 0.22,
                left: size * 0.12,
              },
            ]}
          />

          {/* Top-right pentagon */}
          <View
            style={[
              styles.pentagon,
              {
                width: pentSize * 0.7,
                height: pentSize * 0.7,
                borderRadius: pentRadius * 0.7,
                top: size * 0.22,
                right: size * 0.12,
              },
            ]}
          />

          {/* Bottom-left pentagon */}
          <View
            style={[
              styles.pentagon,
              {
                width: pentSize * 0.7,
                height: pentSize * 0.7,
                borderRadius: pentRadius * 0.7,
                bottom: size * 0.22,
                left: size * 0.12,
              },
            ]}
          />

          {/* Bottom-right pentagon */}
          <View
            style={[
              styles.pentagon,
              {
                width: pentSize * 0.7,
                height: pentSize * 0.7,
                borderRadius: pentRadius * 0.7,
                bottom: size * 0.22,
                right: size * 0.12,
              },
            ]}
          />

          {/* Bottom pentagon */}
          <View
            style={[
              styles.pentagon,
              {
                width: pentSize * 0.8,
                height: pentSize * 0.8,
                borderRadius: pentRadius * 0.8,
                bottom: size * 0.08,
                left: size / 2 - (pentSize * 0.8) / 2 - 2,
              },
            ]}
          />

          {/* Stitching lines from center */}
          <View style={[styles.stitch, { transform: [{ rotate: '0deg' }], height: size * 0.18 }]} />
          <View style={[styles.stitch, { transform: [{ rotate: '60deg' }], height: size * 0.18 }]} />
          <View style={[styles.stitch, { transform: [{ rotate: '120deg' }], height: size * 0.18 }]} />
          <View style={[styles.stitch, { transform: [{ rotate: '180deg' }], height: size * 0.18 }]} />
          <View style={[styles.stitch, { transform: [{ rotate: '240deg' }], height: size * 0.18 }]} />
          <View style={[styles.stitch, { transform: [{ rotate: '300deg' }], height: size * 0.18 }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: COLORS.accentGlow,
  },
  football: {
    backgroundColor: '#f5f5f5', // White ball
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  footballInner: {
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pentagon: {
    position: 'absolute',
    backgroundColor: '#1a1a2e', // Dark pentagon (classic soccer ball look)
  },
  stitch: {
    position: 'absolute',
    width: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.4,
  },
});

export default AnimatedFootball;
