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
  ImageBackground,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import footballApi from '../services/footballApi';
import { useSmartPolling, useAppState, POLLING_INTERVALS } from '../services/pollingService';
import { COLORS } from '../theme/colors';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATION POSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const FORMATION_POSITIONS = {
  '4-3-3': [
    { x: 50, y: 92 },  // GK
    { x: 15, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 72 },  // DEF
    { x: 25, y: 48 }, { x: 50, y: 48 }, { x: 75, y: 48 },  // MID
    { x: 20, y: 24 }, { x: 50, y: 24 }, { x: 80, y: 24 },  // FWD
  ],
  '4-4-2': [
    { x: 50, y: 92 },
    { x: 15, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 72 },
    { x: 15, y: 48 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 85, y: 48 },
    { x: 35, y: 24 }, { x: 65, y: 24 },
  ],
  '3-5-2': [
    { x: 50, y: 92 },
    { x: 25, y: 72 }, { x: 50, y: 72 }, { x: 75, y: 72 },
    { x: 10, y: 48 }, { x: 30, y: 48 }, { x: 50, y: 48 }, { x: 70, y: 48 }, { x: 90, y: 48 },
    { x: 35, y: 24 }, { x: 65, y: 24 },
  ],
  '4-2-3-1': [
    { x: 50, y: 92 },
    { x: 15, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 72 },
    { x: 35, y: 55 }, { x: 65, y: 55 },
    { x: 20, y: 38 }, { x: 50, y: 38 }, { x: 80, y: 38 },
    { x: 50, y: 20 },
  ],
  '3-4-3': [
    { x: 50, y: 92 },
    { x: 25, y: 72 }, { x: 50, y: 72 }, { x: 75, y: 72 },
    { x: 15, y: 48 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 85, y: 48 },
    { x: 20, y: 24 }, { x: 50, y: 24 }, { x: 80, y: 24 },
  ],
  '5-3-2': [
    { x: 50, y: 92 },
    { x: 10, y: 72 }, { x: 30, y: 72 }, { x: 50, y: 72 }, { x: 70, y: 72 }, { x: 90, y: 72 },
    { x: 25, y: 48 }, { x: 50, y: 48 }, { x: 75, y: 48 },
    { x: 35, y: 24 }, { x: 65, y: 24 },
  ],
  '4-1-4-1': [
    { x: 50, y: 92 },
    { x: 15, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 72 },
    { x: 50, y: 58 },
    { x: 15, y: 40 }, { x: 38, y: 40 }, { x: 62, y: 40 }, { x: 85, y: 40 },
    { x: 50, y: 20 },
  ],
};

