import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { setOnboardingCompleted } from '../services/cacheService';
import { t } from '../i18n';

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1: GOAL ANIMATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const GoalAnimation = ({ isActive }) => {
  const ballX = useRef(new Animated.Value(-80)).current;
  const ballScale = useRef(new Animated.Value(1)).current;
  const netShake = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;
  const goalTextOpacity = useRef(new Animated.Value(0)).current;
  const goalTextScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isActive) {
      ballX.setValue(-80);
      ballScale.setValue(1);
      netShake.setValue(0);
      confettiOpacity.setValue(0);
      confettiScale.setValue(0);
      goalTextOpacity.setValue(0);
      goalTextScale.setValue(0.5);

      Animated.sequence([
        Animated.timing(ballX, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(ballScale, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(netShake, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(netShake, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(netShake, { toValue: 6, duration: 50, useNativeDriver: true }),
            Animated.timing(netShake, { toValue: -4, duration: 50, useNativeDriver: true }),
            Animated.timing(netShake, { toValue: 0, duration: 50, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(confettiOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(confettiScale, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.spring(goalTextScale, { toValue: 1, friction: 3, useNativeDriver: true }),
          Animated.timing(goalTextOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [isActive]);

  const confettiColors = [COLORS.accent, COLORS.warning, COLORS.liveRed, COLORS.success, '#FFD700'];
  const confettiParticles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
    left: Math.random() * 200 - 100,
    top: Math.random() * 100 - 50,
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 8,
  }));

  return (
    <View style={styles.goalAnimationContainer}>
      <View style={styles.goalPost}>
        <View style={styles.goalPostTop} />
        <View style={styles.goalPostLeft} />
        <View style={styles.goalPostRight} />
        <Animated.View style={[styles.goalNet, { transform: [{ translateX: netShake }] }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.netLineH, { top: i * 12 + 6 }]} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.netLineV, { left: i * 12 + 6 }]} />
          ))}
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.animatedBall,
          { transform: [{ translateX: ballX }, { scale: ballScale }] },
        ]}
      >
        <View style={styles.ballInner}>
          <View style={styles.ballPentagon} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.confettiContainer, { opacity: confettiOpacity, transform: [{ scale: confettiScale }] }]}>
        {confettiParticles.map((p) => (
          <View
            key={p.id}
            style={[
              styles.confettiPiece,
              {
                backgroundColor: p.color,
                left: 100 + p.left,
                top: 70 + p.top,
                width: p.size,
                height: p.size / 2,
                transform: [{ rotate: `${p.rotate}deg` }],
              },
            ]}
          />
        ))}
      </Animated.View>

      <Animated.View style={[styles.goalTextContainer, { opacity: goalTextOpacity, transform: [{ scale: goalTextScale }] }]}>
        <Text style={styles.goalText}>{t('onboarding.goal')}</Text>
      </Animated.View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2: LIVE SCORE ANIMATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const LiveScoreAnimation = ({ isActive }) => {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const liveOpacity = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      setHomeScore(0);
      setAwayScore(0);

      Animated.loop(
        Animated.sequence([
          Animated.timing(liveOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(liveOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();

      const scoreSequence = [
        { delay: 600, home: 1, away: 0 },
        { delay: 1200, home: 1, away: 1 },
        { delay: 1800, home: 2, away: 1 },
      ];

      scoreSequence.forEach(({ delay, home, away }) => {
        setTimeout(() => {
          setHomeScore(home);
          setAwayScore(away);
          Animated.sequence([
            Animated.timing(scoreScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
            Animated.spring(scoreScale, { toValue: 1, friction: 3, useNativeDriver: true }),
          ]).start();
        }, delay);
      });
    }
    return () => liveOpacity.stopAnimation();
  }, [isActive]);

  return (
    <View style={styles.liveScoreContainer}>
      <View style={styles.matchCard}>
        <Animated.View style={[styles.liveIndicator, { opacity: liveOpacity }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('onboarding.live')}</Text>
        </Animated.View>

        <View style={styles.teamsContainer}>
          <View style={styles.teamInfo}>
            <View style={[styles.teamLogo, { backgroundColor: COLORS.homeTeam }]}>
              <Text style={styles.teamLogoText}>FCB</Text>
            </View>
            <Text style={styles.teamName}>Barcelona</Text>
          </View>

          <Animated.View style={[styles.scoreContainer, { transform: [{ scale: scoreScale }] }]}>
            <Text style={styles.scoreText}>{homeScore}</Text>
            <Text style={styles.scoreDivider}>-</Text>
            <Text style={styles.scoreText}>{awayScore}</Text>
          </Animated.View>

          <View style={styles.teamInfo}>
            <View style={[styles.teamLogo, { backgroundColor: COLORS.awayTeam }]}>
              <Text style={styles.teamLogoText}>RMA</Text>
            </View>
            <Text style={styles.teamName}>Real Madrid</Text>
          </View>
        </View>

        <Text style={styles.matchTime}>67'</Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM FEATURE CARD
// ═══════════════════════════════════════════════════════════════════════════════
const FeatureCard = ({ icon, title, subtitle, color, delay }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.featureCard, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.featureIconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.featureTextBox}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const OnboardingPage = ({ page, isActive }) => {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      titleOpacity.setValue(0);
      titleTranslateY.setValue(30);
      badgeScale.setValue(0);

      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.spring(badgeScale, { toValue: 1, friction: 4, delay: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  return (
    <View style={styles.pageContainer}>
      {/* Animation Area */}
      <View style={styles.animationArea}>
        {page.id === 1 ? <GoalAnimation isActive={isActive} /> : <LiveScoreAnimation isActive={isActive} />}
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {/* Badge */}
        <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
          <LinearGradient
            colors={page.badgeColors}
            style={styles.badgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.badgeText}>{page.badge}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }}>
          <Text style={styles.pageTitle}>{page.title}</Text>
          <Text style={styles.pageSubtitle}>{page.subtitle}</Text>
        </Animated.View>

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          {page.features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              subtitle={feature.subtitle}
              color={feature.color}
              delay={400 + index * 150}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ONBOARDING SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const OnboardingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const pages = [
    {
      id: 1,
      badge: t('onboarding.new'),
      badgeColors: [COLORS.accent, '#00b894'],
      title: t('onboarding.page1.title'),
      subtitle: t('onboarding.page1.subtitle'),
      features: [
        { icon: 'trending-up', title: t('onboarding.page1.feature1Title'), subtitle: t('onboarding.page1.feature1Subtitle'), color: COLORS.accent },
        { icon: 'analytics', title: t('onboarding.page1.feature2Title'), subtitle: t('onboarding.page1.feature2Subtitle'), color: COLORS.warning },
        { icon: 'shield-checkmark', title: t('onboarding.page1.feature3Title'), subtitle: t('onboarding.page1.feature3Subtitle'), color: COLORS.success },
      ],
    },
    {
      id: 2,
      badge: t('onboarding.live'),
      badgeColors: [COLORS.liveRed, '#ff6b6b'],
      title: t('onboarding.page2.title'),
      subtitle: t('onboarding.page2.subtitle'),
      features: [
        { icon: 'flash', title: t('onboarding.page2.feature1Title'), subtitle: t('onboarding.page2.feature1Subtitle'), color: COLORS.liveRed },
        { icon: 'stats-chart', title: t('onboarding.page2.feature2Title'), subtitle: t('onboarding.page2.feature2Subtitle'), color: COLORS.homeTeam },
        { icon: 'time', title: t('onboarding.page2.feature3Title'), subtitle: t('onboarding.page2.feature3Subtitle'), color: COLORS.accent },
      ],
    },
  ];

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    if (page !== currentPage) setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      scrollViewRef.current?.scrollTo({ x: (currentPage + 1) * width, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    await setOnboardingCompleted();
    navigation.replace('Main');
  };

  const handleSkip = async () => {
    await setOnboardingCompleted();
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg, '#0d1219', COLORS.bg]} style={StyleSheet.absoluteFill} />

      {/* Skip */}
      <TouchableOpacity style={[styles.skipButton, { top: insets.top + 10 }]} onPress={handleSkip}>
        <Text style={styles.skipText}>{t('common.skip')}</Text>
      </TouchableOpacity>

      {/* Pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={{ flex: 1 }}
      >
        {pages.map((page, index) => (
          <OnboardingPage key={page.id} page={page} isActive={currentPage === index} />
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.indicators}>
          {pages.map((_, index) => (
            <View key={index} style={[styles.indicator, currentPage === index && styles.indicatorActive]} />
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity style={styles.actionButton} onPress={goToNextPage} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.accent, '#00b894']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonText}>
                {currentPage === pages.length - 1 ? t('common.start') : t('common.next')}
              </Text>
              <Ionicons
                name={currentPage === pages.length - 1 ? 'rocket' : 'arrow-forward'}
                size={20}
                color={COLORS.bg}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    color: COLORS.gray400,
    fontSize: 15,
    fontWeight: '500',
  },

  // Page
  pageContainer: {
    width,
    flex: 1,
  },
  animationArea: {
    height: height * 0.30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },

  // Badge
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Title
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: COLORS.gray400,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Features
  featuresContainer: {
    gap: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
  },

  // Goal Animation
  goalAnimationContainer: {
    width: 200,
    height: 140,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPost: {
    width: 140,
    height: 100,
    position: 'relative',
  },
  goalPostTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  goalPostLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 8,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  goalPostRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  goalNet: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  netLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  netLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  animatedBall: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    left: 100,
    top: 65,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  ballInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballPentagon: {
    width: 12,
    height: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
  goalTextContainer: {
    position: 'absolute',
    top: -10,
  },
  goalText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  // Live Score
  liveScoreContainer: {
    width: 220,
    alignItems: 'center',
  },
  matchCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.liveRed,
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.liveRed,
    letterSpacing: 1,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  teamInfo: {
    alignItems: 'center',
    width: 60,
  },
  teamLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  teamLogoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  teamName: {
    fontSize: 10,
    color: COLORS.gray400,
    textAlign: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  scoreDivider: {
    fontSize: 18,
    color: COLORS.gray500,
    marginHorizontal: 6,
  },
  matchTime: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    textAlign: 'center',
  },

  // Bottom
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray700,
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 28,
    backgroundColor: COLORS.accent,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.bg,
  },
});

export default OnboardingScreen;
