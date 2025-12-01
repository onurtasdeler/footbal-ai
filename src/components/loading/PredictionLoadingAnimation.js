/**
 * PredictionLoadingAnimation
 * Football-themed loading animation for predictions screen
 * Features: Pulsing football, orbiting rings, data bars, rotating text
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { AnimatedFootball, OrbitRing, DataBar } from './shared';
import { t } from '../../i18n';

const PredictionLoadingAnimation = ({ compact = false }) => {
  const [textIndex, setTextIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const [displayProgress, setDisplayProgress] = useState(0);

  // Rotating loading messages
  const loadingMessages = useMemo(() => [
    t('loading.predictions.calculating', 'Tahminler hesaplanıyor...'),
    t('loading.predictions.analyzingForm', 'Form verileri analiz ediliyor...'),
    t('loading.predictions.comparing', 'Karşılaştırma yapılıyor...'),
    t('loading.predictions.aiRunning', 'AI modeli çalıştırılıyor...'),
  ], []);

  // Text rotation effect
  useEffect(() => {
    const textInterval = setInterval(() => {
      // Fade out
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Change text
        setTextIndex((prev) => (prev + 1) % loadingMessages.length);
        // Fade in
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2000);

    return () => clearInterval(textInterval);
  }, [loadingMessages.length]);

  // Progress counter animation
  useEffect(() => {
    const animate = () => {
      progressValue.setValue(0);
      Animated.timing(progressValue, {
        toValue: 100,
        duration: 5000,
        useNativeDriver: false,
      }).start(() => animate());
    };
    animate();

    // Listen to progress value changes
    const listenerId = progressValue.addListener(({ value }) => {
      setDisplayProgress(Math.round(value));
    });

    return () => {
      progressValue.stopAnimation();
      progressValue.removeListener(listenerId);
    };
  }, []);

  // Sizes based on compact mode
  const footballSize = compact ? 45 : 60;
  const ringRadius1 = compact ? 38 : 50;
  const ringRadius2 = compact ? 52 : 70;
  const ringRadius3 = compact ? 68 : 90;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Football with orbiting rings */}
      <View style={[styles.orbitsContainer, { width: ringRadius3 * 2 + 20, height: ringRadius3 * 2 + 20 }]}>
        {/* Outer ring - success color, slowest */}
        <OrbitRing
          radius={ringRadius3}
          dotCount={7}
          dotSize={compact ? 5 : 6}
          color={COLORS.success}
          duration={4500}
          clockwise={true}
        />

        {/* Middle ring - warning color, medium speed */}
        <OrbitRing
          radius={ringRadius2}
          dotCount={5}
          dotSize={compact ? 6 : 7}
          color={COLORS.warning}
          duration={3000}
          clockwise={false}
        />

        {/* Inner ring - accent color, fastest */}
        <OrbitRing
          radius={ringRadius1}
          dotCount={3}
          dotSize={compact ? 7 : 8}
          color={COLORS.accent}
          duration={2000}
          clockwise={true}
        />

        {/* Center football */}
        <View style={styles.footballWrapper}>
          <AnimatedFootball size={footballSize} pulseEnabled={true} />
        </View>
      </View>

      {/* Data processing bars */}
      {!compact && (
        <View style={styles.barsContainer}>
          <DataBar
            label={t('loading.predictions.form', 'Form')}
            targetPercent={85}
            delay={0}
            color={COLORS.accent}
          />
          <DataBar
            label={t('loading.predictions.h2h', 'H2H')}
            targetPercent={72}
            delay={400}
            color={COLORS.warning}
          />
          <DataBar
            label={t('loading.predictions.tactics', 'Taktik')}
            targetPercent={91}
            delay={800}
            color={COLORS.success}
          />
        </View>
      )}

      {/* Loading text */}
      <Animated.Text
        style={[
          styles.loadingText,
          compact && styles.loadingTextCompact,
          { opacity: textOpacity },
        ]}
      >
        {loadingMessages[textIndex]}
      </Animated.Text>

      {/* Progress counter */}
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, compact && styles.progressTextCompact]}>
          %{displayProgress}{' '}
          <Text style={styles.progressLabel}>
            {t('loading.predictions.ready', 'hazır')}
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    paddingVertical: 40,
  },
  containerCompact: {
    flex: 0,
    paddingVertical: 30,
  },
  orbitsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  footballWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsContainer: {
    width: 160,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray400,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingTextCompact: {
    fontSize: 12,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
  },
  progressTextCompact: {
    fontSize: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray500,
  },
});

export default PredictionLoadingAnimation;
