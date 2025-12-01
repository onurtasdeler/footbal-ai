/**
 * TypingDots - Bouncing dots loading indicator
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../../theme/colors';

const TypingDots = ({
  dotCount = 3,
  dotSize = 8,
  color = COLORS.accent,
  spacing = 10,
}) => {
  const dotAnims = useRef(
    [...Array(dotCount)].map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    const animations = dotAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.spring(anim, {
            toValue: 1.4,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.spring(anim, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
        ])
      );
    });

    Animated.parallel(animations).start();

    return () => {
      dotAnims.forEach(anim => anim.stopAnimation());
    };
  }, []);

  return (
    <View style={[styles.container, { gap: spacing }]}>
      {dotAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              transform: [{ scale: anim }],
              shadowColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default TypingDots;
