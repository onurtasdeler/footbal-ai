import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../context/SubscriptionContext';
import { t } from '../i18n';

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// GOALWISE PRO - PAYWALL SCREEN
// Premium subscription modal with RevenueCat integration
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Base
  bg: '#0a0e13',
  card: '#141a22',
  cardElevated: '#1a222c',
  border: '#232d3b',
  white: '#ffffff',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',

  // Gold/PRO
  goldPrimary: '#F4B43A',
  goldLight: '#FFD700',
  goldDark: '#B8860B',
  goldGlow: 'rgba(244, 180, 58, 0.25)',
  goldDim: 'rgba(244, 180, 58, 0.12)',

  // Accent
  accent: '#00d4aa',
};

// PRO Features - will be populated from i18n
const getFeatures = () => [
  { icon: 'analytics', text: t('paywall.features.detailedAnalysis') },
  { icon: 'eye-off', text: t('paywall.features.adFree') },
  { icon: 'stats-chart', text: t('paywall.features.detailedPrediction') },
  { icon: 'football', text: t('paywall.features.liveTracking') },
];

// Default pricing (fallback if RevenueCat prices not available)
const getDefaultPlans = () => [
  {
    id: 'weekly',
    title: t('paywall.weekly'),
    price: '₺29.99',
    period: t('paywall.perWeek'),
    badge: null,
    savings: null,
  },
  {
    id: 'monthly',
    title: t('paywall.monthly'),
    price: '₺79.99',
    period: t('paywall.perMonth'),
    badge: t('paywall.mostPopular'),
    savings: t('paywall.savings'),
    highlighted: true,
  },
];

