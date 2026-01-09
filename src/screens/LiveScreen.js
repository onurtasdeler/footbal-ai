import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import footballApi from '../services/footballApi';
import { useSmartPolling, useAppState, POLLING_INTERVALS } from '../services/pollingService';
import { COLORS } from '../theme/colors';
import { t, getLanguage, addLanguageListener } from '../i18n';
import { TAB_BAR_TOTAL_HEIGHT } from '../constants/navigation';

const LiveScreen = ({ navigation }) => {
  // Safe area insets for proper header positioning
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [liveMatches, setLiveMatches] = useState([]);
  const [sortedMatches, setSortedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchStats, setMatchStats] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // Dil değişikliği için state
  const [, setLanguageKey] = useState(getLanguage());

  // Dil değişikliği listener'ı
  useEffect(() => {
    const unsubscribe = addLanguageListener((newLang) => {
      setLanguageKey(newLang);
    });
    return unsubscribe;
  }, []);

  // Maçları dakikaya göre sırala (kritik maçlar üstte)
  const sortMatchesByMinute = (matches) => {
    return [...matches].sort((a, b) => {
      const getScore = (match) => {
        const min = match.minute || 0;
        const status = match.statusText || match.status;
        if (min >= 85) return 1000 + min;
        if (min >= 75) return 800 + min;
        if (status === 'HT') return 500;
        if (min >= 45) return 400 + min;
        return min;
      };
      return getScore(b) - getScore(a);
    });
  };

  // Hero maç seçimi (85+ dakika veya en kritik)
  const getHeroMatch = (matches) => {
    if (matches.length === 0) return null;
    const sorted = sortMatchesByMinute(matches);
    return sorted[0]?.minute >= 75 ? sorted[0] : null;
  };

  // Maç istatistiklerini çek
  const fetchMatchStats = async (fixtureId) => {
    if (matchStats[fixtureId]) return matchStats[fixtureId];
    try {
      const stats = await footballApi.getFixtureStats(fixtureId);
      if (stats && stats.length >= 2) {
        const homeStats = stats[0]?.statistics || [];
        const awayStats = stats[1]?.statistics || [];

        const getStat = (statsArray, type) => {
          const stat = statsArray.find(s => s.type === type);
          return stat ? parseInt(stat.value) || 0 : 0;
        };

        const getPossession = (statsArray) => {
          const stat = statsArray.find(s => s.type === 'Ball Possession');
          return stat ? parseInt(stat.value) || 50 : 50;
        };

        const newStats = {
          possession: { home: getPossession(homeStats), away: getPossession(awayStats) },
          shots: { home: getStat(homeStats, 'Total Shots'), away: getStat(awayStats, 'Total Shots') },
          shotsOnTarget: { home: getStat(homeStats, 'Shots on Goal'), away: getStat(awayStats, 'Shots on Goal') },
          corners: { home: getStat(homeStats, 'Corner Kicks'), away: getStat(awayStats, 'Corner Kicks') },
          fouls: { home: getStat(homeStats, 'Fouls'), away: getStat(awayStats, 'Fouls') },
          yellowCards: { home: getStat(homeStats, 'Yellow Cards'), away: getStat(awayStats, 'Yellow Cards') },
        };

        setMatchStats(prev => ({ ...prev, [fixtureId]: newStats }));
        return newStats;
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  };

  // Fetch live matches from API
  const fetchLiveMatches = async () => {
    try {
      const fixtures = await footballApi.getLiveFixtures();
      const formattedMatches = fixtures.map(fixture => {
        const formatted = footballApi.formatFixture(fixture);
        return {
          id: formatted.id,
          home: formatted.home,
          away: formatted.away,
          homeShort: formatted.home.short,
          awayShort: formatted.away.short,
          homeScore: formatted.home.score || 0,
          awayScore: formatted.away.score || 0,
          minute: formatted.minute || 0,
          league: formatted.league,
          leagueName: formatted.league.name,
          status: formatted.status,
          statusText: footballApi.getStatusText(formatted.status),
          events: [],
          isLive: formatted.isLive,
          rawData: fixture,
        };
      });

      setLiveMatches(formattedMatches);
      setSortedMatches(sortMatchesByMinute(formattedMatches));
      setLastUpdated(new Date());

      // Memory leak önleme: Artık canlı olmayan maçların istatistiklerini temizle
      const currentMatchIds = new Set(formattedMatches.map(m => m.id));
      setMatchStats(prev => {
        const filtered = {};
        for (const id of Object.keys(prev)) {
          if (currentMatchIds.has(parseInt(id))) {
            filtered[id] = prev[id];
          }
        }
        return filtered;
      });
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Akıllı polling - canlı maç listesi için
  useSmartPolling('live_matches_list', fetchLiveMatches, {
    enabled: true,
    baseInterval: POLLING_INTERVALS.LIVE_LIST,
    pauseInBackground: true,
    deps: [],
  });

  // App öne geldiğinde hemen güncelle
  useAppState(
    () => fetchLiveMatches(), // onForeground
    null // onBackground
  );

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLiveMatches();
  }, []);

  const isCriticalMatch = (minute) => minute >= 85;
  const isImportantMatch = (minute) => minute >= 75 && minute < 85;

  const heroMatch = getHeroMatch(sortedMatches);
  const regularMatches = heroMatch ? sortedMatches.filter(m => m.id !== heroMatch.id) : sortedMatches;

  // ═══════════════════════════════════════════════════════════════════════════════
  // HERO MATCH CARD COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════════
  const HeroMatchCard = ({ match }) => {
    const stats = matchStats[match.id];
    const critical = isCriticalMatch(match.minute);
    const possession = stats?.possession?.home || 50;

    return (
      <TouchableOpacity
        style={[premiumStyles.heroCard, critical && premiumStyles.heroCardCritical]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('LiveMatchDetail', { match })}
      >
        {/* Gradient Overlay */}
        <View style={[
          premiumStyles.heroGradient,
          { backgroundColor: critical ? COLORS.criticalGlow : COLORS.accentGlow }
        ]} />

        {/* Header */}
        <View style={premiumStyles.heroHeader}>
          <View style={premiumStyles.heroLeague}>
            {(match.league?.flag || match.league?.logo) && (
              <Image source={{ uri: match.league.flag || match.league.logo }} style={premiumStyles.heroLeagueLogo} />
            )}
            <Text style={premiumStyles.heroLeagueName} numberOfLines={1}>
              {match.league?.name}
            </Text>
          </View>
          <View style={[premiumStyles.heroLiveBadge, critical && premiumStyles.heroLiveBadgeCritical]}>
            <Animated.View style={[premiumStyles.heroPulseDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={[premiumStyles.heroMinuteText, critical && { color: COLORS.critical }]}>
              {match.statusText || `${match.minute}'`}
            </Text>
          </View>
        </View>

        {/* Score Section */}
        <View style={premiumStyles.heroScoreSection}>
          <View style={premiumStyles.heroTeam}>
            {match.home?.logo && (
              <Image source={{ uri: match.home.logo }} style={premiumStyles.heroTeamLogo} />
            )}
            <Text style={premiumStyles.heroTeamName}>
              {match.home?.short || match.homeShort}
            </Text>
          </View>

          <View style={premiumStyles.heroScoreBox}>
            <Text style={[premiumStyles.heroScore, critical && { color: COLORS.critical }]}>
              {match.home?.score ?? match.homeScore}
            </Text>
            <Text style={premiumStyles.heroScoreDash}>-</Text>
            <Text style={[premiumStyles.heroScore, critical && { color: COLORS.critical }]}>
              {match.away?.score ?? match.awayScore}
            </Text>
          </View>

          <View style={[premiumStyles.heroTeam, { alignItems: 'flex-end' }]}>
            {match.away?.logo && (
              <Image source={{ uri: match.away.logo }} style={premiumStyles.heroTeamLogo} />
            )}
            <Text style={premiumStyles.heroTeamName}>
              {match.away?.short || match.awayShort}
            </Text>
          </View>
        </View>

        {/* Mini Possession Bar */}
        <View style={premiumStyles.heroPossessionContainer}>
          <View style={premiumStyles.heroPossessionBar}>
            <View style={[premiumStyles.heroPossessionFill, { width: `${possession}%` }]} />
          </View>
          <View style={premiumStyles.heroPossessionLabels}>
            <Text style={premiumStyles.heroPossessionText}>{possession}%</Text>
            <Text style={premiumStyles.heroPossessionLabel}>{t('live.ballPossession')}</Text>
            <Text style={premiumStyles.heroPossessionText}>{100 - possession}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIVE MATCH CARD COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════════
  const LiveMatchCard = ({ match, index }) => {
    const stats = matchStats[match.id];
    const critical = isCriticalMatch(match.minute);
    const important = isImportantMatch(match.minute);
    const possession = stats?.possession?.home || 50;

    const entryAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(entryAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View style={{ opacity: entryAnim, transform: [{ translateY }] }}>
        <TouchableOpacity
          style={[
            premiumStyles.matchCard,
            critical && premiumStyles.matchCardCritical,
            important && premiumStyles.matchCardImportant,
          ]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('LiveMatchDetail', { match })}
        >
          {/* Main Row */}
          <View style={premiumStyles.matchMainRow}>
            {/* Home Team */}
            <View style={premiumStyles.matchTeamLeft}>
              {match.home?.logo && (
                <Image source={{ uri: match.home.logo }} style={premiumStyles.matchTeamLogo} />
              )}
              <Text style={premiumStyles.matchTeamName}>
                {match.home?.short || match.homeShort}
              </Text>
            </View>

            {/* Score & Minute */}
            <View style={premiumStyles.matchScoreContainer}>
              <Text style={[
                premiumStyles.matchScore,
                critical && { color: COLORS.critical },
              ]}>
                {match.home?.score ?? match.homeScore} - {match.away?.score ?? match.awayScore}
              </Text>
              <View style={[
                premiumStyles.matchMinuteBadge,
                critical && premiumStyles.matchMinuteCritical,
                important && premiumStyles.matchMinuteImportant,
              ]}>
                <Animated.View style={[
                  premiumStyles.matchLiveDot,
                  { transform: [{ scale: pulseAnim }] },
                  critical && { backgroundColor: COLORS.critical },
                  important && { backgroundColor: COLORS.important },
                ]} />
                <Text style={[
                  premiumStyles.matchMinuteText,
                  critical && { color: COLORS.critical },
                  important && { color: COLORS.important },
                ]}>
                  {match.statusText || `${match.minute}'`}
                </Text>
              </View>
            </View>

            {/* Away Team */}
            <View style={premiumStyles.matchTeamRight}>
              <Text style={premiumStyles.matchTeamName}>
                {match.away?.short || match.awayShort}
              </Text>
              {match.away?.logo && (
                <Image source={{ uri: match.away.logo }} style={premiumStyles.matchTeamLogo} />
              )}
            </View>
          </View>

          {/* Mini Possession Bar */}
          <View style={premiumStyles.matchPossessionBar}>
            <View style={[premiumStyles.matchPossessionFill, { width: `${possession}%` }]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={[styles.screen, premiumStyles.loadingContainer]}>
        <View style={premiumStyles.loadingPulse}>
          <Ionicons name="radio" size={32} color={COLORS.accent} />
        </View>
        <Text style={premiumStyles.loadingText}>{t('live.loading')}</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={premiumStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        {/* Header */}
        <Animated.View style={[premiumStyles.header, { opacity: fadeAnim, paddingTop: insets.top + 8 }]}>
          <View style={premiumStyles.headerLeft}>
            <Text style={premiumStyles.headerTitle}>{t('live.title')}</Text>
            <View style={premiumStyles.headerBadge}>
              <Animated.View style={[premiumStyles.headerPulseDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={premiumStyles.headerBadgeText}>{sortedMatches.length}</Text>
            </View>
          </View>
          {lastUpdated && (
            <Text style={premiumStyles.headerUpdated}>
              {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </Animated.View>

        {/* Hero Match (if critical) */}
        {heroMatch && <HeroMatchCard match={heroMatch} />}

        {/* Section Title */}
        {regularMatches.length > 0 && (
          <Text style={premiumStyles.sectionTitle}>
            {heroMatch ? t('live.otherMatches') : t('live.liveMatches')}
          </Text>
        )}

        {/* Regular Match Cards */}
        {regularMatches.map((match, index) => (
          <LiveMatchCard key={match.id} match={match} index={index} />
        ))}

        {/* Empty State */}
        {sortedMatches.length === 0 && (
          <View style={premiumStyles.emptyState}>
            <View style={premiumStyles.emptyIconContainer}>
              <Ionicons name="radio-outline" size={48} color={COLORS.gray600} />
            </View>
            <Text style={premiumStyles.emptyTitle}>{t('live.noMatches')}</Text>
            <Text style={premiumStyles.emptySubtitle}>{t('live.matchesWillAppear')}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

    </View>
  );
};

// Local styles
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const premiumStyles = StyleSheet.create({
  // Scroll Content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: TAB_BAR_TOTAL_HEIGHT,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.liveGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  headerPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.liveRed,
  },
  headerBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: COLORS.liveRed,
  },
  headerUpdated: {
    fontSize: 12,
    color: COLORS.gray500,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Section Title
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 16,
  },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  heroCardCritical: {
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.5,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLeague: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroLeagueLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  heroLeagueName: {
    fontSize: 13,
    color: COLORS.gray400,
    fontWeight: '500',
  },
  heroLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.liveGlow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  heroLiveBadgeCritical: {
    backgroundColor: COLORS.criticalGlow,
  },
  heroPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.liveRed,
  },
  heroMinuteText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: COLORS.liveRed,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  heroScoreSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTeam: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroTeamLogo: {
    width: 52,
    height: 52,
    marginBottom: 8,
  },
  heroTeamName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  heroScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroScore: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  heroScoreDash: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.gray500,
  },
  heroPossessionContainer: {
    marginTop: 4,
  },
  heroPossessionBar: {
    height: 4,
    backgroundColor: COLORS.gray700,
    borderRadius: 2,
    overflow: 'hidden',
  },
  heroPossessionFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  heroPossessionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  heroPossessionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray400,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  heroPossessionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray600,
    letterSpacing: 1,
  },

  // Match Card
  matchCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  matchCardCritical: {
    borderColor: 'rgba(255, 69, 58, 0.25)',
    backgroundColor: 'rgba(255, 69, 58, 0.04)',
  },
  matchCardImportant: {
    borderColor: 'rgba(255, 159, 10, 0.2)',
    backgroundColor: 'rgba(255, 159, 10, 0.03)',
  },
  matchMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchTeamLeft: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchTeamRight: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  matchTeamLogo: {
    width: 36,
    height: 36,
  },
  matchTeamName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  matchScoreContainer: {
    flex: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  matchScore: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  matchMinuteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  matchMinuteCritical: {},
  matchMinuteImportant: {},
  matchLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.liveRed,
  },
  matchMinuteText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: COLORS.liveRed,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  matchPossessionBar: {
    height: 3,
    backgroundColor: COLORS.gray700,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  matchPossessionFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 1.5,
  },

  // Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.gray600,
    borderRadius: 2,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetMatchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTeam: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sheetTeamLogo: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  sheetTeamName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  sheetScoreBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sheetScore: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  sheetLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.liveGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    marginTop: 8,
  },
  sheetLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.liveRed,
  },
  sheetLiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.liveRed,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sheetLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetLeagueLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  sheetLeagueName: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  sheetStatsSection: {
    padding: 20,
  },
  sheetSectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  sheetStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetStatValue: {
    width: 44,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sheetStatBarContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  sheetStatBar: {
    height: 6,
    backgroundColor: COLORS.gray700,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  sheetStatBarHome: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  sheetStatLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sheetActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginRight: 8,
  },
  sheetActionTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  sheetActionBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentDim,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    marginRight: 8,
  },
  sheetActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  sheetFavBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.cardElevated,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray500,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
  },
});

export default LiveScreen;
