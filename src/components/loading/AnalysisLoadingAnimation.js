/**
 * AnalysisLoadingAnimation
 * Stadium scanner themed loading animation for match analysis screen
 * Features: Mini pitch, scanning line, animated football, typing dots
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { COLORS } from '../../theme/colors';
import { TypingDots, ScannerLine, AnimatedFootball } from './shared';
import { t } from '../../i18n';

const AnalysisLoadingAnimation = ({ compact = false, fullWidth = false }) => {
  const [textIndex, setTextIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(1)).current;
  const pitchOpacity = useRef(new Animated.Value(0)).current;

  // Rotating loading messages
  const loadingMessages = useMemo(() => [
    t('loading.analysis.analyzing', 'Analiz yapılıyor...'),
    t('loading.analysis.collectingData', 'Takım verileri toplanıyor...'),
    t('loading.analysis.comparingStats', 'İstatistikler karşılaştırılıyor...'),
    t('loading.analysis.aiEvaluating', 'Yapay zeka değerlendiriyor...'),
  ], []);

  // Initial fade in for pitch
  useEffect(() => {
    Animated.timing(pitchOpacity, {
      toValue: 0.3,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => pitchOpacity.stopAnimation();
  }, []);

  // Text rotation effect
  useEffect(() => {
    const textInterval = setInterval(() => {
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setTextIndex((prev) => (prev + 1) % loadingMessages.length);
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearInterval(textInterval);
  }, [loadingMessages.length]);

  // Sizes based on compact/fullWidth mode
  const pitchWidth = compact ? 140 : fullWidth ? SCREEN_WIDTH - 48 : 200;
  const pitchHeight = compact ? 85 : fullWidth ? (SCREEN_WIDTH - 48) * 0.5 : 120;
  const footballSize = compact ? 40 : fullWidth ? 80 : 56;

  return (
    <View style={[styles.container, compact && styles.containerCompact, fullWidth && styles.containerFullWidth]}>
      {/* Stadium pitch with scanner */}
      <View style={[styles.pitchContainer, { width: pitchWidth, height: pitchHeight }]}>
        {/* Mini football pitch background */}
        <Animated.View style={[styles.pitch, { opacity: pitchOpacity }]}>
          {/* Pitch outline */}
          <View style={styles.pitchOutline}>
            {/* Center line */}
            <View style={styles.centerLine} />
            {/* Center circle */}
            <View style={styles.centerCircle} />
            {/* Left penalty area */}
            <View style={[styles.penaltyArea, styles.penaltyAreaLeft]} />
            {/* Right penalty area */}
            <View style={[styles.penaltyArea, styles.penaltyAreaRight]} />
            {/* Left goal */}
            <View style={[styles.goal, styles.goalLeft]} />
            {/* Right goal */}
            <View style={[styles.goal, styles.goalRight]} />
          </View>
        </Animated.View>

        {/* Scanner line */}
        <ScannerLine
          width={pitchWidth - 4}
          height={pitchHeight - 4}
          lineHeight={2}
          duration={2000}
          color={COLORS.accent}
        />

        {/* Animated Football in center */}
        <AnimatedFootball size={footballSize} pulseEnabled />
      </View>

      {/* Typing dots */}
      <View style={styles.dotsContainer}>
        <TypingDots
          dotCount={3}
          dotSize={compact ? 6 : 8}
          color={COLORS.accent}
          spacing={compact ? 8 : 10}
        />
      </View>

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
  containerFullWidth: {
    width: '100%',
    paddingHorizontal: 24,
  },
  pitchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pitch: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pitchOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 50, 30, 0.3)',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.5,
  },
  centerCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 30,
    height: 30,
    marginLeft: -15,
    marginTop: -15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.accent,
    opacity: 0.5,
  },
  penaltyArea: {
    position: 'absolute',
    top: '25%',
    height: '50%',
    width: '15%',
    borderWidth: 1,
    borderColor: COLORS.accent,
    opacity: 0.5,
  },
  penaltyAreaLeft: {
    left: 0,
    borderLeftWidth: 0,
  },
  penaltyAreaRight: {
    right: 0,
    borderRightWidth: 0,
  },
  goal: {
    position: 'absolute',
    top: '40%',
    height: '20%',
    width: '3%',
    backgroundColor: COLORS.accent,
    opacity: 0.3,
  },
  goalLeft: {
    left: 0,
  },
  goalRight: {
    right: 0,
  },
  dotsContainer: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingTextCompact: {
    fontSize: 12,
  },
});

export default AnalysisLoadingAnimation;
