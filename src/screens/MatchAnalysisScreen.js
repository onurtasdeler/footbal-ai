import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import footballApi from '../services/footballApi';
import claudeAi from '../services/claudeAi';
import cacheService from '../services/cacheService';
import { useSubscription } from '../context/SubscriptionContext';
import PaywallScreen from './PaywallScreen';
import { t } from '../i18n';
import { AnalysisLoadingAnimation } from '../components/loading';

// Stadium background image
const STADIUM_BG = require('../../assets/images/stad.jpg');

// ═══════════════════════════════════════════════════════════════════════════════
// THEME - Neon Stadium Analytics
// ═══════════════════════════════════════════════════════════════════════════════
const COLORS = {
  bg: '#0f1419',
  card: '#1c2128',
  cardHover: '#252d38',
  border: '#2d3741',

  accent: '#00d4aa',
  accentDim: 'rgba(0, 212, 170, 0.15)',
  accentGlow: 'rgba(0, 212, 170, 0.3)',

  success: '#00d977',
  warning: '#ff9500',
  danger: '#ff4757',

  white: '#ffffff',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray400: '#a0a0a0',
  gray500: '#8b9199',
  gray600: '#6b7280',
  gray700: '#4b5563',
  gray800: '#2d3741',
  gray900: '#1c2128',

  // Gradient colors
  gradientStart: '#1a2634',
  gradientEnd: '#0f1419',
  homeColor: '#3b82f6',
  awayColor: '#ef4444',

  // Factor colors
  formBar: '#00d4aa',
  h2hBar: '#3b82f6',
  kadroBar: '#8b5cf6',
  taktikBar: '#06b6d4',
  motivasyonBar: '#f59e0b',
  hakemBar: '#ef4444',
  havaBar: '#60a5fa',
  marketBar: '#a78bfa',

  // Distribution colors
  goalHome: '#3b82f6',
  goalAway: '#ef4444',
  bttsYes: '#00d977',
  bttsNo: '#ff4757',

  // Risk colors
  riskLow: '#00d977',
  riskMedium: '#ff9500',
  riskHigh: '#ff4757',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TABS - Dynamic for i18n
// ═══════════════════════════════════════════════════════════════════════════════
const getMainTabs = () => [
  { id: 'tahminler', label: t('matchAnalysis.tabs.predictions') },
  { id: 'golTahminleri', label: t('matchAnalysis.tabs.goalPredictions') },
  { id: 'golDagilimi', label: t('matchAnalysis.tabs.goalDistribution') },
  { id: 'kgSenaryolari', label: t('matchAnalysis.tabs.bttsScenarios') },
  { id: 'ilkYari', label: t('matchAnalysis.tabs.firstHalf') },
  { id: 'riskAnalizi', label: t('matchAnalysis.tabs.riskAnalysis') },
  { id: 'faktorAnalizi', label: t('matchAnalysis.tabs.factorAnalysis') },
  { id: 'formDurumu', label: t('matchAnalysis.tabs.formStatus') },
  { id: 'istatistikler', label: t('matchAnalysis.tabs.statistics') },
  { id: 'karsilikli', label: t('matchAnalysis.tabs.headToHead') },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCULAR PROGRESS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const CircularProgress = ({ value, label, size = 70, color = COLORS.accent, isNumber = false }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isNumber ? 100 : value,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const displayValue = isNumber ? value : `${value}%`;

  return (
    <View style={[circularStyles.container, { width: size }]}>
      <View style={[circularStyles.ring, { width: size, height: size, borderColor: COLORS.gray800 }]}>
        <View style={[circularStyles.ringFill, { borderColor: color }]} />
        <View style={circularStyles.innerCircle}>
          <Text style={[circularStyles.value, { color }]}>{displayValue}</Text>
        </View>
      </View>
      <Text style={circularStyles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
};

const circularStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  ring: {
    borderRadius: 100,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  ringFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 4,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
  },
  label: {
    color: COLORS.gray500,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const FactorBar = ({ category, text, impact, weight, color }) => {
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: weight * 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [weight]);

  const getImpactIcon = () => {
    if (impact === 'positive') return { icon: 'checkmark-circle', color: COLORS.success };
    if (impact === 'negative') return { icon: 'close-circle', color: COLORS.danger };
    return { icon: 'remove-circle', color: COLORS.warning };
  };

  const impactInfo = getImpactIcon();
  const barWidth = animWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const categoryLabels = {
    form: t('matchAnalysis.categories.form'),
    h2h: t('matchAnalysis.categories.h2h'),
    kadro: t('matchAnalysis.categories.squad'),
    taktik: t('matchAnalysis.categories.tactics'),
    motivasyon: t('matchAnalysis.categories.motivation'),
    hakem: t('matchAnalysis.categories.referee'),
    hava: t('matchAnalysis.categories.weather'),
    market: t('matchAnalysis.categories.market'),
  };

  return (
    <View style={factorStyles.container}>
      <View style={factorStyles.header}>
        <Text style={factorStyles.category}>{categoryLabels[category] || category}</Text>
        <Text style={[factorStyles.weight, { color: impactInfo.color }]}>
          {impact === 'positive' ? '+' : impact === 'negative' ? '-' : '±'}{Math.round(weight * 100)}%
        </Text>
        <Ionicons name={impactInfo.icon} size={16} color={impactInfo.color} />
      </View>
      <View style={factorStyles.barBg}>
        <Animated.View style={[factorStyles.barFill, { width: barWidth, backgroundColor: color }]} />
      </View>
      <Text style={factorStyles.text} numberOfLines={2}>{text}</Text>
    </View>
  );
};

const factorStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  category: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  weight: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  barBg: {
    height: 6,
    backgroundColor: COLORS.gray800,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  text: {
    color: COLORS.gray500,
    fontSize: 11,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORM DOTS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const FormDots = ({ form }) => {
  if (!form) return null;

  const formArray = form.toUpperCase().split('').slice(0, 5);

  const getFormColor = (result) => {
    if (result === 'W' || result === 'G') return COLORS.success;
    if (result === 'L' || result === 'M') return COLORS.danger;
    return COLORS.warning; // D or B (draw/berabere)
  };

  return (
    <View style={formDotsStyles.container}>
      {formArray.map((result, index) => (
        <View
          key={index}
          style={[formDotsStyles.dot, { backgroundColor: getFormColor(result) }]}
        >
          <Text style={formDotsStyles.dotText}>{result}</Text>
        </View>
      ))}
    </View>
  );
};

const formDotsStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// BET CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const BetCard = ({ type, confidence, reasoning, risk, isHot = false }) => {
  const getBgColor = () => {
    if (confidence >= 70) return 'rgba(0, 217, 119, 0.12)';
    if (confidence >= 50) return 'rgba(255, 149, 0, 0.12)';
    return 'rgba(255, 71, 87, 0.12)';
  };

  const getBorderColor = () => {
    if (confidence >= 70) return COLORS.success;
    if (confidence >= 50) return COLORS.warning;
    return COLORS.danger;
  };

  const getRiskColor = () => {
    if (!risk) return COLORS.gray500;
    const riskLower = risk.toLowerCase();
    if (riskLower === 'düşük' || riskLower === 'low') return COLORS.riskLow;
    if (riskLower === 'orta' || riskLower === 'medium') return COLORS.riskMedium;
    return COLORS.riskHigh;
  };

  const getBetIcon = () => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('ms') || typeLower.includes('1x2')) return 'trophy';
    if (typeLower.includes('kg') || typeLower.includes('btts')) return 'git-compare';
    if (typeLower.includes('üst') || typeLower.includes('over') || typeLower.includes('alt') || typeLower.includes('under')) return 'stats-chart';
    if (typeLower.includes('iy') || typeLower.includes('ht')) return 'time';
    if (typeLower.includes('korner') || typeLower.includes('corner')) return 'flag';
    return 'football';
  };

  const borderColor = getBorderColor();

  return (
    <View style={[betCardStyles.container, { backgroundColor: getBgColor(), borderColor }]}>
      {/* Hot indicator */}
      {isHot && (
        <View style={betCardStyles.hotIndicator}>
          <Text style={betCardStyles.hotText}>🔥 {t('matchAnalysis.recommendation')}</Text>
        </View>
      )}

      {/* Icon and Type */}
      <View style={betCardStyles.iconContainer}>
        <Ionicons name={getBetIcon()} size={16} color={borderColor} />
      </View>

      <Text style={[betCardStyles.type, { color: borderColor }]}>{type}</Text>

      {/* Confidence with visual bar */}
      <View style={betCardStyles.confidenceContainer}>
        <Text style={[betCardStyles.confidence, { color: borderColor }]}>%{confidence}</Text>
        <View style={betCardStyles.confidenceBar}>
          <View style={[betCardStyles.confidenceBarFill, { width: `${confidence}%`, backgroundColor: borderColor }]} />
        </View>
      </View>

      {/* Risk indicator */}
      <View style={betCardStyles.riskRow}>
        <View style={[betCardStyles.riskDot, { backgroundColor: getRiskColor() }]} />
        <Text style={[betCardStyles.riskText, { color: getRiskColor() }]}>
          {risk || t('common.mediumRisk')} {t('common.risk')}
        </Text>
      </View>

      {reasoning && <Text style={betCardStyles.reasoning} numberOfLines={2}>{reasoning}</Text>}
    </View>
  );
};

const betCardStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 90,
    maxWidth: '33%',
    marginHorizontal: 3,
    alignItems: 'center',
  },
  hotIndicator: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hotText: {
    color: COLORS.danger,
    fontSize: 9,
    fontWeight: '700',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  type: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  confidenceContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  confidenceBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '600',
  },
  reasoning: {
    color: COLORS.gray500,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCORDION SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AccordionSection = ({ title, icon, children }) => {
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(animHeight, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  return (
    <View style={accordionStyles.container}>
      <TouchableOpacity style={accordionStyles.header} onPress={toggle}>
        <View style={accordionStyles.titleRow}>
          <Ionicons name={icon} size={18} color={COLORS.accent} />
          <Text style={accordionStyles.title}>{title}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.gray500}
        />
      </TouchableOpacity>
      {expanded && <View style={accordionStyles.content}>{children}</View>}
    </View>
  );
};

const accordionStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// BANKO BADGE
// ═══════════════════════════════════════════════════════════════════════════════
const BankoBadge = ({ confidence, pulseAnim }) => {
  const getBadgeColor = () => {
    if (confidence >= 70) return COLORS.success;
    if (confidence >= 50) return COLORS.warning;
    return COLORS.danger;
  };

  const getBadgeText = () => {
    if (confidence >= 70) return t('matchAnalysis.banko');
    if (confidence >= 50) return t('matchAnalysis.mediumRisk');
    return t('matchAnalysis.risky');
  };

  return (
    <View style={styles.bankoBadgeContainer}>
      <View style={[styles.bankoBadge, { borderColor: getBadgeColor() }]}>
        <Text style={[styles.bankoBadgeText, { color: getBadgeColor() }]}>
          {getBadgeText()}
        </Text>
        <Text style={[styles.bankoBadgePercent, { color: getBadgeColor() }]}>
          %{confidence}
        </Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOAL DISTRIBUTION CHART - Poisson Visualization
// ═══════════════════════════════════════════════════════════════════════════════
const GoalDistributionChart = ({ distribution, teamColor, teamName }) => {
  if (!distribution) return null;

  const goals = ['0', '1', '2', '3', '4plus'];
  const labels = ['0', '1', '2', '3', '4+'];
  const maxValue = Math.max(...goals.map(g => distribution[g] || 0));

  return (
    <View style={goalDistStyles.container}>
      <Text style={[goalDistStyles.teamName, { color: teamColor }]}>{teamName}</Text>
      <View style={goalDistStyles.barsContainer}>
        {goals.map((goal, index) => {
          const value = distribution[goal] || 0;
          const height = maxValue > 0 ? (value / maxValue) * 60 : 0;
          return (
            <View key={goal} style={goalDistStyles.barWrapper}>
              <Text style={goalDistStyles.barValue}>{value}%</Text>
              <View style={goalDistStyles.barBackground}>
                <View
                  style={[
                    goalDistStyles.barFill,
                    { height, backgroundColor: teamColor },
                  ]}
                />
              </View>
              <Text style={goalDistStyles.barLabel}>{labels[index]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const goalDistStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  teamName: { fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barWrapper: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  barValue: { color: COLORS.gray400, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  barBackground: { width: '80%', height: 60, backgroundColor: COLORS.gray800, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: COLORS.gray500, fontSize: 11, fontWeight: '600', marginTop: 6 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// BTTS DISTRIBUTION - Segmented Bar
// ═══════════════════════════════════════════════════════════════════════════════
const BTTSDistribution = ({ distribution }) => {
  if (!distribution) return null;

  const segments = [
    { key: 'bothScore', label: t('matchAnalysis.goalDist.bothScore'), color: COLORS.success, value: distribution.bothScore || 0 },
    { key: 'onlyHomeScores', label: t('matchAnalysis.goalDist.onlyHome'), color: COLORS.homeColor, value: distribution.onlyHomeScores || 0 },
    { key: 'onlyAwayScores', label: t('matchAnalysis.goalDist.onlyAway'), color: COLORS.awayColor, value: distribution.onlyAwayScores || 0 },
    { key: 'noGoals', label: t('matchAnalysis.goalDist.noGoals'), color: COLORS.gray600, value: distribution.noGoals || 0 },
  ];

  return (
    <View style={bttsDistStyles.container}>
      <View style={bttsDistStyles.barContainer}>
        {segments.map((seg, index) => (
          <View
            key={seg.key}
            style={[
              bttsDistStyles.segment,
              {
                width: `${seg.value}%`,
                backgroundColor: seg.color,
                borderTopLeftRadius: index === 0 ? 6 : 0,
                borderBottomLeftRadius: index === 0 ? 6 : 0,
                borderTopRightRadius: index === segments.length - 1 ? 6 : 0,
                borderBottomRightRadius: index === segments.length - 1 ? 6 : 0,
              },
            ]}
          />
        ))}
      </View>
      <View style={bttsDistStyles.legendContainer}>
        {segments.map(seg => (
          <View key={seg.key} style={bttsDistStyles.legendItem}>
            <View style={[bttsDistStyles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={bttsDistStyles.legendText}>{seg.label}</Text>
            <Text style={[bttsDistStyles.legendValue, { color: seg.color }]}>{seg.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const bttsDistStyles = StyleSheet.create({
  container: { marginTop: 12 },
  barContainer: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.gray800 },
  segment: { height: '100%' },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '48%' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { color: COLORS.gray400, fontSize: 11, flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// VOLATILITY GAUGE - Risk Meter
// ═══════════════════════════════════════════════════════════════════════════════
const VolatilityGauge = ({ volatility, riskLevel }) => {
  const percentage = (volatility || 0.5) * 100;
  const getColor = () => {
    if (percentage <= 35) return COLORS.riskLow;
    if (percentage <= 65) return COLORS.riskMedium;
    return COLORS.riskHigh;
  };

  const getRiskText = () => {
    if (riskLevel) return riskLevel.toUpperCase();
    if (percentage <= 35) return t('matchAnalysis.risk.low');
    if (percentage <= 65) return t('matchAnalysis.risk.medium');
    return t('matchAnalysis.risk.high');
  };

  return (
    <View style={volatilityStyles.container}>
      <View style={volatilityStyles.gaugeWrapper}>
        <View style={volatilityStyles.gaugeBackground}>
          <LinearGradient
            colors={[COLORS.riskLow, COLORS.riskMedium, COLORS.riskHigh]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={volatilityStyles.gaugeGradient}
          />
          <View style={[volatilityStyles.gaugeIndicator, { left: `${Math.min(percentage, 95)}%` }]}>
            <View style={[volatilityStyles.indicatorDot, { backgroundColor: getColor() }]} />
          </View>
        </View>
        <View style={volatilityStyles.labelsRow}>
          <Text style={volatilityStyles.labelText}>{t('common.lowRisk')}</Text>
          <Text style={volatilityStyles.labelText}>{t('common.mediumRisk')}</Text>
          <Text style={volatilityStyles.labelText}>{t('common.highRisk')}</Text>
        </View>
      </View>
      <View style={volatilityStyles.valueContainer}>
        <Text style={[volatilityStyles.riskText, { color: getColor() }]}>{getRiskText()}</Text>
        <Text style={volatilityStyles.percentText}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

const volatilityStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  gaugeWrapper: { flex: 1 },
  gaugeBackground: { height: 8, backgroundColor: COLORS.gray800, borderRadius: 4, overflow: 'visible', position: 'relative' },
  gaugeGradient: { height: '100%', borderRadius: 4 },
  gaugeIndicator: { position: 'absolute', top: -4, marginLeft: -8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  indicatorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: COLORS.bg },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  labelText: { color: COLORS.gray500, fontSize: 10 },
  valueContainer: { alignItems: 'flex-end', marginLeft: 16 },
  riskText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  percentText: { color: COLORS.gray500, fontSize: 11, marginTop: 2 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TREND INDICATOR - Arrow with trend
// ═══════════════════════════════════════════════════════════════════════════════
const TrendIndicator = ({ trend, label, color }) => {
  const getTrendIcon = () => {
    const trendLower = (trend || '').toLowerCase();
    if (trendLower.includes('yüksel') || trendLower.includes('yukarı')) return 'trending-up';
    if (trendLower.includes('düş') || trendLower.includes('aşağı')) return 'trending-down';
    return 'remove';
  };

  const getTrendColor = () => {
    const trendLower = (trend || '').toLowerCase();
    if (trendLower.includes('yüksel') || trendLower.includes('yukarı')) return COLORS.success;
    if (trendLower.includes('düş') || trendLower.includes('aşağı')) return COLORS.danger;
    return COLORS.warning;
  };

  return (
    <View style={trendStyles.container}>
      <Text style={[trendStyles.label, color && { color }]}>{label}</Text>
      <View style={trendStyles.trendBox}>
        <Ionicons name={getTrendIcon()} size={14} color={getTrendColor()} />
        <Text style={[trendStyles.trendText, { color: getTrendColor() }]}>{trend || t('matchAnalysis.trend')}</Text>
      </View>
    </View>
  );
};

const trendStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { color: COLORS.gray400, fontSize: 12 },
  trendBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FLAG BADGE - Warning badges
// ═══════════════════════════════════════════════════════════════════════════════
const RiskFlagBadge = ({ flags }) => {
  if (!flags) return null;

  const activeFlags = [];

  if (flags.highDerbyVolatility) {
    activeFlags.push({ icon: 'flame', text: t('matchAnalysis.riskFlags.derbyVolatility'), color: COLORS.danger });
  }
  if (flags.weatherImpact && flags.weatherImpact !== 'düşük') {
    activeFlags.push({ icon: 'rainy', text: `${t('matchAnalysis.riskFlags.weather')} ${flags.weatherImpact}`, color: flags.weatherImpact === 'yüksek' ? COLORS.danger : COLORS.warning });
  }
  if (flags.fatigueRiskHome && flags.fatigueRiskHome !== 'düşük') {
    activeFlags.push({ icon: 'fitness', text: `${t('matchAnalysis.riskFlags.homeFatigue')} ${flags.fatigueRiskHome}`, color: COLORS.homeColor });
  }
  if (flags.fatigueRiskAway && flags.fatigueRiskAway !== 'düşük') {
    activeFlags.push({ icon: 'fitness', text: `${t('matchAnalysis.riskFlags.awayFatigue')} ${flags.fatigueRiskAway}`, color: COLORS.awayColor });
  }
  if (flags.marketDisagreement) {
    activeFlags.push({ icon: 'alert-circle', text: t('matchAnalysis.riskFlags.marketDisagreement'), color: COLORS.warning });
  }

  if (activeFlags.length === 0) return null;

  return (
    <View style={riskFlagStyles.container}>
      {activeFlags.map((flag, index) => (
        <View key={index} style={[riskFlagStyles.badge, { borderColor: flag.color }]}>
          <Ionicons name={flag.icon} size={12} color={flag.color} />
          <Text style={[riskFlagStyles.badgeText, { color: flag.color }]}>{flag.text}</Text>
        </View>
      ))}
    </View>
  );
};

const riskFlagStyles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  badgeText: { fontSize: 11, fontWeight: '600' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPECTED GOALS COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════
const ExpectedGoalsComparison = ({ homeXG, awayXG, homeName, awayName }) => {
  const total = (homeXG || 0) + (awayXG || 0);
  const homePercent = total > 0 ? ((homeXG || 0) / total) * 100 : 50;

  return (
    <View style={xgStyles.container}>
      <View style={xgStyles.teamRow}>
        <Text style={[xgStyles.teamName, { color: COLORS.homeColor }]}>{homeName}</Text>
        <Text style={[xgStyles.xgValue, { color: COLORS.homeColor }]}>{(homeXG || 0).toFixed(1)}</Text>
      </View>
      <View style={xgStyles.barContainer}>
        <View style={[xgStyles.barHome, { width: `${homePercent}%` }]} />
        <View style={[xgStyles.barAway, { width: `${100 - homePercent}%` }]} />
      </View>
      <View style={xgStyles.teamRow}>
        <Text style={[xgStyles.teamName, { color: COLORS.awayColor }]}>{awayName}</Text>
        <Text style={[xgStyles.xgValue, { color: COLORS.awayColor }]}>{(awayXG || 0).toFixed(1)}</Text>
      </View>
    </View>
  );
};

const xgStyles = StyleSheet.create({
  container: { marginVertical: 8 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  teamName: { fontSize: 12, fontWeight: '600' },
  xgValue: { fontSize: 18, fontWeight: '800' },
  barContainer: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  barHome: { backgroundColor: COLORS.homeColor, height: '100%' },
  barAway: { backgroundColor: COLORS.awayColor, height: '100%' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAT ROW
// ═══════════════════════════════════════════════════════════════════════════════
const StatRow = ({ label, homeValue, awayValue, isPercentage = false }) => {
  const homeNum = typeof homeValue === 'string' ? parseInt(homeValue) || 0 : homeValue;
  const awayNum = typeof awayValue === 'string' ? parseInt(awayValue) || 0 : awayValue;
  const total = homeNum + awayNum || 1;
  const homeWidth = (homeNum / total) * 100;
  const awayWidth = (awayNum / total) * 100;

  return (
    <View style={styles.statRow}>
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{homeValue}{isPercentage ? '%' : ''}</Text>
      </View>
      <View style={styles.statBarContainer}>
        <View style={styles.statBarWrapper}>
          <View style={[styles.statBarHome, { width: `${homeWidth}%` }]} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statBarWrapper}>
          <View style={[styles.statBarAway, { width: `${awayWidth}%` }]} />
        </View>
      </View>
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{awayValue}{isPercentage ? '%' : ''}</Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const MatchAnalysisScreen = ({ route, navigation }) => {
  // Get match from route params
  const match = route?.params?.match;

  // Safe area insets for proper header positioning
  const insets = useSafeAreaInsets();

  // PRO subscription check - hooks must be called unconditionally
  const { isPro } = useSubscription();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // State
  const [activeTab, setActiveTab] = useState('tahminler');
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [h2hData, setH2hData] = useState(null);
  const [stats, setStats] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [cachedData, setCachedData] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(null);
  const [showRateLimitPaywall, setShowRateLimitPaywall] = useState(false);
  const [showRateLimitInfo, setShowRateLimitInfo] = useState(false);

  // Parse match data
  const isApiData = typeof match.home === 'object';
  const homeName = isApiData ? match.home?.name : match.home;
  const awayName = isApiData ? match.away?.name : match.away;
  const homeLogo = isApiData ? match.home?.logo : null;
  const awayLogo = isApiData ? match.away?.logo : null;
  const leagueName = isApiData ? match.league?.name : match.league;
  const leagueLogo = isApiData ? match.league?.logo : null;
  const homeTeamId = isApiData ? match.home?.id : null;
  const awayTeamId = isApiData ? match.away?.id : null;
  const fixtureId = match.id;

  // Entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Fetch match data and check cache
  const fetchMatchDetails = async () => {
    try {
      setLoading(true);

      // Check cache first
      const cached = await cacheService.getAnalysis(fixtureId);
      if (cached) {
        setAiAnalysis(cached);
        setCachedData(true);
      }

      // Fetch prediction
      try {
        const predData = await footballApi.getPredictions(fixtureId);
        if (predData && predData.length > 0) {
          const formatted = footballApi.formatPrediction(predData[0]);
          setPrediction(formatted);
        }
      } catch (e) {
        // Silent fail
      }

      // Fetch H2H
      if (homeTeamId && awayTeamId) {
        try {
          const h2h = await footballApi.getHeadToHead(homeTeamId, awayTeamId, 10);
          if (h2h && h2h.length > 0) {
            let homeWins = 0, draws = 0, awayWins = 0;
            let totalHomeGoals = 0, totalAwayGoals = 0;

            const recentMatches = h2h.map(fixture => {
              const f = footballApi.formatFixture(fixture);
              const isCurrentHomeTeam = f.home.id === homeTeamId;
              const hScore = f.home.score || 0;
              const aScore = f.away.score || 0;

              totalHomeGoals += isCurrentHomeTeam ? hScore : aScore;
              totalAwayGoals += isCurrentHomeTeam ? aScore : hScore;

              if (hScore > aScore) {
                isCurrentHomeTeam ? homeWins++ : awayWins++;
              } else if (hScore < aScore) {
                isCurrentHomeTeam ? awayWins++ : homeWins++;
              } else {
                draws++;
              }

              return {
                date: f.date?.split('T')[0] || '',
                homeScore: hScore,
                awayScore: aScore,
                homeName: f.home.name,
                awayName: f.away.name,
              };
            });

            setH2hData({
              total: h2h.length,
              homeWins,
              draws,
              awayWins,
              totalHomeGoals,
              totalAwayGoals,
              avgGoals: ((totalHomeGoals + totalAwayGoals) / h2h.length).toFixed(1),
              recentMatches,
            });
          }
        } catch (e) {
          // Silent fail
        }
      }

      // Fetch match stats
      try {
        const statsData = await footballApi.getFixtureStats(fixtureId);
        if (statsData && statsData.length >= 2) {
          const homeStats = statsData.find(s => s.team.id === homeTeamId) || statsData[0];
          const awayStats = statsData.find(s => s.team.id === awayTeamId) || statsData[1];

          const getStat = (team, name) => {
            const stat = team.statistics?.find(s => s.type === name);
            return stat ? (typeof stat.value === 'string' ? parseInt(stat.value) || 0 : stat.value || 0) : 0;
          };

          setStats({
            possession: { home: getStat(homeStats, 'Ball Possession'), away: getStat(awayStats, 'Ball Possession') },
            shots: { home: getStat(homeStats, 'Total Shots'), away: getStat(awayStats, 'Total Shots') },
            shotsOnTarget: { home: getStat(homeStats, 'Shots on Goal'), away: getStat(awayStats, 'Shots on Goal') },
            corners: { home: getStat(homeStats, 'Corner Kicks'), away: getStat(awayStats, 'Corner Kicks') },
            fouls: { home: getStat(homeStats, 'Fouls'), away: getStat(awayStats, 'Fouls') },
          });
        }
      } catch (e) {
        // Silent fail
      }

    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [fixtureId]);

  // Auto-start analysis when match details are loaded
  const hasAnalysis = aiAnalysis !== null;
  useEffect(() => {
    // Only auto-analyze if we don't have cached data and not already loading
    if (!loading && !hasAnalysis && !aiLoading && !cachedData) {
      // Small delay to ensure prediction data is available
      const timer = setTimeout(() => {
        fetchAiAnalysis();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, hasAnalysis, cachedData, aiLoading]);

  // Analysis handler - Edge Function handles Supabase caching with language support
  const fetchAiAnalysis = async () => {
    if (aiLoading) return;

    // If already have cached data in memory, don't fetch again
    if (cachedData && aiAnalysis) {
      return;
    }

    setAiLoading(true);
    try {
      // Call Edge Function - it handles:
      // 1. Rate limiting (IP-based, 3 matches/day)
      // 2. Supabase cache check (with language parameter)
      // 3. Claude API call if not cached
      // 4. Saving to Supabase cache (with language)
      const analysisData = {
        home: match.home,
        away: match.away,
        league: match.league,
        date: match.date,
        time: match.time,
        fixtureId: fixtureId,
        homeForm: prediction?.homeForm,
        awayForm: prediction?.awayForm,
        h2h: h2hData,
        prediction: prediction,
        homeTeamStats: prediction?.homeTeamStats,
        awayTeamStats: prediction?.awayTeamStats,
      };

      const result = await claudeAi.analyzeMatch(analysisData);
      if (result) {
        // Check for rate limit error
        if (result.rateLimitExceeded) {
          setRateLimitError(result.rateLimitMessage);
          setShowRateLimitInfo(true); // Önce info modal göster, paywall sonra
          setAiAnalysis(result); // Still set the default analysis
        } else {
          setRateLimitError(null);
          setAiAnalysis(result);
          setCachedData(true);

          // Save to local cache for offline access only
          await cacheService.saveAnalysis(fixtureId, result, match.date, match.status || 'NS');
        }
      }
    } catch (error) {
      // Silent fail - don't log to console
    } finally {
      setAiLoading(false);
    }
  };

  // Tab change handler
  const handleTabChange = (tabId, index) => {
    setActiveTab(tabId);
    Animated.spring(tabIndicatorAnim, {
      toValue: index * (SCREEN_WIDTH / MAIN_TABS.length),
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // Analysis display data with defaults
  const analysis = aiAnalysis || claudeAi.getDefaultAnalysis();

  // ─────────────────────────────────────────────────────────────────────────────
  // PRO CHECK - Tüm hooks'lardan sonra
  // ─────────────────────────────────────────────────────────────────────────────
  // TODO: Test sonrası geri aç
  // if (!isPro) {
  //   return (
  //     <PaywallScreen
  //       visible={true}
  //       onClose={() => navigation.goBack()}
  //     />
  //   );
  // }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HEADER
  // ─────────────────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <ImageBackground source={STADIUM_BG} style={[styles.header, { paddingTop: insets.top }]} resizeMode="cover">
      <View style={styles.headerOverlay} />
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.leagueContainer}>
          {leagueLogo && <Image source={{ uri: leagueLogo }} style={styles.leagueLogo} resizeMode="contain" />}
          <Text style={styles.leagueName} numberOfLines={1}>{leagueName || t('home.unknownLeague')}</Text>
        </View>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="star-outline" size={22} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>
      <View style={styles.teamsContainer}>
        <View style={styles.teamSection}>
          <View style={styles.teamLogoWrapper}>
            {homeLogo ? (
              <Image source={{ uri: homeLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <Ionicons name="football" size={32} color={COLORS.gray600} />
            )}
          </View>
          <Text style={styles.teamName} numberOfLines={2}>{homeName || t('home.homeTeam')}</Text>
        </View>
        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.matchTime}>{match.time || '00:00'}</Text>
        </View>
        <View style={styles.teamSection}>
          <View style={styles.teamLogoWrapper}>
            {awayLogo ? (
              <Image source={{ uri: awayLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <Ionicons name="football" size={32} color={COLORS.gray600} />
            )}
          </View>
          <Text style={styles.teamName} numberOfLines={2}>{awayName || t('home.awayTeam')}</Text>
        </View>
      </View>
    </ImageBackground>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER TABS
  // ─────────────────────────────────────────────────────────────────────────────
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mainTabsScroll}
      >
        {getMainTabs().map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.scrollableTab, activeTab === tab.id && styles.scrollableTabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.mainTabText, activeTab === tab.id && styles.mainTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER TAHMINLER TAB
  // ─────────────────────────────────────────────────────────────────────────────

  // Akıllı Tahmin Kartı
  const renderAkilliTahminCard = () => (
    <View style={styles.aiCard}>
      <View style={styles.aiCardHeader}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="sparkles" size={18} color={COLORS.accent} />
          <Text style={styles.aiCardTitle}>{t('matchAnalysis.smartPrediction')}</Text>
        </View>
        {cachedData && hasAnalysis ? (
          <View style={styles.analysisReadyBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.analysisReadyLabel}>{t('matchAnalysis.ready')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.aiAnalyzeButton}
            onPress={fetchAiAnalysis}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <>
                <Ionicons name="analytics" size={16} color={COLORS.accent} />
                <Text style={styles.aiAnalyzeButtonText}>{t('matchAnalysis.analyze')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Rate Limit Info Modal - Önce bu gösterilir */}
      <Modal visible={showRateLimitInfo} transparent animationType="none">
        <View style={styles.rateLimitModalOverlay}>
          <View style={styles.rateLimitModalContent}>
            <View style={styles.rateLimitIconCircle}>
              <Ionicons name="lock-closed" size={32} color="#FF6B35" />
            </View>
            <Text style={styles.rateLimitModalTitle}>
              {t('matchAnalysis.rateLimitModal.title')}
            </Text>
            <Text style={styles.rateLimitModalMessage}>
              {t('matchAnalysis.rateLimitModal.message')}
            </Text>
            <TouchableOpacity
              style={styles.rateLimitModalButton}
              onPress={() => {
                setShowRateLimitInfo(false);
                setShowRateLimitPaywall(true);
              }}
            >
              <Text style={styles.rateLimitModalButtonText}>
                {t('matchAnalysis.rateLimitModal.button')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rate Limit Paywall - Info modal kapandıktan sonra açılır */}
      {showRateLimitPaywall && (
        <PaywallScreen
          visible={showRateLimitPaywall}
          onClose={() => {
            setShowRateLimitPaywall(false);
            navigation.goBack();
          }}
        />
      )}

      {hasAnalysis && (
        <View style={styles.probabilitySection}>
          <View style={styles.probBarContainer}>
            <View style={[styles.probBarSegment, { width: `${analysis.homeWinProb}%`, backgroundColor: COLORS.homeColor }]}>
              {analysis.homeWinProb >= 15 && <Text style={styles.probBarText}>{analysis.homeWinProb}%</Text>}
            </View>
            <View style={[styles.probBarSegment, { width: `${analysis.drawProb}%`, backgroundColor: COLORS.warning }]}>
              {analysis.drawProb >= 15 && <Text style={styles.probBarText}>{analysis.drawProb}%</Text>}
            </View>
            <View style={[styles.probBarSegment, { width: `${analysis.awayWinProb}%`, backgroundColor: COLORS.awayColor }]}>
              {analysis.awayWinProb >= 15 && <Text style={styles.probBarText}>{analysis.awayWinProb}%</Text>}
            </View>
          </View>
          <View style={styles.probLegend}>
            <View style={styles.probLegendItem}>
              <View style={[styles.probLegendDot, { backgroundColor: COLORS.homeColor }]} />
              <Text style={styles.probLegendText}>{homeName}</Text>
              <Text style={[styles.probLegendValue, { color: COLORS.homeColor }]}>{analysis.homeWinProb}%</Text>
            </View>
            <View style={styles.probLegendItem}>
              <View style={[styles.probLegendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.probLegendText}>{t('matchAnalysis.drawResult')}</Text>
              <Text style={[styles.probLegendValue, { color: COLORS.warning }]}>{analysis.drawProb}%</Text>
            </View>
            <View style={styles.probLegendItem}>
              <View style={[styles.probLegendDot, { backgroundColor: COLORS.awayColor }]} />
              <Text style={styles.probLegendText}>{awayName}</Text>
              <Text style={[styles.probLegendValue, { color: COLORS.awayColor }]}>{analysis.awayWinProb}%</Text>
            </View>
          </View>
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>{t('matchAnalysis.analysisConfidence')}</Text>
            <View style={styles.confidenceStars}>
              {[1, 2, 3, 4, 5].map(star => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(analysis.confidence / 2) ? 'star' : 'star-outline'}
                  size={14}
                  color={COLORS.warning}
                />
              ))}
            </View>
            <Text style={styles.confidenceValue}>{analysis.confidence}/10</Text>
          </View>
        </View>
      )}

      {hasAnalysis && (
        <>
          <View style={styles.riskWinnerRow}>
            <View style={styles.riskBadgeBox}>
              <Text style={styles.riskBadgeLabel}>{t('matchAnalysis.riskLabel')}</Text>
              <View style={[styles.riskBadgeInner, {
                borderColor: (analysis.bankoScore || analysis.confidence * 10) >= 70 ? COLORS.success :
                             (analysis.bankoScore || analysis.confidence * 10) >= 50 ? COLORS.warning : COLORS.danger
              }]}>
                <Text style={[styles.riskBadgeText, {
                  color: (analysis.bankoScore || analysis.confidence * 10) >= 70 ? COLORS.success :
                         (analysis.bankoScore || analysis.confidence * 10) >= 50 ? COLORS.warning : COLORS.danger
                }]}>
                  {(analysis.bankoScore || analysis.confidence * 10) >= 70 ? t('matchAnalysis.risk.low') :
                   (analysis.bankoScore || analysis.confidence * 10) >= 50 ? t('matchAnalysis.risk.medium') : t('matchAnalysis.risk.high')}
                </Text>
                <Text style={[styles.riskBadgePercent, {
                  color: (analysis.bankoScore || analysis.confidence * 10) >= 70 ? COLORS.success :
                         (analysis.bankoScore || analysis.confidence * 10) >= 50 ? COLORS.warning : COLORS.danger
                }]}>
                  %{analysis.bankoScore || Math.round(analysis.confidence * 10)}
                </Text>
              </View>
            </View>
            <View style={styles.winnerBox}>
              <Text style={styles.winnerBoxLabel}>{t('matchAnalysis.predictionLabel')}</Text>
              {analysis.winner === 'ev' || analysis.winner === 'deplasman' ? (
                <View style={styles.winnerBoxContent}>
                  {(analysis.winner === 'ev' ? homeLogo : awayLogo) && (
                    <Image
                      source={{ uri: analysis.winner === 'ev' ? homeLogo : awayLogo }}
                      style={styles.winnerBoxLogo}
                      resizeMode="contain"
                    />
                  )}
                  <View style={styles.winnerBoxInfo}>
                    <Text style={styles.winnerBoxTeam} numberOfLines={1}>
                      {analysis.winner === 'ev' ? homeName : awayName}
                    </Text>
                    <View style={styles.winnerBoxBadge}>
                      <Text style={styles.winnerBoxBadgeText}>
                        {analysis.winner === 'ev' ? 'MS 1' : 'MS 2'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.winnerBoxContent}>
                  <Ionicons name="swap-horizontal" size={28} color={COLORS.warning} />
                  <View style={styles.winnerBoxInfo}>
                    <Text style={[styles.winnerBoxTeam, { color: COLORS.warning }]}>Beraberlik</Text>
                    <View style={[styles.winnerBoxBadge, { backgroundColor: 'rgba(255,149,0,0.2)', borderColor: COLORS.warning }]}>
                      <Text style={[styles.winnerBoxBadgeText, { color: COLORS.warning }]}>MS X</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
          {analysis.advice && (
            <View style={styles.adviceSection}>
              <View style={styles.adviceHeader}>
                <Ionicons name="bulb" size={18} color={COLORS.warning} />
                <Text style={styles.adviceTitle}>{t('matchAnalysis.sections.expertAdvice')}</Text>
              </View>
              <Text style={styles.adviceText}>{analysis.advice}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );

  // Alt Tab İçerikleri
  const renderGolTahminleri = () => (
    <>
      {hasAnalysis && (
        <View style={styles.sectionCard}>
          <ExpectedGoalsComparison
            homeXG={analysis.expectedHomeGoals}
            awayXG={analysis.expectedAwayGoals}
            homeName={homeName}
            awayName={awayName}
          />
          <View style={styles.circularGrid}>
            <CircularProgress value={analysis.expectedGoals} label={t('matchAnalysis.labels.totalXG')} color={COLORS.accent} isNumber />
            <CircularProgress value={analysis.bttsProb} label={t('matchAnalysis.labels.btts')} color={COLORS.success} />
            <CircularProgress value={analysis.over25Prob} label={t('matchAnalysis.labels.over25')} color={COLORS.homeColor} />
            <CircularProgress value={analysis.over15Prob || 70} label={t('matchAnalysis.labels.over15')} color={COLORS.warning} />
          </View>
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>{t('matchAnalysis.sections.likelyScore')}</Text>
            <View style={styles.mainScoreBox}>
              <View style={styles.mainScoreInner}>
                <Text style={styles.mainScoreValue}>{analysis.mostLikelyScore || '1-1'}</Text>
              </View>
              <View style={styles.mainScoreProbBadge}>
                <Text style={styles.mainScoreProbText}>%{analysis.scoreProb || 15}</Text>
              </View>
            </View>
            {analysis.alternativeScores && analysis.alternativeScores.length > 0 && (
              <View style={styles.altScoresContainer}>
                <Text style={styles.altScoresTitle}>{t('matchAnalysis.sections.alternativeScores')}</Text>
                <View style={styles.altScoresRow}>
                  {analysis.alternativeScores.slice(0, 4).map((s, index) => {
                    const score = typeof s === 'object' ? s.score : s;
                    const prob = typeof s === 'object' ? s.prob : null;
                    return (
                      <View key={index} style={styles.altScoreBox}>
                        <Text style={styles.altScoreValue}>{score}</Text>
                        {prob && <Text style={styles.altScoreProb}>%{prob}</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      )}
      {analysis.recommendedBets && analysis.recommendedBets.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={18} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>{t('matchAnalysis.sections.recommendations')}</Text>
          </View>
          <View style={styles.betCardsRow}>
            {analysis.recommendedBets.slice(0, 3).map((bet, index) => (
              <BetCard
                key={index}
                type={bet.type}
                confidence={bet.confidence}
                reasoning={bet.reasoning}
                risk={bet.risk}
                isHot={index === 0 && bet.confidence >= 70}
              />
            ))}
          </View>
        </View>
      )}
    </>
  );

  const renderGolDagilimi = () => (
    <>
      {analysis.goalDistribution && (
        <View style={styles.sectionCard}>
          <GoalDistributionChart
            distribution={analysis.goalDistribution.home}
            teamColor={COLORS.homeColor}
            teamName={homeName}
          />
          <GoalDistributionChart
            distribution={analysis.goalDistribution.away}
            teamColor={COLORS.awayColor}
            teamName={awayName}
          />
        </View>
      )}
      {!analysis.goalDistribution && (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={40} color={COLORS.gray500} />
          <Text style={styles.noDataText}>{t('matchAnalysis.errors.noGoalDistribution')}</Text>
        </View>
      )}
    </>
  );

  const renderKgSenaryolari = () => (
    <>
      {analysis.bttsDistribution && (
        <View style={styles.sectionCard}>
          <BTTSDistribution distribution={analysis.bttsDistribution} />
        </View>
      )}
      {!analysis.bttsDistribution && (
        <View style={styles.noDataContainer}>
          <Ionicons name="git-compare-outline" size={40} color={COLORS.gray500} />
          <Text style={styles.noDataText}>{t('matchAnalysis.errors.noBTTSScenarios')}</Text>
        </View>
      )}
    </>
  );

  const renderIlkYari = () => (
    <>
      {hasAnalysis && (
        <View style={styles.sectionCard}>
          <View style={styles.htGrid}>
            <View style={styles.htItem}>
              <Text style={[styles.htPercent, { color: COLORS.homeColor }]}>{analysis.htHomeWinProb || 30}%</Text>
              <View style={styles.htBar}>
                <View style={[styles.htBarFill, { width: `${analysis.htHomeWinProb || 30}%`, backgroundColor: COLORS.homeColor }]} />
              </View>
              <Text style={styles.htLabel}>{t('matchAnalysis.firstHalf.homeAhead')}</Text>
            </View>
            <View style={styles.htItem}>
              <Text style={[styles.htPercent, { color: COLORS.warning }]}>{analysis.htDrawProb || 45}%</Text>
              <View style={styles.htBar}>
                <View style={[styles.htBarFill, { width: `${analysis.htDrawProb || 45}%`, backgroundColor: COLORS.warning }]} />
              </View>
              <Text style={styles.htLabel}>{t('matchAnalysis.firstHalf.draw')}</Text>
            </View>
            <View style={styles.htItem}>
              <Text style={[styles.htPercent, { color: COLORS.awayColor }]}>{analysis.htAwayWinProb || 25}%</Text>
              <View style={styles.htBar}>
                <View style={[styles.htBarFill, { width: `${analysis.htAwayWinProb || 25}%`, backgroundColor: COLORS.awayColor }]} />
              </View>
              <Text style={styles.htLabel}>{t('matchAnalysis.firstHalf.awayAhead')}</Text>
            </View>
          </View>
          <View style={styles.htExtraRow}>
            <Text style={styles.htExtraLabel}>{t('matchAnalysis.firstHalf.over05')}</Text>
            <Text style={styles.htExtraValue}>%{analysis.htOver05Prob || 55}</Text>
          </View>
          <View style={styles.htExtraRow}>
            <Text style={styles.htExtraLabel}>{t('matchAnalysis.firstHalf.over15')}</Text>
            <Text style={styles.htExtraValue}>%{analysis.htOver15Prob || 25}</Text>
          </View>
        </View>
      )}
    </>
  );

  const renderRiskAnalizi = () => (
    <>
      {hasAnalysis && (
        <View style={styles.sectionCard}>
          <VolatilityGauge volatility={analysis.volatility} riskLevel={analysis.riskLevel} />
          <RiskFlagBadge flags={analysis.riskFlags} />
        </View>
      )}
    </>
  );

  const renderFaktorAnalizi = () => (
    <>
      {analysis.factors && analysis.factors.length > 0 && (
        <View style={styles.sectionCard}>
          {analysis.factors.map((factor, index) => (
            <FactorBar
              key={index}
              category={factor.category}
              text={factor.text}
              impact={factor.impact}
              weight={factor.weight}
              color={COLORS[`${factor.category}Bar`] || COLORS.accent}
            />
          ))}
        </View>
      )}
      {hasAnalysis && (analysis.homeTeamAnalysis?.strengths?.length > 0 || analysis.awayTeamAnalysis?.strengths?.length > 0) && (
        <AccordionSection title={t('matchAnalysis.sections.teamAnalysis')} icon="shield">
          <View style={styles.teamAnalysisSection}>
            <View style={styles.teamAnalysisBlock}>
              <Text style={styles.teamAnalysisTitle}>{homeName}</Text>
              {analysis.homeTeamAnalysis?.tacticalSummary && (
                <Text style={styles.tacticalText}>📋 {analysis.homeTeamAnalysis.tacticalSummary}</Text>
              )}
              {analysis.homeTeamAnalysis?.strengths?.map((s, i) => (
                <Text key={i} style={styles.strengthText}>✓ {s}</Text>
              ))}
              {analysis.homeTeamAnalysis?.weaknesses?.map((w, i) => (
                <Text key={i} style={styles.weaknessText}>✗ {w}</Text>
              ))}
              {analysis.homeTeamAnalysis?.keyPlayer && (
                <Text style={styles.keyPlayerText}>⭐ {t('matchAnalysis.keyPlayer')} {analysis.homeTeamAnalysis.keyPlayer}</Text>
              )}
            </View>
            <View style={styles.teamAnalysisDivider} />
            <View style={styles.teamAnalysisBlock}>
              <Text style={styles.teamAnalysisTitle}>{awayName}</Text>
              {analysis.awayTeamAnalysis?.tacticalSummary && (
                <Text style={styles.tacticalText}>📋 {analysis.awayTeamAnalysis.tacticalSummary}</Text>
              )}
              {analysis.awayTeamAnalysis?.strengths?.map((s, i) => (
                <Text key={i} style={styles.strengthText}>✓ {s}</Text>
              ))}
              {analysis.awayTeamAnalysis?.weaknesses?.map((w, i) => (
                <Text key={i} style={styles.weaknessText}>✗ {w}</Text>
              ))}
              {analysis.awayTeamAnalysis?.keyPlayer && (
                <Text style={styles.keyPlayerText}>⭐ {t('matchAnalysis.keyPlayer')} {analysis.awayTeamAnalysis.keyPlayer}</Text>
              )}
            </View>
          </View>
        </AccordionSection>
      )}
    </>
  );

  const renderFormDurumu = () => (
    <>
      {(prediction?.homeForm || prediction?.awayForm) && (
        <View style={styles.sectionCard}>
          <View style={styles.formComparison}>
            <View style={styles.formTeam}>
              <Text style={styles.formTeamName} numberOfLines={1}>{homeName}</Text>
              <FormDots form={prediction?.homeForm || analysis.homeTeamAnalysis?.form || 'WWDLW'} />
            </View>
            <View style={styles.formTeam}>
              <Text style={styles.formTeamName} numberOfLines={1}>{awayName}</Text>
              <FormDots form={prediction?.awayForm || analysis.awayTeamAnalysis?.form || 'DLWWL'} />
            </View>
          </View>
        </View>
      )}
      {analysis.trendSummary && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pulse" size={18} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>{t('matchAnalysis.sections.trendAnalysis')}</Text>
          </View>
          <TrendIndicator trend={analysis.trendSummary.homeFormTrend} label={`${homeName} Form`} color={COLORS.homeColor} />
          <TrendIndicator trend={analysis.trendSummary.awayFormTrend} label={`${awayName} Form`} color={COLORS.awayColor} />
          <TrendIndicator trend={analysis.trendSummary.homeXGTrend} label={`${homeName} xG`} color={COLORS.homeColor} />
          <TrendIndicator trend={analysis.trendSummary.awayXGTrend} label={`${awayName} xG`} color={COLORS.awayColor} />
          {analysis.trendSummary.tacticalMatchupSummary && (
            <View style={styles.tacticalSummaryBox}>
              <Ionicons name="football" size={14} color={COLORS.accent} />
              <Text style={styles.tacticalSummaryText}>{analysis.trendSummary.tacticalMatchupSummary}</Text>
            </View>
          )}
        </View>
      )}
      <AccordionSection title={t('matchAnalysis.sections.h2hDetails')} icon="swap-horizontal">
        {h2hData ? (
          <View>
            <View style={styles.h2hSummary}>
              <Text style={styles.h2hSummaryText}>
                {homeName}: {h2hData.homeWins}{t('matchAnalysis.winsAbbr')} | {t('matchAnalysis.h2h.draws')} {h2hData.draws} | {awayName}: {h2hData.awayWins}{t('matchAnalysis.winsAbbr')}
              </Text>
              <Text style={styles.h2hSummaryText}>{t('matchAnalysis.h2h.avgGoals')} {h2hData.avgGoals}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>{t('matchAnalysis.errors.noH2HData')}</Text>
        )}
      </AccordionSection>
    </>
  );

  // Ana Tahminler Tab - TÜM bölümleri tek scroll'da göster
  const renderTahminlerTab = () => (
    <>
      {aiLoading ? (
        <View style={styles.fullTabLoading}>
          <AnalysisLoadingAnimation fullWidth />
        </View>
      ) : (
        <>
          {renderAkilliTahminCard()}
          {renderGolTahminleri()}
          {renderGolDagilimi()}
          {renderKgSenaryolari()}
          {renderIlkYari()}
          {renderRiskAnalizi()}
          {renderFaktorAnalizi()}
          {renderFormDurumu()}
        </>
      )}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER OTHER TABS
  // ─────────────────────────────────────────────────────────────────────────────
  const renderIstatistiklerTab = () => (
    <View style={styles.sectionCard}>
      <View style={styles.statsHeader}>
        <Text style={[styles.statsTeamLabel, { color: COLORS.homeColor }]}>{t('matchAnalysis.stats.home')}</Text>
        <Text style={styles.statsCenterLabel}>{t('matchAnalysis.stats.comparison')}</Text>
        <Text style={[styles.statsTeamLabel, { color: COLORS.awayColor }]}>{t('matchAnalysis.stats.away')}</Text>
      </View>
      <View style={styles.statsTable}>
        <StatRow label={t('matchAnalysis.stats.wins')} homeValue={h2hData?.homeWins || 0} awayValue={h2hData?.awayWins || 0} />
        <StatRow label={t('matchAnalysis.stats.draws')} homeValue={h2hData?.draws || 0} awayValue={h2hData?.draws || 0} />
        {stats && (
          <>
            <StatRow label={t('matchAnalysis.stats.possession')} homeValue={stats.possession?.home || 50} awayValue={stats.possession?.away || 50} isPercentage />
            <StatRow label={t('matchAnalysis.stats.totalShots')} homeValue={stats.shots?.home || 0} awayValue={stats.shots?.away || 0} />
            <StatRow label={t('matchAnalysis.stats.corners')} homeValue={stats.corners?.home || 0} awayValue={stats.corners?.away || 0} />
          </>
        )}
      </View>
    </View>
  );

  const renderKarsilikliTab = () => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="swap-horizontal" size={18} color={COLORS.accent} />
        <Text style={styles.sectionTitle}>{t('matchAnalysis.recentMatches')}</Text>
        <Text style={styles.h2hCount}>{h2hData?.total || 0} {t('matchAnalysis.matches')}</Text>
      </View>
      {h2hData?.recentMatches?.length > 0 ? (
        h2hData.recentMatches.slice(0, 5).map((m, index) => (
          <View key={index} style={styles.h2hMatch}>
            <Text style={styles.h2hDate}>{m.date}</Text>
            <View style={styles.h2hTeams}>
              <Text style={styles.h2hTeamName} numberOfLines={1}>{m.homeName}</Text>
              <View style={styles.h2hScoreBox}>
                <Text style={styles.h2hScore}>{m.homeScore} - {m.awayScore}</Text>
              </View>
              <Text style={styles.h2hTeamName} numberOfLines={1}>{m.awayName}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.gray500} />
          <Text style={styles.noDataText}>{t('matchAnalysis.noMatchData')}</Text>
        </View>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tahminler':
        return renderTahminlerTab();
      case 'golTahminleri':
        return renderGolTahminleri();
      case 'golDagilimi':
        return renderGolDagilimi();
      case 'kgSenaryolari':
        return renderKgSenaryolari();
      case 'ilkYari':
        return renderIlkYari();
      case 'riskAnalizi':
        return renderRiskAnalizi();
      case 'faktorAnalizi':
        return renderFaktorAnalizi();
      case 'formDurumu':
        return renderFormDurumu();
      case 'istatistikler':
        return renderIstatistiklerTab();
      case 'karsilikli':
        return renderKarsilikliTab();
      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return <AnalysisLoadingAnimation />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <Animated.View
        style={[styles.animatedContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {renderHeader()}
        {renderTabs()}
        <ScrollView
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {renderTabContent()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  animatedContainer: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray500, fontSize: 14 },

  // AI Loading States
  aiLoadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  analysisLoadingSection: { minHeight: 280, justifyContent: 'center', alignItems: 'center' },
  fullTabLoading: { flex: 1, width: '100%', minHeight: 400, justifyContent: 'center', alignItems: 'center' },
  aiLoadingText: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginTop: 16 },
  aiLoadingSubtext: { color: COLORS.gray500, fontSize: 12, marginTop: 6 },

  // Rate Limit Banner
  rateLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  rateLimitText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },

  // Header
  header: { paddingBottom: 20 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 20, 25, 0.75)' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  leagueContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  leagueLogo: { width: 24, height: 24, marginRight: 8 },
  leagueName: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  favoriteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Teams
  teamsContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20 },
  teamSection: { alignItems: 'center', width: '35%' },
  teamLogoWrapper: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  teamLogo: { width: 50, height: 50 },
  teamName: { color: COLORS.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  vsContainer: { alignItems: 'center', justifyContent: 'center', width: '30%' },
  vsText: { color: COLORS.gray400, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  matchTime: { color: COLORS.accent, fontSize: 16, fontWeight: '700', marginTop: 4 },

  // Tabs (Scrollable)
  tabsContainer: { backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mainTabsScroll: { paddingHorizontal: 8, gap: 4 },
  scrollableTab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  scrollableTabActive: { borderBottomColor: COLORS.accent },
  mainTabText: { color: COLORS.gray500, fontSize: 13, fontWeight: '600' },
  mainTabTextActive: { color: COLORS.accent },

  // Content
  contentScroll: { flex: 1 },
  contentContainer: { padding: 16, gap: 16 },

  // AI Card
  aiCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  aiCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiCardTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  cachedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,217,119,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  cachedBadgeText: { color: COLORS.success, fontSize: 10, fontWeight: '600' },
  aiAnalyzeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accentDim, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent },
  aiAnalyzeButtonText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  analysisReadyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,217,119,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  analysisReadyLabel: { color: COLORS.success, fontSize: 12, fontWeight: '700' },

  // Probability
  probabilitySection: { marginBottom: 16 },
  probBarContainer: { flexDirection: 'row', height: 32, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  probBarSegment: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  probBarText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  probLegend: { gap: 8 },
  probLegendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 },
  probLegendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  probLegendText: { color: COLORS.gray400, fontSize: 13, flex: 1 },
  probLegendValue: { fontSize: 16, fontWeight: '800' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  confidenceLabel: { color: COLORS.gray500, fontSize: 12, marginRight: 10 },
  confidenceStars: { flexDirection: 'row', gap: 2 },
  confidenceValue: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginLeft: 10 },

  // Risk & Winner Row
  riskWinnerRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  riskBadgeBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  riskBadgeLabel: { color: COLORS.gray500, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  riskBadgeInner: { alignItems: 'center', borderWidth: 2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 70 },
  riskBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
  riskBadgePercent: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  winnerBox: {
    flex: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
  },
  winnerBoxLabel: { color: COLORS.gray500, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  winnerBoxContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  winnerBoxLogo: { width: 36, height: 36 },
  winnerBoxInfo: { alignItems: 'flex-start' },
  winnerBoxTeam: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  winnerBoxBadge: { backgroundColor: COLORS.accentDim, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: COLORS.accent },
  winnerBoxBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '800' },

  // Advice
  adviceSection: { backgroundColor: 'rgba(255,149,0,0.08)', padding: 14, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,149,0,0.2)' },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  adviceTitle: { color: COLORS.warning, fontSize: 13, fontWeight: '700' },
  adviceText: { color: COLORS.gray100, fontSize: 13, lineHeight: 20 },

  // Section Card
  sectionCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', flex: 1 },

  // Circular Grid
  circularGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },

  // Score Section - Enhanced
  scoreSection: { alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  scoreLabel: { color: COLORS.gray500, fontSize: 12, marginBottom: 12, letterSpacing: 0.5 },
  mainScoreBox: { alignItems: 'center', marginBottom: 16 },
  mainScoreInner: {
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  mainScoreValue: { color: COLORS.white, fontSize: 36, fontWeight: '800', letterSpacing: 4 },
  mainScoreProbBadge: {
    marginTop: -10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainScoreProbText: { color: COLORS.bg, fontSize: 13, fontWeight: '800' },
  altScoresContainer: { width: '100%', marginTop: 8 },
  altScoresTitle: { color: COLORS.gray500, fontSize: 11, textAlign: 'center', marginBottom: 10, letterSpacing: 0.5 },
  altScoresRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  altScoreBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 60,
  },
  altScoreValue: { color: COLORS.gray100, fontSize: 14, fontWeight: '700' },
  altScoreProb: { color: COLORS.gray500, fontSize: 10, marginTop: 2 },

  // HT Grid
  htGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  htItem: { flex: 1, alignItems: 'center' },
  htPercent: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  htBar: { height: 6, width: '100%', backgroundColor: COLORS.gray800, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  htBarFill: { height: '100%', borderRadius: 3 },
  htLabel: { color: COLORS.gray500, fontSize: 10, textAlign: 'center' },
  htExtraRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  htExtraLabel: { color: COLORS.gray500, fontSize: 12, marginRight: 8 },
  htExtraValue: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },

  // Form Comparison
  formComparison: { gap: 16 },
  formTeam: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTeamName: { color: COLORS.white, fontSize: 13, fontWeight: '600', flex: 1 },

  // Bet Cards
  betCardsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -3 },

  // Team Analysis
  teamAnalysisSection: {},
  teamAnalysisBlock: { marginBottom: 12 },
  teamAnalysisTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  teamAnalysisDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  strengthText: { color: COLORS.success, fontSize: 12, marginBottom: 4 },
  weaknessText: { color: COLORS.danger, fontSize: 12, marginBottom: 4 },
  tacticalText: { color: COLORS.gray400, fontSize: 12, marginBottom: 6, fontStyle: 'italic' },
  keyPlayerText: { color: COLORS.warning, fontSize: 12, marginTop: 6, fontWeight: '600' },

  // Tactical Summary Box
  tacticalSummaryBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.accentDim, padding: 12, borderRadius: 8, marginTop: 12 },
  tacticalSummaryText: { color: COLORS.accent, fontSize: 12, flex: 1, lineHeight: 18 },

  // H2H
  h2hCount: { color: COLORS.gray500, fontSize: 12 },
  h2hSummary: { marginBottom: 12 },
  h2hSummaryText: { color: COLORS.gray400, fontSize: 12, marginBottom: 4 },
  h2hMatch: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  h2hDate: { color: COLORS.gray500, fontSize: 11, marginBottom: 6 },
  h2hTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h2hTeamName: { color: COLORS.gray100, fontSize: 13, flex: 1 },
  h2hScoreBox: { backgroundColor: COLORS.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  h2hScore: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  // Stats
  statsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statsTeamLabel: { flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  statsCenterLabel: { flex: 2, color: COLORS.gray500, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  statsTable: { gap: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statValueContainer: { width: 40, alignItems: 'center' },
  statValue: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  statBarContainer: { flex: 1, alignItems: 'center' },
  statLabel: { color: COLORS.gray500, fontSize: 11, textAlign: 'center', marginVertical: 4 },
  statBarWrapper: { width: '100%', height: 4, backgroundColor: COLORS.bg, borderRadius: 2, overflow: 'hidden' },
  statBarHome: { height: '100%', backgroundColor: COLORS.homeColor, borderRadius: 2 },
  statBarAway: { height: '100%', backgroundColor: COLORS.awayColor, borderRadius: 2, marginLeft: 'auto' },

  // No Data
  noDataContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  noDataText: { color: COLORS.gray500, fontSize: 13, textAlign: 'center' },

  // Ozet
  ozetText: { color: COLORS.gray400, fontSize: 14, lineHeight: 20 },

  // Rate Limit Info Modal
  rateLimitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 1.0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateLimitModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  rateLimitIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateLimitModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  rateLimitModalMessage: {
    fontSize: 14,
    color: COLORS.gray400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  rateLimitModalButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  rateLimitModalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MatchAnalysisScreen;
