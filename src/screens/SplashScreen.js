import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED FOOTBALL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AnimatedFootball = ({ rotation, scale, translateY }) => {
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.footballContainer,
        {
          transform: [
            { rotate: spin },
            { scale },
            { translateY },
          ],
        },
      ]}
    >
      {/* Football SVG-like design with Views */}
      <View style={styles.football}>
        <View style={styles.footballInner}>
          {/* Pentagon patterns */}
          <View style={[styles.pentagon, styles.pentagonTop]} />
          <View style={[styles.pentagon, styles.pentagonLeft]} />
          <View style={[styles.pentagon, styles.pentagonRight]} />
          <View style={[styles.pentagon, styles.pentagonBottom]} />
          <View style={[styles.pentagon, styles.pentagonCenter]} />
        </View>
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLE EFFECT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Particle = ({ delay, startX, startY }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 200;
    const randomY = (Math.random() - 0.5) * 200;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: randomX,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: randomY,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const SplashScreen = ({ navigation }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ballRotation = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(0)).current;
  const ballTranslateY = useRef(new Animated.Value(50)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const particlesVisible = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start all animations
    startAnimations();

    // Navigate after 2.5 seconds
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const startAnimations = () => {
    // Logo animation (spring effect)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Ball animation with bounce
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(ballScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(ballTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous ball rotation
    Animated.loop(
      Animated.timing(ballRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Subtitle animation
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particles visibility
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(particlesVisible, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Generate particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: 300 + i * 100,
    startX: width / 2 - 4,
    startY: height / 2 - 60,
  }));

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[COLORS.bg, '#0d1219', '#0a0e13']}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated glow effect */}
      <Animated.View style={[styles.glowContainer, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={['transparent', COLORS.accentGlow, 'transparent']}
          style={styles.glowGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Radial glow behind logo */}
      <Animated.View style={[styles.radialGlow, { opacity: glowOpacity }]} />

      {/* Particles */}
      <Animated.View style={{ opacity: particlesVisible }}>
        {particles.map((p) => (
          <Particle key={p.id} delay={p.delay} startX={p.startX} startY={p.startY} />
        ))}
      </Animated.View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Animated football */}
        <AnimatedFootball
          rotation={ballRotation}
          scale={ballScale}
          translateY={ballTranslateY}
        />

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.logoText}>GOALWISE</Text>
          <View style={styles.logoUnderline} />
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          <Text style={styles.subtitleText}>AI Destekli Maç Analizi</Text>
          <View style={styles.subtitleDots}>
            <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
            <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
            <View style={[styles.dot, { backgroundColor: COLORS.liveRed }]} />
          </View>
        </Animated.View>
      </View>

      {/* Bottom gradient fade */}
      <LinearGradient
        colors={['transparent', COLORS.bg]}
        style={styles.bottomGradient}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowGradient: {
    width: width * 1.5,
    height: height * 0.6,
  },
  radialGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.accentGlow,
    top: height / 2 - 200,
    left: width / 2 - 150,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },

  // Football styles
  footballContainer: {
    marginBottom: 30,
  },
  football: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  footballInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pentagon: {
    position: 'absolute',
    width: 22,
    height: 22,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  pentagonTop: {
    top: 8,
    left: 34,
  },
  pentagonLeft: {
    top: 32,
    left: 12,
  },
  pentagonRight: {
    top: 32,
    right: 12,
  },
  pentagonBottom: {
    bottom: 12,
    left: 34,
  },
  pentagonCenter: {
    width: 18,
    height: 18,
  },

  // Logo styles
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 6,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoUnderline: {
    width: 120,
    height: 3,
    backgroundColor: COLORS.accent,
    marginTop: 8,
    borderRadius: 2,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },

  // Subtitle styles
  subtitleContainer: {
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: COLORS.gray400,
    letterSpacing: 2,
    marginBottom: 16,
  },
  subtitleDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Particle styles
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },

  // Bottom gradient
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
});

export default SplashScreen;