const getFormationPositions = (formation) => {
  return FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-4-2'];
};

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTBALL PITCH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const FootballPitch = ({ homeLineup, awayLineup, homeTeamColor = COLORS.homeTeam, awayTeamColor = COLORS.awayTeam }) => {
  const homeFormation = homeLineup?.formation || '4-4-2';
  const awayFormation = awayLineup?.formation || '4-4-2';
  const homePositions = getFormationPositions(homeFormation);
  const awayPositions = getFormationPositions(awayFormation);

  const renderPlayer = (player, index, positions, isHome) => {
    if (!positions[index]) return null;
    const pos = positions[index];
    const adjustedX = isHome ? pos.x : pos.x;
    const adjustedY = isHome ? pos.y : (100 - pos.y);

    return (
      <View
        key={`${isHome ? 'home' : 'away'}-${index}`}
        style={[
          styles.pitchPlayer,
          {
            left: `${adjustedX}%`,
            top: `${adjustedY}%`,
            backgroundColor: isHome ? homeTeamColor : awayTeamColor,
          }
        ]}
      >
        <Text style={styles.pitchPlayerNumber}>
          {player?.player?.number || index + 1}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.pitchContainer}>
      <View style={styles.pitchField}>
        {/* Orta çizgi */}
        <View style={styles.pitchCenterLine} />
        {/* Orta daire */}
        <View style={styles.pitchCenterCircle} />
        {/* Ev sahibi ceza sahası (alt) */}
        <View style={[styles.pitchPenaltyArea, { bottom: 0 }]} />
        <View style={[styles.pitchGoalArea, { bottom: 0 }]} />
        {/* Deplasman ceza sahası (üst) */}
        <View style={[styles.pitchPenaltyArea, { top: 0 }]} />
        <View style={[styles.pitchGoalArea, { top: 0 }]} />

        {/* Ev sahibi oyuncular */}
        {homeLineup?.startXI?.map((p, i) => renderPlayer(p, i, homePositions, true))}

        {/* Deplasman oyuncular */}
        {awayLineup?.startXI?.map((p, i) => renderPlayer(p, i, awayPositions, false))}
      </View>

      {/* Formasyon etiketleri */}
      <View style={styles.formationLabels}>
        <View style={styles.formationLabel}>
          <View style={[styles.formationDot, { backgroundColor: homeTeamColor }]} />
          <Text style={styles.formationText}>{homeFormation}</Text>
        </View>
        <View style={styles.formationLabel}>
          <View style={[styles.formationDot, { backgroundColor: awayTeamColor }]} />
          <Text style={styles.formationText}>{awayFormation}</Text>
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const EventItem = ({ event, homeTeamId }) => {
  const isHome = event.team?.id === homeTeamId;
  const minute = event.time?.elapsed || 0;
  const extraTime = event.time?.extra;

  const getEventIcon = () => {
    if (event.type === 'Goal') {
      if (event.detail === 'Own Goal') return '⚽🔴';
      if (event.detail === 'Penalty') return '⚽P';
      return '⚽';
    }
    if (event.type === 'Card') {
      if (event.detail === 'Yellow Card') return '🟨';
      if (event.detail === 'Red Card') return '🟥';
      if (event.detail === 'Second Yellow card') return '🟨🟥';
    }
    if (event.type === 'subst') return '🔄';
    if (event.type === 'Var') return '📺';
    return '•';
  };

  const getEventColor = () => {
    if (event.type === 'Goal') return COLORS.success;
    if (event.type === 'Card') {
      if (event.detail?.includes('Red')) return COLORS.danger;
      return COLORS.warning;
    }
    return COLORS.gray400;
  };

  return (
    <View style={[styles.eventItem, isHome ? {} : { flexDirection: 'row-reverse' }]}>
      <View style={[styles.eventIconContainer, { backgroundColor: `${getEventColor()}20` }]}>
        <Text style={styles.eventIcon}>{getEventIcon()}</Text>
      </View>
      <View style={[styles.eventContent, isHome ? {} : { alignItems: 'flex-end' }]}>
        <Text style={styles.eventMinute}>
          {minute}'{extraTime ? `+${extraTime}` : ''}
        </Text>
        <Text style={styles.eventPlayer}>{event.player?.name || 'Oyuncu'}</Text>
        {event.assist?.name && (
          <Text style={styles.eventAssist}>
            {event.type === 'subst' ? `↓ ${event.assist.name}` : `(${event.assist.name})`}
          </Text>
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE MATCH DETAIL SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

const LiveMatchDetailScreen = ({ route, navigation }) => {
  // Get match from route params
  const match = route?.params?.match;

  // Safe area insets for proper header positioning
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [events, setEvents] = useState([]);
  const [lineups, setLineups] = useState(null);
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Handle both API data structure and old mock data structure
  const isApiData = typeof match.home === 'object';
  const homeName = isApiData ? match.home?.name : match.home;
  const awayName = isApiData ? match.away?.name : match.away;
  const homeShort = isApiData ? match.home?.short : (match.homeShort || homeName?.substring(0, 3).toUpperCase());
  const awayShort = isApiData ? match.away?.short : (match.awayShort || awayName?.substring(0, 3).toUpperCase());
  const homeLogo = isApiData ? match.home?.logo : null;
  const awayLogo = isApiData ? match.away?.logo : null;
  const leagueName = isApiData ? match.league?.name : match.league;
  const leagueLogo = isApiData ? (match.league?.flag || match.league?.logo) : null;
  const homeTeamId = isApiData ? match.home?.id : null;
  const awayTeamId = isApiData ? match.away?.id : null;
  const fixtureId = match.id;

  // Get live data
  const currentScore = matchData ? {
    home: matchData.goals?.home ?? match.homeScore ?? 0,
    away: matchData.goals?.away ?? match.awayScore ?? 0,
  } : {
    home: match.home?.score ?? match.homeScore ?? 0,
    away: match.away?.score ?? match.awayScore ?? 0,
  };
  const currentMinute = matchData?.fixture?.status?.elapsed || match.minute || 0;
  const currentStatus = matchData?.fixture?.status?.short || match.status || 'LIVE';
  const statusText = matchData?.fixture?.status?.short
    ? footballApi.getStatusText(matchData.fixture.status.short)
    : (match.statusText || `${currentMinute}'`);
  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(currentStatus);
  const isFinished = ['FT', 'AET', 'PEN'].includes(currentStatus);
  const isCritical = currentMinute >= 85 && isLive;

  // Fetch live data
  const fetchLiveData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [fixtureData, eventsData, statsData, lineupsData] = await Promise.all([
        footballApi.getFixtureById(fixtureId),
        footballApi.getFixtureEvents(fixtureId),
        footballApi.getFixtureStats(fixtureId),
        !lineups ? footballApi.getFixtureLineups(fixtureId) : Promise.resolve(null),
      ]);

      if (fixtureData && fixtureData.length > 0) {
        setMatchData(fixtureData[0]);
      }

      if (eventsData) {
        // Olayları ters sırala (son olaylar üstte)
        setEvents([...eventsData].reverse());
      }

      if (statsData && statsData.length >= 2) {
        const homeStats = statsData.find(s => s.team?.id === homeTeamId) || statsData[0];
        const awayStats = statsData.find(s => s.team?.id === awayTeamId) || statsData[1];

        const getStat = (team, name) => {
          const stat = team.statistics?.find(s => s.type === name);
          return stat ? (typeof stat.value === 'string' ? parseInt(stat.value) || 0 : stat.value || 0) : 0;
        };

        setStats([
          { label: 'Top Kontrolü', home: getStat(homeStats, 'Ball Possession'), away: getStat(awayStats, 'Ball Possession'), isPercent: true },
          { label: 'Toplam Şut', home: getStat(homeStats, 'Total Shots'), away: getStat(awayStats, 'Total Shots') },
          { label: 'İsabetli Şut', home: getStat(homeStats, 'Shots on Goal'), away: getStat(awayStats, 'Shots on Goal') },
          { label: 'Korner', home: getStat(homeStats, 'Corner Kicks'), away: getStat(awayStats, 'Corner Kicks') },
          { label: 'Faul', home: getStat(homeStats, 'Fouls'), away: getStat(awayStats, 'Fouls') },
          { label: 'Sarı Kart', home: getStat(homeStats, 'Yellow Cards'), away: getStat(awayStats, 'Yellow Cards') },
        ]);
      }

      if (lineupsData && lineupsData.length >= 2 && !lineups) {
        const homeLineup = lineupsData.find(l => l.team?.id === homeTeamId) || lineupsData[0];
        const awayLineup = lineupsData.find(l => l.team?.id === awayTeamId) || lineupsData[1];
        setLineups({ home: homeLineup, away: awayLineup });
      }

      setLastUpdated(new Date());
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Akıllı polling - maç durumuna göre dinamik interval
  const getMatchStatusForPolling = useCallback(() => ({
    status: currentStatus,
    minute: currentMinute,
  }), [currentStatus, currentMinute]);

  useSmartPolling(`live_match_detail_${fixtureId}`, () => fetchLiveData(false), {
    enabled: !isFinished, // Sadece maç bitmediyse
    baseInterval: POLLING_INTERVALS.LIVE_ACTIVE,
    getMatchStatus: getMatchStatusForPolling,
    pauseInBackground: true,
    deps: [fixtureId, isFinished],
  });

  // İlk yüklemede veriyi çek
  useEffect(() => {
    fetchLiveData(true);
  }, [fixtureId]);

  // App öne geldiğinde hemen güncelle (sadece maç bitmediyse)
  useAppState(
    () => { if (!isFinished) fetchLiveData(false); }, // onForeground
    null // onBackground
  );

  // Animations
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    if (isLive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLive]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLiveData(false);
  }, []);

  // Stat Bar Component
  const StatBar = ({ label, home, away, isPercent }) => {
    const total = (home || 0) + (away || 0) || 1;
    const homePercent = isPercent ? home : ((home || 0) / total) * 100;

    return (
      <View style={styles.statRow}>
        <Text style={styles.statValue}>{home || 0}{isPercent ? '%' : ''}</Text>
        <View style={styles.statBarContainer}>
          <View style={styles.statBar}>
            <View style={[styles.statBarFill, { width: `${homePercent}%` }]} />
          </View>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
        <Text style={[styles.statValue, { textAlign: 'right' }]}>{away || 0}{isPercent ? '%' : ''}</Text>
      </View>
    );
  };

  // Loading State
  if (loading) {
    return (
      <View style={[baseStyles.screen, styles.loadingContainer]}>
        <View style={styles.loadingPulse}>
          <Ionicons name="football" size={32} color={COLORS.accent} />
        </View>
        <Text style={styles.loadingText}>Canlı maç yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.screen}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {leagueLogo && <Image source={{ uri: leagueLogo }} style={styles.headerLeagueLogo} />}
          <Text style={styles.headerLeagueName} numberOfLines={1}>{leagueName}</Text>
        </View>
        <TouchableOpacity style={styles.favBtn}>
          <Ionicons name="bookmark-outline" size={22} color={COLORS.gray400} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        {/* Score Hero */}
        <Animated.View style={[styles.scoreHero, { opacity: fadeAnim }]}>
          <ImageBackground
            source={require('../../assets/images/canlisaha.png')}
            style={styles.scoreHeroBackground}
            imageStyle={styles.scoreHeroBackgroundImage}
            resizeMode="cover"
          >
            {/* Glass Overlay */}
            <View style={styles.scoreHeroOverlay} />

            {/* Home Team */}
            <View style={styles.heroTeam}>
              {homeLogo && <Image source={{ uri: homeLogo }} style={styles.heroTeamLogo} />}
              <Text style={styles.heroTeamName}>{homeShort}</Text>
            </View>

            {/* Score Center */}
            <View style={styles.heroScoreCenter}>
              <Text style={[styles.heroScore, isCritical && { color: COLORS.critical }]}>
                {currentScore.home} - {currentScore.away}
              </Text>
              {isLive ? (
                <View style={[styles.heroLiveBadge, isCritical && { backgroundColor: COLORS.criticalGlow }]}>
                  <Animated.View style={[styles.heroLiveDot, { transform: [{ scale: pulseAnim }] }, isCritical && { backgroundColor: COLORS.critical }]} />
                  <Text style={[styles.heroLiveText, isCritical && { color: COLORS.critical }]}>
                    {statusText}
                  </Text>
                </View>
              ) : isFinished ? (
                <View style={styles.heroFinishedBadge}>
                  <Text style={styles.heroFinishedText}>Maç Sona Erdi</Text>
                </View>
              ) : (
                <Text style={styles.heroStatusText}>{statusText}</Text>
              )}
              {lastUpdated && (
                <Text style={styles.lastUpdatedText}>
                  Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              )}
            </View>

            {/* Away Team */}
            <View style={[styles.heroTeam, { alignItems: 'flex-end' }]}>
              {awayLogo && <Image source={{ uri: awayLogo }} style={styles.heroTeamLogo} />}
              <Text style={styles.heroTeamName}>{awayShort}</Text>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* Football Pitch - Lineup Visualization */}
        {lineups && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KADRO DİZİLİŞİ</Text>
            <FootballPitch homeLineup={lineups.home} awayLineup={lineups.away} />
          </View>
        )}

        {/* Events Timeline */}
        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MAÇ OLAYLARI</Text>
            <View style={styles.eventsContainer}>
              {events.slice(0, 10).map((event, index) => (
                <EventItem key={index} event={event} homeTeamId={homeTeamId} />
              ))}
            </View>
          </View>
        )}

        {/* Stats Section */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İSTATİSTİKLER</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsHeaderTeam}>{homeShort}</Text>
                <Text style={styles.statsHeaderTeam}>{awayShort}</Text>
              </View>
              {stats.map((stat, index) => (
                <StatBar key={index} {...stat} />
              ))}
            </View>
          </View>
        )}

        {/* Empty Events State */}
        {events.length === 0 && !loading && (
          <View style={styles.emptyEvents}>
            <Ionicons name="time-outline" size={32} color={COLORS.gray600} />
            <Text style={styles.emptyEventsText}>Henüz maç olayı yok</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BASE STYLES (minimal shared styles)
// ═══════════════════════════════════════════════════════════════════════════════

const baseStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE DETAIL STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerLeagueLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  headerLeagueName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray300,
    maxWidth: 200,
  },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll Content
  scrollContent: {
    paddingBottom: 20,
  },

  // Score Hero
  scoreHero: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  scoreHeroBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  scoreHeroBackgroundImage: {
    borderRadius: 20,
  },
  scoreHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
  },
  heroTeam: {
    flex: 1,
    alignItems: 'center',
  },
  heroTeamLogo: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },
  heroTeamName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroScoreCenter: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heroScore: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.liveGlow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  heroLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.liveRed,
  },
  heroLiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.liveRed,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroFinishedBadge: {
    backgroundColor: COLORS.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  heroFinishedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  heroStatusText: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 8,
  },
  lastUpdatedText: {
    fontSize: 10,
    color: COLORS.gray300,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Section
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Football Pitch
  pitchContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  pitchField: {
    aspectRatio: 0.7,
    backgroundColor: '#1a472a',
    position: 'relative',
  },
  pitchCenterLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pitchCenterCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginLeft: -30,
    marginTop: -30,
  },
  pitchPenaltyArea: {
    position: 'absolute',
    left: '20%',
    width: '60%',
    height: '18%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pitchGoalArea: {
    position: 'absolute',
    left: '35%',
    width: '30%',
    height: '8%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pitchPlayer: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  pitchPlayerNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  formationLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardElevated,
  },
  formationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  formationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Events
  eventsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  eventIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIcon: {
    fontSize: 16,
  },
  eventContent: {
    flex: 1,
  },
  eventMinute: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  eventPlayer: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 2,
  },
  eventAssist: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // Stats
  statsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statsHeaderTeam: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    width: 44,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statBarContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  statBar: {
    height: 6,
    backgroundColor: COLORS.gray700,
    borderRadius: 3,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: 4,
  },

  // Empty Events
  emptyEvents: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
  },
  emptyEventsText: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 12,
  },
});

export default LiveMatchDetailScreen;