const PaywallScreen = ({ visible: propVisible, onClose, navigation }) => {
  // Support both navigation mode and inline modal mode
  const isNavigationMode = !!navigation;
  const visible = propVisible ?? isNavigationMode;
  const closeScreen = () => {
    if (isNavigationMode) {
      navigation.goBack();
    } else if (onClose) {
      onClose();
    }
  };

  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // RevenueCat subscription context
  const { purchase, restore, prices, isLoading } = useSubscription();

  // Build plans with real prices from RevenueCat
  const DEFAULT_PLANS = getDefaultPlans();
  const FEATURES = getFeatures();
  const PLANS = DEFAULT_PLANS.map(plan => ({
    ...plan,
    price: plan.id === 'weekly'
      ? (prices.weekly?.price || plan.price)
      : (prices.monthly?.price || plan.price),
  }));

  // Trophy glow animation
  useEffect(() => {
    if (visible) {
      // Start glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Slide up + fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => closeScreen());
  };

  // Handle purchase with RevenueCat
  const handlePurchase = async () => {
    if (isPurchasing) return;

    setIsPurchasing(true);
    try {
      const result = await purchase(selectedPlan);

      if (result.success) {
        // Purchase successful
        Alert.alert(
          t('common.success'),
          t('paywall.purchaseSuccess'),
          [{ text: t('common.ok'), onPress: handleClose }]
        );
      } else if (result.cancelled) {
        // User cancelled - do nothing
      } else if (result.error) {
        // Purchase failed
        Alert.alert(
          t('common.error'),
          result.error || t('paywall.purchaseError'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t('paywall.unexpectedError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle restore purchases
  const handleRestore = async () => {
    if (isPurchasing) return;

    setIsPurchasing(true);
    try {
      const result = await restore();

      if (result.success && result.hasProAccess) {
        Alert.alert(
          t('common.success'),
          t('paywall.restoreSuccess'),
          [{ text: t('common.ok'), onPress: handleClose }]
        );
      } else if (result.success && !result.hasProAccess) {
        Alert.alert(
          t('paywall.info'),
          t('paywall.restoreNoSubscription'),
          [{ text: t('common.ok') }]
        );
      } else {
        Alert.alert(
          t('common.error'),
          result.error || t('paywall.restoreError'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t('paywall.unexpectedError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <StatusBar barStyle="light-content" />

        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Background Gradient */}
          <LinearGradient
            colors={['#0a0e13', '#141a22', '#1a1f2e']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Decorative Gold Glow at Top */}
          <Animated.View
            style={[
              styles.topGlow,
              { opacity: glowAnim }
            ]}
          />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
            disabled={isPurchasing}
          >
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={22} color={COLORS.white} />
            </View>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              {/* Animated Trophy with Glow */}
              <Animated.View
                style={[
                  styles.trophyContainer,
                  {
                    transform: [{ scale: Animated.add(0.95, Animated.multiply(glowAnim, 0.1)) }],
                  }
                ]}
              >
                <View style={styles.trophyGlow} />
                <Ionicons name="trophy" size={44} color={COLORS.goldPrimary} />
              </Animated.View>

              <Text style={styles.heroTitle}>{t('paywall.title')}</Text>
              <Text style={styles.heroSubtitle}>{t('paywall.subtitle')}</Text>
            </View>

            {/* Features Card */}
            <View style={styles.featuresCard}>
              <View style={styles.featuresGlow} />
              {FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons
                      name={feature.icon}
                      size={18}
                      color={COLORS.goldPrimary}
                    />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.goldPrimary}
                  />
                </View>
              ))}
            </View>

            {/* Pricing Cards */}
            <View style={styles.pricingSection}>
              <Text style={styles.pricingTitle}>{t('paywall.selectPlan')}</Text>
              <View style={styles.pricingCards}>
                {PLANS.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.pricingCard,
                      selectedPlan === plan.id && styles.pricingCardSelected,
                      plan.highlighted && styles.pricingCardHighlighted,
                    ]}
                    onPress={() => setSelectedPlan(plan.id)}
                    activeOpacity={0.8}
                    disabled={isPurchasing}
                  >
                    {/* Popular Badge */}
                    {plan.badge && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>{plan.badge}</Text>
                      </View>
                    )}

                    {/* Selection Indicator */}
                    <View style={[
                      styles.selectionIndicator,
                      selectedPlan === plan.id && styles.selectionIndicatorActive
                    ]}>
                      {selectedPlan === plan.id && (
                        <Ionicons name="checkmark" size={14} color={COLORS.bg} />
                      )}
                    </View>

                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceMain}>{plan.price}</Text>
                      <Text style={styles.pricePeriod}>{plan.period}</Text>
                    </View>

                    {plan.savings && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>{plan.savings}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.ctaButton, isPurchasing && styles.ctaButtonDisabled]}
              onPress={handlePurchase}
              activeOpacity={0.9}
              disabled={isPurchasing}
            >
              <LinearGradient
                colors={isPurchasing
                  ? [COLORS.gray500, COLORS.gray600, COLORS.gray500]
                  : [COLORS.goldLight, COLORS.goldPrimary, COLORS.goldDark]
                }
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="flash" size={20} color={COLORS.bg} />
                    <Text style={styles.ctaText}>{t('paywall.upgradeToPro')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Restore Purchase Link */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isPurchasing}
            >
              <Text style={[styles.restoreText, isPurchasing && styles.restoreTextDisabled]}>
                {t('paywall.restorePurchase')}
              </Text>
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footer}>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('paywall.privacyPolicy')}</Text>
              </TouchableOpacity>
              <Text style={styles.footerDivider}>|</Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('paywall.termsOfUse')}</Text>
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              {t('paywall.disclaimer')}
            </Text>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  topGlow: {
    position: 'absolute',
    top: -100,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.goldGlow,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    zIndex: 100,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  trophyContainer: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.goldGlow,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.goldPrimary,
    letterSpacing: 1.5,
    marginBottom: 4,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.gray400,
    letterSpacing: 0.3,
  },

  // Features Card
  featuresCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  featuresGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.goldGlow,
    opacity: 0.3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: COLORS.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },

  // Pricing Section
  pricingSection: {
    marginBottom: 18,
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  pricingCards: {
    flexDirection: 'row',
    gap: 10,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: COLORS.goldPrimary,
    backgroundColor: COLORS.goldDim,
  },
  pricingCardHighlighted: {
    borderColor: COLORS.goldPrimary,
  },
  popularBadge: {
    position: 'absolute',
    top: -9,
    backgroundColor: COLORS.goldPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.bg,
    letterSpacing: 0.3,
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectionIndicatorActive: {
    backgroundColor: COLORS.goldPrimary,
    borderColor: COLORS.goldPrimary,
  },
  planTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray400,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceMain: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  pricePeriod: {
    fontSize: 12,
    color: COLORS.gray500,
    marginLeft: 2,
  },
  savingsBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // CTA Button
  ctaButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.goldPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bg,
    letterSpacing: 0.3,
  },

  // Restore Button
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  restoreText: {
    fontSize: 13,
    color: COLORS.gray500,
    textDecorationLine: 'underline',
  },
  restoreTextDisabled: {
    color: COLORS.gray600,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 11,
    color: COLORS.gray500,
  },
  footerDivider: {
    fontSize: 11,
    color: COLORS.gray600,
    marginHorizontal: 8,
  },
  disclaimer: {
    fontSize: 10,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 16,
  },
});

export default PaywallScreen;
