import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Switch,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import footballApi from './src/services/footballApi';
import claudeAi from './src/services/claudeAi';
import HomeScreen from './src/screens/HomeScreen';
import MatchAnalysisScreen from './src/screens/MatchAnalysisScreen';

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALE TO COUNTRY MAPPING
// ═══════════════════════════════════════════════════════════════════════════════
const LOCALE_TO_COUNTRY = {
  'tr': 'Turkey',
  'en': 'England',
  'de': 'Germany',
  'es': 'Spain',
  'fr': 'France',
  'it': 'Italy',
  'pt': 'Portugal',
  'nl': 'Netherlands',
  'be': 'Belgium',
  'ja': 'Japan',
  'ko': 'South-Korea',
  'zh': 'China',
  'ru': 'Russia',
  'pl': 'Poland',
  'gr': 'Greece',
  'ua': 'Ukraine',
  'cz': 'Czech-Republic',
  'se': 'Sweden',
  'no': 'Norway',
  'dk': 'Denmark',
  'fi': 'Finland',
  'at': 'Austria',
  'ch': 'Switzerland',
  'br': 'Brazil',
  'mx': 'Mexico',
  'us': 'USA',
  'sa': 'Saudi-Arabia',
};

// Popüler ligler (fallback sıralaması)
const POPULAR_LEAGUE_IDS = [39, 140, 135, 78, 61, 203, 2, 3]; // PL, La Liga, Serie A, Bundesliga, Ligue 1, Süper Lig, UCL, UEL

// ═══════════════════════════════════════════════════════════════════════════════
// THEME - Premium Sports Dark
// ═══════════════════════════════════════════════════════════════════════════════
const COLORS = {
  // Base
  bg: '#0a0e13',
  card: '#141a22',
  cardElevated: '#1a222c',
  border: '#232d3b',

  // Glassmorphism
  glass: 'rgba(20, 26, 34, 0.92)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',

  // Accents
  accent: '#00d4aa',
  accentDim: 'rgba(0, 212, 170, 0.12)',
  accentGlow: 'rgba(0, 212, 170, 0.25)',

  // Status
  success: '#00d977',
  warning: '#ff9f0a',
  danger: '#ff453a',

  // Live States
  liveRed: '#ff3b30',
  liveGlow: 'rgba(255, 59, 48, 0.2)',
  critical: '#ff453a',       // 85+ dakika
  criticalGlow: 'rgba(255, 69, 58, 0.15)',
  important: '#ff9f0a',      // 75-84 dakika
  importantGlow: 'rgba(255, 159, 10, 0.12)',

  // Grays
  white: '#ffffff',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',

  // Team colors (for future use)
  homeTeam: '#3b82f6',
  awayTeam: '#ef4444',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA - AI Maç Analiz
// ═══════════════════════════════════════════════════════════════════════════════
const FEATURED_MATCH = {
  id: '1',
  home: 'Manchester City',
  away: 'Liverpool',
  homeShort: 'MCI',
  awayShort: 'LIV',
  time: '20:45',
  league: 'Premier League',
  homeWinProb: 62,
  drawProb: 18,
  awayWinProb: 20,
  aiComment: 'City evinde son 8 maçı kazandı. Haaland forumda, 5 maçta 7 gol.',
  confidence: 8.2,
};

const TODAY_MATCHES = [
  {
    id: '1',
    home: 'Real Madrid',
    away: 'Barcelona',
    time: '22:00',
    league: 'La Liga',
    aiPrediction: 48,
    confidence: 6.5,
  },
  {
    id: '2',
    home: 'Bayern Münih',
    away: 'Dortmund',
    time: '19:30',
    league: 'Bundesliga',
    aiPrediction: 71,
    confidence: 8.0,
  },
  {
    id: '3',
    home: 'PSG',
    away: 'Marseille',
    time: '21:00',
    league: 'Ligue 1',
    aiPrediction: 78,
    confidence: 8.5,
  },
  {
    id: '4',
    home: 'Juventus',
    away: 'Inter',
    time: '20:45',
    league: 'Serie A',
    aiPrediction: 42,
    confidence: 5.8,
  },
  {
    id: '5',
    home: 'Galatasaray',
    away: 'Fenerbahçe',
    time: '19:00',
    league: 'Süper Lig',
    aiPrediction: 55,
    confidence: 7.2,
  },
];

const TRENDS = {
  rising: [
    { team: 'Leverkusen', streak: 'W5', detail: '5 galibiyet' },
    { team: 'Inter', streak: 'W4', detail: '4 galibiyet' },
  ],
  falling: [
    { team: 'Man United', streak: 'L3', detail: '3 mağlubiyet' },
    { team: 'Chelsea', streak: 'D4', detail: '4 beraberlik' },
  ],
};

const STATS = {
  totalMatches: 24,
  liveMatches: 3,
  aiAccuracy: 68,
};

// Canlı Maçlar Data
const LIVE_MATCHES = [
  {
    id: '1',
    home: 'Arsenal',
    away: 'Chelsea',
    homeShort: 'ARS',
    awayShort: 'CHE',
    homeScore: 2,
    awayScore: 1,
    minute: 67,
    league: 'Premier League',
    status: 'live',
    events: [
      { type: 'goal', team: 'home', minute: 12, player: 'Saka' },
      { type: 'goal', team: 'away', minute: 34, player: 'Palmer' },
      { type: 'goal', team: 'home', minute: 58, player: 'Havertz' },
    ],
    stats: {
      possession: { home: 54, away: 46 },
      shots: { home: 12, away: 8 },
      shotsOnTarget: { home: 5, away: 3 },
      corners: { home: 6, away: 4 },
    },
  },
  {
    id: '2',
    home: 'Atletico Madrid',
    away: 'Sevilla',
    homeShort: 'ATM',
    awayShort: 'SEV',
    homeScore: 0,
    awayScore: 0,
    minute: 23,
    league: 'La Liga',
    status: 'live',
    events: [],
    stats: {
      possession: { home: 62, away: 38 },
      shots: { home: 5, away: 2 },
      shotsOnTarget: { home: 1, away: 0 },
      corners: { home: 3, away: 1 },
    },
  },
  {
    id: '3',
    home: 'Napoli',
    away: 'Roma',
    homeShort: 'NAP',
    awayShort: 'ROM',
    homeScore: 3,
    awayScore: 2,
    minute: 81,
    league: 'Serie A',
    status: 'live',
    events: [
      { type: 'goal', team: 'home', minute: 8, player: 'Osimhen' },
      { type: 'goal', team: 'away', minute: 22, player: 'Dybala' },
      { type: 'goal', team: 'home', minute: 45, player: 'Kvara' },
      { type: 'goal', team: 'home', minute: 67, player: 'Osimhen' },
      { type: 'goal', team: 'away', minute: 78, player: 'Lukaku' },
    ],
    stats: {
      possession: { home: 48, away: 52 },
      shots: { home: 14, away: 11 },
      shotsOnTarget: { home: 7, away: 5 },
      corners: { home: 5, away: 6 },
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM LIVE SCREEN - Canlı Maçlar (Sky Sports / ESPN Style)
// ═══════════════════════════════════════════════════════════════════════════════
const LiveScreen = ({ onMatchPress, onLiveMatchPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [liveMatches, setLiveMatches] = useState([]);
  const [sortedMatches, setSortedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchStats, setMatchStats] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Maçları dakikaya göre sırala (kritik maçlar üstte)
  const sortMatchesByMinute = (matches) => {
    return [...matches].sort((a, b) => {
      const getScore = (match) => {
        const min = match.minute || 0;
        const status = match.statusText || match.status;
        if (min >= 85) return 1000 + min;
        if (min >= 75) return 800 + min;
        if (status === 'Devre Arası' || status === 'HT') return 500;
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
      console.error('Stats fetch error:', error);
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
    } catch (error) {
      console.error('Live matches fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Bottom Sheet aç
  const openSheet = async (match) => {
    setSelectedMatch(match);
    setSheetVisible(true);
    fetchMatchStats(match.id);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  };

  // Bottom Sheet kapat
  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelectedMatch(null);
    });
  };

  useEffect(() => {
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 30000);
    return () => clearInterval(interval);
  }, []);

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
        onPress={() => openSheet(match)}
      >
        {/* Gradient Overlay */}
        <View style={[
          premiumStyles.heroGradient,
          { backgroundColor: critical ? COLORS.criticalGlow : COLORS.accentGlow }
        ]} />

        {/* Header */}
        <View style={premiumStyles.heroHeader}>
          <View style={premiumStyles.heroLeague}>
            {match.league?.logo && (
              <Image source={{ uri: match.league.logo }} style={premiumStyles.heroLeagueLogo} />
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
            <Text style={premiumStyles.heroPossessionLabel}>TOP KONTROLÜ</Text>
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
          onPress={() => openSheet(match)}
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
  // BOTTOM SHEET COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════════
  const MatchStatsSheet = () => {
    if (!selectedMatch) return null;

    const stats = matchStats[selectedMatch.id];
    const critical = isCriticalMatch(selectedMatch.minute);

    const StatRow = ({ label, home, away, isPercentage }) => {
      const total = (home || 0) + (away || 0) || 1;
      const homePercent = isPercentage ? home : ((home || 0) / total) * 100;

      return (
        <View style={premiumStyles.sheetStatRow}>
          <Text style={premiumStyles.sheetStatValue}>{home || 0}{isPercentage ? '%' : ''}</Text>
          <View style={premiumStyles.sheetStatBarContainer}>
            <View style={premiumStyles.sheetStatBar}>
              <View style={[premiumStyles.sheetStatBarHome, { width: `${homePercent}%` }]} />
            </View>
            <Text style={premiumStyles.sheetStatLabel}>{label}</Text>
          </View>
          <Text style={premiumStyles.sheetStatValue}>{away || 0}{isPercentage ? '%' : ''}</Text>
        </View>
      );
    };

    return (
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        <Pressable style={premiumStyles.sheetOverlay} onPress={closeSheet}>
          <Animated.View
            style={[
              premiumStyles.sheetContainer,
              {
                transform: [{
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  })
                }]
              }
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Handle */}
              <View style={premiumStyles.sheetHandle}>
                <View style={premiumStyles.sheetHandleBar} />
              </View>

              {/* Header with Match Info */}
              <View style={premiumStyles.sheetHeader}>
                <View style={premiumStyles.sheetMatchInfo}>
                  {/* Home Team */}
                  <View style={premiumStyles.sheetTeam}>
                    {selectedMatch.home?.logo && (
                      <Image source={{ uri: selectedMatch.home.logo }} style={premiumStyles.sheetTeamLogo} />
                    )}
                    <Text style={premiumStyles.sheetTeamName}>{selectedMatch.home?.short || selectedMatch.homeShort}</Text>
                  </View>

                  {/* Score */}
                  <View style={premiumStyles.sheetScoreBox}>
                    <Text style={[premiumStyles.sheetScore, critical && { color: COLORS.critical }]}>
                      {selectedMatch.home?.score ?? selectedMatch.homeScore} - {selectedMatch.away?.score ?? selectedMatch.awayScore}
                    </Text>
                    <View style={[premiumStyles.sheetLiveBadge, critical && { backgroundColor: COLORS.criticalGlow }]}>
                      <View style={[premiumStyles.sheetLiveDot, critical && { backgroundColor: COLORS.critical }]} />
                      <Text style={[premiumStyles.sheetLiveText, critical && { color: COLORS.critical }]}>
                        {selectedMatch.statusText || `${selectedMatch.minute}'`}
                      </Text>
                    </View>
                  </View>

                  {/* Away Team */}
                  <View style={[premiumStyles.sheetTeam, { alignItems: 'flex-end' }]}>
                    {selectedMatch.away?.logo && (
                      <Image source={{ uri: selectedMatch.away.logo }} style={premiumStyles.sheetTeamLogo} />
                    )}
                    <Text style={premiumStyles.sheetTeamName}>{selectedMatch.away?.short || selectedMatch.awayShort}</Text>
                  </View>
                </View>

                {/* League Info */}
                <View style={premiumStyles.sheetLeagueRow}>
                  {selectedMatch.league?.logo && (
                    <Image source={{ uri: selectedMatch.league.logo }} style={premiumStyles.sheetLeagueLogo} />
                  )}
                  <Text style={premiumStyles.sheetLeagueName}>{selectedMatch.league?.name}</Text>
                </View>
              </View>

              {/* Statistics */}
              <View style={premiumStyles.sheetStatsSection}>
                <Text style={premiumStyles.sheetSectionTitle}>İSTATİSTİKLER</Text>
                <StatRow label="Top Kontrolü" home={stats?.possession?.home} away={stats?.possession?.away} isPercentage />
                <StatRow label="Toplam Şut" home={stats?.shots?.home} away={stats?.shots?.away} />
                <StatRow label="İsabetli Şut" home={stats?.shotsOnTarget?.home} away={stats?.shotsOnTarget?.away} />
                <StatRow label="Korner" home={stats?.corners?.home} away={stats?.corners?.away} />
                <StatRow label="Faul" home={stats?.fouls?.home} away={stats?.fouls?.away} />
              </View>

              {/* Action Buttons */}
              <View style={premiumStyles.sheetActions}>
                {/* Birincil Buton: Canlı Takip */}
                <TouchableOpacity
                  style={premiumStyles.sheetActionBtnPrimary}
                  onPress={() => {
                    closeSheet();
                    setTimeout(() => onLiveMatchPress && onLiveMatchPress(selectedMatch), 300);
                  }}
                >
                  <Ionicons name="football" size={18} color={COLORS.white} />
                  <Text style={premiumStyles.sheetActionTextPrimary}>Canlı Takip</Text>
                </TouchableOpacity>
                {/* İkincil Buton: Detaylı Analiz */}
                <TouchableOpacity
                  style={premiumStyles.sheetActionBtn}
                  onPress={() => {
                    closeSheet();
                    setTimeout(() => onMatchPress && onMatchPress(selectedMatch), 300);
                  }}
                >
                  <Ionicons name="stats-chart" size={18} color={COLORS.accent} />
                  <Text style={premiumStyles.sheetActionText}>Analiz</Text>
                </TouchableOpacity>
                <TouchableOpacity style={premiumStyles.sheetFavBtn}>
                  <Ionicons name="bookmark-outline" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
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
        <Text style={premiumStyles.loadingText}>Canlı maçlar yükleniyor...</Text>
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
        <Animated.View style={[premiumStyles.header, { opacity: fadeAnim }]}>
          <View style={premiumStyles.headerLeft}>
            <Text style={premiumStyles.headerTitle}>Canlı</Text>
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
            {heroMatch ? 'DİĞER MAÇLAR' : 'CANLI MAÇLAR'}
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
            <Text style={premiumStyles.emptyTitle}>Şu an canlı maç yok</Text>
            <Text style={premiumStyles.emptySubtitle}>Maçlar başladığında burada görünecek</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Sheet */}
      <MatchStatsSheet />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const premiumStyles = StyleSheet.create({
  // Scroll Content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM MATCH DETAIL SCREEN - Maç Detay (Single Page Scrollable)
// ═══════════════════════════════════════════════════════════════════════════════
const MatchDetailScreen = ({ match, onBack }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [h2hData, setH2hData] = useState(null);
  const [lineups, setLineups] = useState(null);
  const [stats, setStats] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    ai: true,
    stats: true,
    h2h: false,
    lineups: false,
  });

  // Handle both API data structure and old mock data structure
  const isApiData = typeof match.home === 'object';
  const homeName = isApiData ? match.home?.name : match.home;
  const awayName = isApiData ? match.away?.name : match.away;
  const homeShort = isApiData ? match.home?.short : (match.homeShort || homeName?.substring(0, 3).toUpperCase());
  const awayShort = isApiData ? match.away?.short : (match.awayShort || awayName?.substring(0, 3).toUpperCase());
  const homeLogo = isApiData ? match.home?.logo : null;
  const awayLogo = isApiData ? match.away?.logo : null;
  const homeScore = isApiData ? match.home?.score : match.homeScore;
  const awayScore = isApiData ? match.away?.score : match.awayScore;
  const leagueName = isApiData ? match.league?.name : match.league;
  const leagueLogo = isApiData ? match.league?.logo : null;
  const homeTeamId = isApiData ? match.home?.id : null;
  const awayTeamId = isApiData ? match.away?.id : null;
  const fixtureId = match.id;
  const isLive = match.isLive || homeScore !== undefined;
  const isCritical = (match.minute || 0) >= 85;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch match details from API
  const fetchMatchDetails = async () => {
    try {
      setLoading(true);

      // Fetch prediction
      try {
        const predData = await footballApi.getPredictions(fixtureId);
        if (predData && predData.length > 0) {
          const formatted = footballApi.formatPrediction(predData[0]);
          setPrediction(formatted);
        }
      } catch (e) {
        console.log('Prediction fetch error:', e);
      }

      // Fetch H2H if we have team IDs
      if (homeTeamId && awayTeamId) {
        try {
          const h2h = await footballApi.getHeadToHead(homeTeamId, awayTeamId, 5);
          if (h2h && h2h.length > 0) {
            let homeWins = 0, draws = 0, awayWins = 0;
            const recentMatches = h2h.map(fixture => {
              const f = footballApi.formatFixture(fixture);
              const isCurrentHomeTeam = f.home.id === homeTeamId;
              const hScore = f.home.score || 0;
              const aScore = f.away.score || 0;

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

            setH2hData({ total: h2h.length, homeWins, draws, awayWins, recentMatches });
          }
        } catch (e) {
          console.log('H2H fetch error:', e);
        }
      }

      // Fetch lineups
      try {
        const lineupsData = await footballApi.getFixtureLineups(fixtureId);
        if (lineupsData && lineupsData.length >= 2) {
          const homeLineup = lineupsData.find(l => l.team.id === homeTeamId) || lineupsData[0];
          const awayLineup = lineupsData.find(l => l.team.id === awayTeamId) || lineupsData[1];

          setLineups({
            home: {
              formation: homeLineup.formation || '?',
              players: homeLineup.startXI?.map(p => p.player.name) || [],
              coach: homeLineup.coach?.name || '',
            },
            away: {
              formation: awayLineup.formation || '?',
              players: awayLineup.startXI?.map(p => p.player.name) || [],
              coach: awayLineup.coach?.name || '',
            },
          });
        }
      } catch (e) {
        console.log('Lineups fetch error:', e);
      }

      // Fetch stats
      try {
        const statsData = await footballApi.getFixtureStats(fixtureId);
        if (statsData && statsData.length >= 2) {
          const homeStats = statsData.find(s => s.team.id === homeTeamId) || statsData[0];
          const awayStats = statsData.find(s => s.team.id === awayTeamId) || statsData[1];

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
            { label: 'Ofsayt', home: getStat(homeStats, 'Offsides'), away: getStat(awayStats, 'Offsides') },
          ]);
        }
      } catch (e) {
        console.log('Stats fetch error:', e);
      }

    } catch (error) {
      console.error('Match details fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Claude AI Analysis
  const fetchAiAnalysis = async () => {
    if (aiAnalysis) return;
    setAiLoading(true);
    try {
      const analysisData = {
        home: match.home,
        away: match.away,
        league: match.league,
        date: match.date,
        time: match.time,
        homeForm: prediction?.homeForm,
        awayForm: prediction?.awayForm,
        h2h: h2hData?.recentMatches || [],
        prediction: prediction,
      };
      const result = await claudeAi.analyzeMatch(analysisData);
      if (result) setAiAnalysis(result);
    } catch (error) {
      console.error('Claude AI analysis error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [fixtureId]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!loading && !aiAnalysis && !aiLoading) fetchAiAnalysis();
  }, [loading]);

  // Analysis display data
  const analysisDisplay = aiAnalysis || {
    homeWinProb: prediction?.percent?.home || match.homeWinProb || 33,
    drawProb: prediction?.percent?.draw || match.drawProb || 34,
    awayWinProb: prediction?.percent?.away || match.awayWinProb || 33,
    confidence: match.confidence || 7.0,
    expectedGoals: prediction?.goals?.home && prediction?.goals?.away
      ? (parseFloat(prediction.goals.home) + parseFloat(prediction.goals.away)).toFixed(1)
      : 2.5,
    bttsProb: 55,
    over25Prob: 60,
    advice: prediction?.advice || 'AI analizi yükleniyor...',
    factors: prediction ? [
      prediction.advice ? { text: prediction.advice, positive: true } : null,
      prediction.homeForm ? { text: `Ev sahibi form: ${prediction.homeForm}`, positive: prediction.homeForm?.slice(-3).includes('W') } : null,
      prediction.awayForm ? { text: `Deplasman form: ${prediction.awayForm}`, positive: prediction.awayForm?.slice(-3).includes('W') } : null,
    ].filter(Boolean) : [],
  };

  const h2hDisplay = h2hData || { total: 0, homeWins: 0, draws: 0, awayWins: 0, recentMatches: [] };
  const lineupsDisplay = lineups || { home: { formation: '?', players: [], coach: '' }, away: { formation: '?', players: [], coach: '' } };
  const statsDisplay = stats || [
    { label: 'Top Kontrolü', home: 50, away: 50, isPercent: true },
    { label: 'Şut', home: 0, away: 0 },
    { label: 'İsabetli Şut', home: 0, away: 0 },
    { label: 'Korner', home: 0, away: 0 },
  ];

  // ═══════════════════════════════════════════════════════════════════════════════
  // COLLAPSIBLE SECTION COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════════
  const Section = ({ title, icon, expanded, onToggle, children, badge }) => (
    <View style={detailStyles.section}>
      <TouchableOpacity style={detailStyles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={detailStyles.sectionHeaderLeft}>
          <Ionicons name={icon} size={18} color={COLORS.accent} />
          <Text style={detailStyles.sectionTitle}>{title}</Text>
          {badge && <View style={detailStyles.sectionBadge}><Text style={detailStyles.sectionBadgeText}>{badge}</Text></View>}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.gray500} />
      </TouchableOpacity>
      {expanded && <View style={detailStyles.sectionContent}>{children}</View>}
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // STAT BAR COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════════
  const StatBar = ({ label, home, away, isPercent }) => {
    const total = (home || 0) + (away || 0) || 1;
    const homePercent = isPercent ? home : ((home || 0) / total) * 100;

    return (
      <View style={detailStyles.statRow}>
        <Text style={detailStyles.statValue}>{home || 0}{isPercent ? '%' : ''}</Text>
        <View style={detailStyles.statBarContainer}>
          <View style={detailStyles.statBar}>
            <View style={[detailStyles.statBarFill, { width: `${homePercent}%` }]} />
          </View>
          <Text style={detailStyles.statLabel}>{label}</Text>
        </View>
        <Text style={[detailStyles.statValue, { textAlign: 'right' }]}>{away || 0}{isPercent ? '%' : ''}</Text>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={[styles.screen, detailStyles.loadingContainer]}>
        <View style={detailStyles.loadingPulse}>
          <Ionicons name="football" size={32} color={COLORS.accent} />
        </View>
        <Text style={detailStyles.loadingText}>Maç detayları yükleniyor...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.screen}>
      {/* Sticky Header */}
      <Animated.View style={[detailStyles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity style={detailStyles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={detailStyles.headerCenter}>
          {leagueLogo && <Image source={{ uri: leagueLogo }} style={detailStyles.headerLeagueLogo} />}
          <Text style={detailStyles.headerLeagueName} numberOfLines={1}>{leagueName}</Text>
        </View>
        <TouchableOpacity style={detailStyles.favBtn}>
          <Ionicons name="bookmark-outline" size={22} color={COLORS.gray400} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={detailStyles.scrollContent}>
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* SCORE HERO SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <Animated.View style={[detailStyles.scoreHero, { opacity: fadeAnim }]}>
          {/* Home Team */}
          <View style={detailStyles.heroTeam}>
            {homeLogo && <Image source={{ uri: homeLogo }} style={detailStyles.heroTeamLogo} />}
            <Text style={detailStyles.heroTeamName} numberOfLines={2}>{homeName}</Text>
          </View>

          {/* Score Center */}
          <View style={detailStyles.heroScoreCenter}>
            {isLive ? (
              <>
                <Text style={[detailStyles.heroScore, isCritical && { color: COLORS.critical }]}>
                  {homeScore} - {awayScore}
                </Text>
                <View style={[detailStyles.heroLiveBadge, isCritical && { backgroundColor: COLORS.criticalGlow }]}>
                  <View style={[detailStyles.heroLiveDot, isCritical && { backgroundColor: COLORS.critical }]} />
                  <Text style={[detailStyles.heroLiveText, isCritical && { color: COLORS.critical }]}>
                    {match.statusText || `${match.minute}'`}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={detailStyles.heroTime}>{match.time || 'TBD'}</Text>
                <Text style={detailStyles.heroDate}>Bugün</Text>
              </>
            )}
          </View>

          {/* Away Team */}
          <View style={[detailStyles.heroTeam, { alignItems: 'flex-end' }]}>
            {awayLogo && <Image source={{ uri: awayLogo }} style={detailStyles.heroTeamLogo} />}
            <Text style={[detailStyles.heroTeamName, { textAlign: 'right' }]} numberOfLines={2}>{awayName}</Text>
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* QUICK STATS BAR */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {stats && (
          <View style={detailStyles.quickStatsBar}>
            <View style={detailStyles.quickStatItem}>
              <Text style={detailStyles.quickStatValue}>{stats[0]?.home || 50}%</Text>
              <Text style={detailStyles.quickStatLabel}>Top</Text>
            </View>
            <View style={detailStyles.quickStatDivider} />
            <View style={detailStyles.quickStatItem}>
              <Text style={detailStyles.quickStatValue}>{stats[1]?.home || 0}</Text>
              <Text style={detailStyles.quickStatLabel}>Şut</Text>
            </View>
            <View style={detailStyles.quickStatDivider} />
            <View style={detailStyles.quickStatItem}>
              <Text style={detailStyles.quickStatValue}>{stats[3]?.home || 0}</Text>
              <Text style={detailStyles.quickStatLabel}>Korner</Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* AI ANALYSIS SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <Section
          title="AI ANALİZ"
          icon="sparkles"
          expanded={expandedSections.ai}
          onToggle={() => toggleSection('ai')}
          badge={aiAnalysis ? 'AI' : null}
        >
          {aiLoading && (
            <View style={detailStyles.aiLoadingBox}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={detailStyles.aiLoadingText}>Claude AI analiz ediyor...</Text>
            </View>
          )}

          {/* Win Probability */}
          <View style={detailStyles.probContainer}>
            <View style={detailStyles.probBar}>
              <View style={[detailStyles.probFillHome, { width: `${analysisDisplay.homeWinProb}%` }]} />
              <View style={[detailStyles.probFillDraw, { width: `${analysisDisplay.drawProb}%` }]} />
              <View style={[detailStyles.probFillAway, { width: `${analysisDisplay.awayWinProb}%` }]} />
            </View>
            <View style={detailStyles.probLabels}>
              <View style={detailStyles.probLabelItem}>
                <Text style={[detailStyles.probValue, { color: COLORS.accent }]}>{analysisDisplay.homeWinProb}%</Text>
                <Text style={detailStyles.probLabel}>EV SAHİBİ</Text>
              </View>
              <View style={detailStyles.probLabelItem}>
                <Text style={detailStyles.probValue}>{analysisDisplay.drawProb}%</Text>
                <Text style={detailStyles.probLabel}>BERABERE</Text>
              </View>
              <View style={detailStyles.probLabelItem}>
                <Text style={[detailStyles.probValue, { color: COLORS.gray400 }]}>{analysisDisplay.awayWinProb}%</Text>
                <Text style={detailStyles.probLabel}>DEPLASMAN</Text>
              </View>
            </View>
          </View>

          {/* Confidence */}
          <View style={detailStyles.confidenceRow}>
            <Text style={detailStyles.confidenceLabel}>AI GÜVEN</Text>
            <View style={detailStyles.confidenceBar}>
              <View style={[detailStyles.confidenceFill, { width: `${analysisDisplay.confidence * 10}%` }]} />
            </View>
            <Text style={detailStyles.confidenceValue}>{analysisDisplay.confidence}/10</Text>
          </View>

          {/* Quick Betting Stats */}
          <View style={detailStyles.bettingStats}>
            <View style={detailStyles.bettingStatBox}>
              <Text style={detailStyles.bettingStatValue}>{analysisDisplay.expectedGoals}</Text>
              <Text style={detailStyles.bettingStatLabel}>BEK. GOL</Text>
            </View>
            <View style={detailStyles.bettingStatBox}>
              <Text style={detailStyles.bettingStatValue}>{analysisDisplay.bttsProb}%</Text>
              <Text style={detailStyles.bettingStatLabel}>KG VAR</Text>
            </View>
            <View style={detailStyles.bettingStatBox}>
              <Text style={detailStyles.bettingStatValue}>{analysisDisplay.over25Prob}%</Text>
              <Text style={detailStyles.bettingStatLabel}>2.5 ÜST</Text>
            </View>
          </View>

          {/* Advice */}
          {analysisDisplay.advice && (
            <View style={detailStyles.adviceBox}>
              <Ionicons name="bulb" size={16} color={COLORS.accent} />
              <Text style={detailStyles.adviceText}>{analysisDisplay.advice}</Text>
            </View>
          )}

          {/* Factors */}
          {analysisDisplay.factors?.length > 0 && (
            <View style={detailStyles.factorsContainer}>
              {analysisDisplay.factors.map((factor, idx) => (
                <View key={idx} style={detailStyles.factorRow}>
                  <Ionicons
                    name={factor.positive ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={factor.positive ? COLORS.accent : COLORS.warning}
                  />
                  <Text style={detailStyles.factorText}>{factor.text}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* STATISTICS SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <Section
          title="İSTATİSTİKLER"
          icon="stats-chart"
          expanded={expandedSections.stats}
          onToggle={() => toggleSection('stats')}
        >
          {statsDisplay.map((stat, index) => (
            <StatBar key={index} label={stat.label} home={stat.home} away={stat.away} isPercent={stat.isPercent} />
          ))}
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* H2H SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <Section
          title="KARŞILAŞMA GEÇMİŞİ"
          icon="git-compare"
          expanded={expandedSections.h2h}
          onToggle={() => toggleSection('h2h')}
        >
          {/* H2H Summary */}
          <View style={detailStyles.h2hSummary}>
            <View style={detailStyles.h2hSummaryItem}>
              <Text style={[detailStyles.h2hSummaryValue, { color: COLORS.accent }]}>{h2hDisplay.homeWins}</Text>
              <Text style={detailStyles.h2hSummaryLabel}>{homeShort}</Text>
            </View>
            <View style={detailStyles.h2hSummaryItem}>
              <Text style={detailStyles.h2hSummaryValue}>{h2hDisplay.draws}</Text>
              <Text style={detailStyles.h2hSummaryLabel}>BERABERE</Text>
            </View>
            <View style={detailStyles.h2hSummaryItem}>
              <Text style={[detailStyles.h2hSummaryValue, { color: COLORS.gray400 }]}>{h2hDisplay.awayWins}</Text>
              <Text style={detailStyles.h2hSummaryLabel}>{awayShort}</Text>
            </View>
          </View>

          {/* Recent Matches */}
          {h2hDisplay.recentMatches.length > 0 ? (
            h2hDisplay.recentMatches.map((m, idx) => (
              <View key={idx} style={detailStyles.h2hMatchRow}>
                <Text style={detailStyles.h2hMatchDate}>{m.date}</Text>
                <View style={detailStyles.h2hMatchTeams}>
                  <Text style={detailStyles.h2hMatchTeamName} numberOfLines={1}>{m.homeName}</Text>
                  <Text style={detailStyles.h2hMatchScore}>{m.homeScore} - {m.awayScore}</Text>
                  <Text style={[detailStyles.h2hMatchTeamName, { textAlign: 'right' }]} numberOfLines={1}>{m.awayName}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={detailStyles.noDataText}>H2H verisi bulunamadı</Text>
          )}
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* LINEUPS SECTION */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <Section
          title="KADROLAR"
          icon="people"
          expanded={expandedSections.lineups}
          onToggle={() => toggleSection('lineups')}
        >
          {lineupsDisplay.home.players.length > 0 ? (
            <View style={detailStyles.lineupsContainer}>
              {/* Home */}
              <View style={detailStyles.lineupColumn}>
                <Text style={detailStyles.lineupFormation}>{lineupsDisplay.home.formation}</Text>
                {lineupsDisplay.home.coach && (
                  <Text style={detailStyles.lineupCoach}>{lineupsDisplay.home.coach}</Text>
                )}
                {lineupsDisplay.home.players.slice(0, 11).map((player, idx) => (
                  <Text key={idx} style={detailStyles.lineupPlayer}>{idx + 1}. {player}</Text>
                ))}
              </View>
              {/* Away */}
              <View style={[detailStyles.lineupColumn, { alignItems: 'flex-end' }]}>
                <Text style={detailStyles.lineupFormation}>{lineupsDisplay.away.formation}</Text>
                {lineupsDisplay.away.coach && (
                  <Text style={[detailStyles.lineupCoach, { textAlign: 'right' }]}>{lineupsDisplay.away.coach}</Text>
                )}
                {lineupsDisplay.away.players.slice(0, 11).map((player, idx) => (
                  <Text key={idx} style={[detailStyles.lineupPlayer, { textAlign: 'right' }]}>{player} .{idx + 1}</Text>
                ))}
              </View>
            </View>
          ) : (
            <Text style={detailStyles.noDataText}>Kadro bilgisi henüz açıklanmadı</Text>
          )}
        </Section>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MATCH DETAIL STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const detailStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
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
    marginHorizontal: 12,
  },
  headerLeagueLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  headerLeagueName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Score Hero
  scoreHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  heroTeam: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroTeamLogo: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  heroTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    maxWidth: 100,
  },
  heroScoreCenter: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heroScore: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  heroTime: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  heroDate: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 4,
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
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.liveRed,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Quick Stats Bar
  quickStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  quickStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },

  // Section
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Stats
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    width: 40,
    fontSize: 14,
    fontWeight: '700',
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
    marginBottom: 4,
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
  },

  // AI Analysis
  aiLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiLoadingText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  probContainer: {
    marginBottom: 16,
  },
  probBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  probFillHome: {
    backgroundColor: COLORS.accent,
  },
  probFillDraw: {
    backgroundColor: COLORS.gray500,
  },
  probFillAway: {
    backgroundColor: COLORS.gray600,
  },
  probLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  probLabelItem: {
    alignItems: 'center',
  },
  probValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  probLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
    width: 70,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.gray700,
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    width: 40,
    textAlign: 'right',
  },
  bettingStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  bettingStatBox: {
    flex: 1,
    backgroundColor: COLORS.cardElevated,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  bettingStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  bettingStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.accentDim,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.white,
    lineHeight: 18,
  },
  factorsContainer: {
    gap: 8,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray400,
  },

  // H2H
  h2hSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  h2hSummaryItem: {
    alignItems: 'center',
  },
  h2hSummaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  h2hSummaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  h2hMatchRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  h2hMatchDate: {
    fontSize: 11,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  h2hMatchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  h2hMatchTeamName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.white,
  },
  h2hMatchScore: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    paddingHorizontal: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Lineups
  lineupsContainer: {
    flexDirection: 'row',
  },
  lineupColumn: {
    flex: 1,
  },
  lineupFormation: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  lineupCoach: {
    fontSize: 11,
    color: COLORS.gray500,
    marginBottom: 12,
  },
  lineupPlayer: {
    fontSize: 12,
    color: COLORS.gray400,
    paddingVertical: 4,
  },

  // Misc
  noDataText: {
    fontSize: 13,
    color: COLORS.gray600,
    textAlign: 'center',
    paddingVertical: 16,
  },
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
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE MATCH DETAIL SCREEN - Canlı Maç Detay (Halı Saha + Olaylar + İstatistik)
// ═══════════════════════════════════════════════════════════════════════════════

// Formasyon pozisyon mapping'i
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

// Default formasyon pozisyonları
const getFormationPositions = (formation) => {
  return FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-4-2'];
};

// FootballPitch Bileşeni
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
          liveDetailStyles.pitchPlayer,
          {
            left: `${adjustedX}%`,
            top: `${adjustedY}%`,
            backgroundColor: isHome ? homeTeamColor : awayTeamColor,
          }
        ]}
      >
        <Text style={liveDetailStyles.pitchPlayerNumber}>
          {player?.player?.number || index + 1}
        </Text>
      </View>
    );
  };

  return (
    <View style={liveDetailStyles.pitchContainer}>
      <View style={liveDetailStyles.pitchField}>
        {/* Orta çizgi */}
        <View style={liveDetailStyles.pitchCenterLine} />
        {/* Orta daire */}
        <View style={liveDetailStyles.pitchCenterCircle} />
        {/* Ev sahibi ceza sahası (alt) */}
        <View style={[liveDetailStyles.pitchPenaltyArea, { bottom: 0 }]} />
        <View style={[liveDetailStyles.pitchGoalArea, { bottom: 0 }]} />
        {/* Deplasman ceza sahası (üst) */}
        <View style={[liveDetailStyles.pitchPenaltyArea, { top: 0 }]} />
        <View style={[liveDetailStyles.pitchGoalArea, { top: 0 }]} />

        {/* Ev sahibi oyuncular */}
        {homeLineup?.startXI?.map((p, i) => renderPlayer(p, i, homePositions, true))}

        {/* Deplasman oyuncular */}
        {awayLineup?.startXI?.map((p, i) => renderPlayer(p, i, awayPositions, false))}
      </View>

      {/* Formasyon etiketleri */}
      <View style={liveDetailStyles.formationLabels}>
        <View style={liveDetailStyles.formationLabel}>
          <View style={[liveDetailStyles.formationDot, { backgroundColor: homeTeamColor }]} />
          <Text style={liveDetailStyles.formationText}>{homeFormation}</Text>
        </View>
        <View style={liveDetailStyles.formationLabel}>
          <View style={[liveDetailStyles.formationDot, { backgroundColor: awayTeamColor }]} />
          <Text style={liveDetailStyles.formationText}>{awayFormation}</Text>
        </View>
      </View>
    </View>
  );
};

// Event Item Bileşeni
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
    <View style={[liveDetailStyles.eventItem, isHome ? {} : { flexDirection: 'row-reverse' }]}>
      <View style={[liveDetailStyles.eventIconContainer, { backgroundColor: `${getEventColor()}20` }]}>
        <Text style={liveDetailStyles.eventIcon}>{getEventIcon()}</Text>
      </View>
      <View style={[liveDetailStyles.eventContent, isHome ? {} : { alignItems: 'flex-end' }]}>
        <Text style={liveDetailStyles.eventMinute}>
          {minute}'{extraTime ? `+${extraTime}` : ''}
        </Text>
        <Text style={liveDetailStyles.eventPlayer}>{event.player?.name || 'Oyuncu'}</Text>
        {event.assist?.name && (
          <Text style={liveDetailStyles.eventAssist}>
            {event.type === 'subst' ? `↓ ${event.assist.name}` : `(${event.assist.name})`}
          </Text>
        )}
      </View>
    </View>
  );
};

const LiveMatchDetailScreen = ({ match, onBack }) => {
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
  const leagueLogo = isApiData ? match.league?.logo : null;
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
      console.error('Live data fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchLiveData(true);
    // 30 saniyede bir güncelle (sadece maç devam ediyorsa)
    const interval = setInterval(() => {
      if (!isFinished) {
        fetchLiveData(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fixtureId]);

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
      <View style={liveDetailStyles.statRow}>
        <Text style={liveDetailStyles.statValue}>{home || 0}{isPercent ? '%' : ''}</Text>
        <View style={liveDetailStyles.statBarContainer}>
          <View style={liveDetailStyles.statBar}>
            <View style={[liveDetailStyles.statBarFill, { width: `${homePercent}%` }]} />
          </View>
          <Text style={liveDetailStyles.statLabel}>{label}</Text>
        </View>
        <Text style={[liveDetailStyles.statValue, { textAlign: 'right' }]}>{away || 0}{isPercent ? '%' : ''}</Text>
      </View>
    );
  };

  // Loading State
  if (loading) {
    return (
      <View style={[styles.screen, liveDetailStyles.loadingContainer]}>
        <View style={liveDetailStyles.loadingPulse}>
          <Ionicons name="football" size={32} color={COLORS.accent} />
        </View>
        <Text style={liveDetailStyles.loadingText}>Canlı maç yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <Animated.View style={[liveDetailStyles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity style={liveDetailStyles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={liveDetailStyles.headerCenter}>
          {leagueLogo && <Image source={{ uri: leagueLogo }} style={liveDetailStyles.headerLeagueLogo} />}
          <Text style={liveDetailStyles.headerLeagueName} numberOfLines={1}>{leagueName}</Text>
        </View>
        <TouchableOpacity style={liveDetailStyles.favBtn}>
          <Ionicons name="bookmark-outline" size={22} color={COLORS.gray400} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={liveDetailStyles.scrollContent}
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
        <Animated.View style={[liveDetailStyles.scoreHero, { opacity: fadeAnim }]}>
          {/* Home Team */}
          <View style={liveDetailStyles.heroTeam}>
            {homeLogo && <Image source={{ uri: homeLogo }} style={liveDetailStyles.heroTeamLogo} />}
            <Text style={liveDetailStyles.heroTeamName}>{homeShort}</Text>
          </View>

          {/* Score Center */}
          <View style={liveDetailStyles.heroScoreCenter}>
            <Text style={[liveDetailStyles.heroScore, isCritical && { color: COLORS.critical }]}>
              {currentScore.home} - {currentScore.away}
            </Text>
            {isLive ? (
              <View style={[liveDetailStyles.heroLiveBadge, isCritical && { backgroundColor: COLORS.criticalGlow }]}>
                <Animated.View style={[liveDetailStyles.heroLiveDot, { transform: [{ scale: pulseAnim }] }, isCritical && { backgroundColor: COLORS.critical }]} />
                <Text style={[liveDetailStyles.heroLiveText, isCritical && { color: COLORS.critical }]}>
                  {statusText}
                </Text>
              </View>
            ) : isFinished ? (
              <View style={liveDetailStyles.heroFinishedBadge}>
                <Text style={liveDetailStyles.heroFinishedText}>Maç Sona Erdi</Text>
              </View>
            ) : (
              <Text style={liveDetailStyles.heroStatusText}>{statusText}</Text>
            )}
            {lastUpdated && (
              <Text style={liveDetailStyles.lastUpdatedText}>
                Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            )}
          </View>

          {/* Away Team */}
          <View style={[liveDetailStyles.heroTeam, { alignItems: 'flex-end' }]}>
            {awayLogo && <Image source={{ uri: awayLogo }} style={liveDetailStyles.heroTeamLogo} />}
            <Text style={liveDetailStyles.heroTeamName}>{awayShort}</Text>
          </View>
        </Animated.View>

        {/* Football Pitch - Lineup Visualization */}
        {lineups && (
          <View style={liveDetailStyles.section}>
            <Text style={liveDetailStyles.sectionTitle}>KADRO DİZİLİŞİ</Text>
            <FootballPitch homeLineup={lineups.home} awayLineup={lineups.away} />
          </View>
        )}

        {/* Events Timeline */}
        {events.length > 0 && (
          <View style={liveDetailStyles.section}>
            <Text style={liveDetailStyles.sectionTitle}>MAÇ OLAYLARI</Text>
            <View style={liveDetailStyles.eventsContainer}>
              {events.slice(0, 10).map((event, index) => (
                <EventItem key={index} event={event} homeTeamId={homeTeamId} />
              ))}
            </View>
          </View>
        )}

        {/* Stats Section */}
        {stats && (
          <View style={liveDetailStyles.section}>
            <Text style={liveDetailStyles.sectionTitle}>İSTATİSTİKLER</Text>
            <View style={liveDetailStyles.statsContainer}>
              <View style={liveDetailStyles.statsHeader}>
                <Text style={liveDetailStyles.statsHeaderTeam}>{homeShort}</Text>
                <Text style={liveDetailStyles.statsHeaderTeam}>{awayShort}</Text>
              </View>
              {stats.map((stat, index) => (
                <StatBar key={index} {...stat} />
              ))}
            </View>
          </View>
        )}

        {/* Empty Events State */}
        {events.length === 0 && !loading && (
          <View style={liveDetailStyles.emptyEvents}>
            <Ionicons name="time-outline" size={32} color={COLORS.gray600} />
            <Text style={liveDetailStyles.emptyEventsText}>Henüz maç olayı yok</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// Live Detail Styles
const liveDetailStyles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
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
    color: COLORS.gray600,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS SCREEN - Analiz
// ═══════════════════════════════════════════════════════════════════════════════
const AnalysisScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const periods = [
    { id: 'week', label: 'HAFTA' },
    { id: 'month', label: 'AY' },
    { id: 'all', label: 'TÜMÜ' },
  ];

  // Mock AI Performance Data
  const aiPerformance = {
    totalPredictions: 156,
    correct: 106,
    accuracy: 68,
    homeWinAccuracy: 72,
    drawAccuracy: 45,
    awayWinAccuracy: 64,
    over25Accuracy: 71,
    bttsAccuracy: 65,
  };

  // Recent Predictions
  const recentPredictions = [
    {
      id: '1',
      home: 'Arsenal',
      away: 'Chelsea',
      prediction: 'EV',
      actual: '2-1',
      correct: true,
      confidence: 7.8,
      date: '27 Kas',
    },
    {
      id: '2',
      home: 'Barcelona',
      away: 'Atletico',
      prediction: 'EV',
      actual: '1-1',
      correct: false,
      confidence: 6.5,
      date: '26 Kas',
    },
    {
      id: '3',
      home: 'Bayern',
      away: 'Leipzig',
      prediction: 'EV',
      actual: '3-0',
      correct: true,
      confidence: 8.2,
      date: '26 Kas',
    },
    {
      id: '4',
      home: 'PSG',
      away: 'Lyon',
      prediction: '2.5Ü',
      actual: '4-1',
      correct: true,
      confidence: 7.5,
      date: '25 Kas',
    },
    {
      id: '5',
      home: 'Milan',
      away: 'Napoli',
      prediction: 'X',
      actual: '0-0',
      correct: true,
      confidence: 5.8,
      date: '25 Kas',
    },
  ];

  // League Performance
  const leaguePerformance = [
    { league: 'Premier League', accuracy: 72, predictions: 42 },
    { league: 'La Liga', accuracy: 65, predictions: 38 },
    { league: 'Bundesliga', accuracy: 74, predictions: 32 },
    { league: 'Serie A', accuracy: 61, predictions: 28 },
    { league: 'Süper Lig', accuracy: 68, predictions: 16 },
  ];

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenContent}
    >
      {/* Header */}
      <Animated.View style={[styles.analysisHeader, { opacity: fadeAnim }]}>
        <Text style={styles.analysisTitle}>AI Analiz</Text>
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodBtn,
                selectedPeriod === period.id && styles.periodBtnActive,
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text
                style={[
                  styles.periodBtnText,
                  selectedPeriod === period.id && styles.periodBtnTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Main Stats */}
      <Animated.View style={[styles.analysisMainStats, { opacity: fadeAnim }]}>
        <View style={styles.analysisAccuracyCircle}>
          <Text style={styles.analysisAccuracyValue}>{aiPerformance.accuracy}%</Text>
          <Text style={styles.analysisAccuracyLabel}>BAŞARI</Text>
        </View>
        <View style={styles.analysisSubStats}>
          <View style={styles.analysisSubStatItem}>
            <Text style={styles.analysisSubStatValue}>{aiPerformance.totalPredictions}</Text>
            <Text style={styles.analysisSubStatLabel}>TAHMİN</Text>
          </View>
          <View style={styles.analysisSubStatItem}>
            <Text style={[styles.analysisSubStatValue, { color: COLORS.accent }]}>
              {aiPerformance.correct}
            </Text>
            <Text style={styles.analysisSubStatLabel}>DOĞRU</Text>
          </View>
        </View>
      </Animated.View>

      {/* Category Accuracy */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.sectionTitle}>KATEGORİ BAŞARI ORANLARI</Text>
        <View style={styles.categoryGrid}>
          {[
            { label: 'Ev Kazanır', value: aiPerformance.homeWinAccuracy },
            { label: 'Beraberlik', value: aiPerformance.drawAccuracy },
            { label: 'Dep. Kazanır', value: aiPerformance.awayWinAccuracy },
            { label: '2.5 Üst', value: aiPerformance.over25Accuracy },
          ].map((cat, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryBarBg}>
                <View
                  style={[
                    styles.categoryBarFill,
                    { height: `${cat.value}%` },
                    cat.value >= 70 && styles.categoryBarHigh,
                    cat.value < 50 && styles.categoryBarLow,
                  ]}
                />
              </View>
              <Text style={styles.categoryValue}>{cat.value}%</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* League Performance */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>LİG PERFORMANSI</Text>
        <View style={styles.leagueList}>
          {leaguePerformance.map((league, index) => (
            <View key={index} style={styles.leagueItem}>
              <View style={styles.leagueInfo}>
                <Text style={styles.leagueName}>{league.league}</Text>
                <Text style={styles.leaguePredictions}>{league.predictions} tahmin</Text>
              </View>
              <View style={styles.leagueBarContainer}>
                <View style={[styles.leagueBar, { width: `${league.accuracy}%` }]} />
              </View>
              <Text
                style={[
                  styles.leagueAccuracy,
                  league.accuracy >= 70 && styles.leagueAccuracyHigh,
                ]}
              >
                {league.accuracy}%
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Recent Predictions */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>SON TAHMİNLER</Text>
        {recentPredictions.map((pred) => (
          <View key={pred.id} style={styles.predictionRow}>
            <View style={styles.predictionInfo}>
              <Text style={styles.predictionTeams}>
                {pred.home} vs {pred.away}
              </Text>
              <Text style={styles.predictionDate}>{pred.date}</Text>
            </View>
            <View style={styles.predictionResult}>
              <View
                style={[
                  styles.predictionBadge,
                  pred.correct ? styles.predictionBadgeCorrect : styles.predictionBadgeWrong,
                ]}
              >
                <Text style={styles.predictionBadgeText}>{pred.prediction}</Text>
              </View>
              <Text style={styles.predictionActual}>{pred.actual}</Text>
            </View>
            <View style={styles.predictionStatus}>
              <Ionicons
                name={pred.correct ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={pred.correct ? COLORS.accent : COLORS.danger}
              />
            </View>
          </View>
        ))}
      </Animated.View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM TAB BAR
// ═══════════════════════════════════════════════════════════════════════════════
const BottomTabBar = ({ activeTab, onTabPress }) => {
  const tabs = [
    { id: 'home', icon: 'grid-outline', activeIcon: 'grid', label: 'Ana' },
    { id: 'live', icon: 'radio-outline', activeIcon: 'radio', label: 'Canlı' },
    { id: 'analysis', icon: 'analytics-outline', activeIcon: 'analytics', label: 'Analiz' },
    { id: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profil' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, isActive && styles.tabIconActive]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? COLORS.accent : COLORS.gray600}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE SCREEN - Profil
// ═══════════════════════════════════════════════════════════════════════════════
const ProfileScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // User Stats
  const userStats = {
    savedMatches: 12,
    favoriteTeams: 5,
    notifications: 24,
    memberSince: 'Kasım 2024',
  };

  // Favorite Teams
  const favoriteTeams = [
    { id: '1', name: 'Real Madrid', short: 'RMA' },
    { id: '2', name: 'Manchester City', short: 'MCI' },
    { id: '3', name: 'Bayern München', short: 'BAY' },
  ];

  // Menu Items
  const menuItems = [
    { icon: 'bookmark-outline', label: 'Kayıtlı Maçlar', value: `${userStats.savedMatches} maç` },
    { icon: 'heart-outline', label: 'Favori Takımlar', value: `${userStats.favoriteTeams} takım` },
    { icon: 'time-outline', label: 'Geçmiş Tahminler', value: 'Görüntüle' },
    { icon: 'stats-chart-outline', label: 'İstatistik Tercihleri', value: '' },
  ];

  const settingsItems = [
    { icon: 'notifications-outline', label: 'Bildirimler', toggle: true, value: notifications, onToggle: setNotifications },
    { icon: 'flash-outline', label: 'Canlı Uyarılar', toggle: true, value: liveAlerts, onToggle: setLiveAlerts },
    { icon: 'moon-outline', label: 'Karanlık Mod', toggle: true, value: darkMode, onToggle: setDarkMode },
    { icon: 'language-outline', label: 'Dil', value: 'Türkçe' },
  ];

  const renderToggle = (value, onToggle) => (
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={() => onToggle(!value)}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenContent}
    >
      {/* Header */}
      <Animated.View style={[styles.profileHeader, { opacity: fadeAnim }]}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={32} color={COLORS.gray600} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Kullanıcı</Text>
          <Text style={styles.profileMember}>Üye: {userStats.memberSince}</Text>
        </View>
        <TouchableOpacity style={styles.profileEditBtn}>
          <Ionicons name="settings-outline" size={20} color={COLORS.gray400} />
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Stats */}
      <Animated.View style={[styles.profileStatsRow, { opacity: fadeAnim }]}>
        <View style={styles.profileStatBox}>
          <Text style={styles.profileStatValue}>{userStats.savedMatches}</Text>
          <Text style={styles.profileStatLabel}>KAYITLI</Text>
        </View>
        <View style={styles.profileStatBox}>
          <Text style={styles.profileStatValue}>{userStats.favoriteTeams}</Text>
          <Text style={styles.profileStatLabel}>FAVORİ</Text>
        </View>
        <View style={styles.profileStatBox}>
          <Text style={styles.profileStatValue}>{userStats.notifications}</Text>
          <Text style={styles.profileStatLabel}>BİLDİRİM</Text>
        </View>
      </Animated.View>

      {/* Favorite Teams */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.sectionTitle}>FAVORİ TAKIMLAR</Text>
        <View style={styles.favoriteTeamsRow}>
          {favoriteTeams.map((team) => (
            <View key={team.id} style={styles.favoriteTeamBadge}>
              <Text style={styles.favoriteTeamShort}>{team.short}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.addTeamBtn}>
            <Ionicons name="add" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Menu */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>MENÜ</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={20} color={COLORS.gray400} />
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.value && <Text style={styles.menuItemValue}>{item.value}</Text>}
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray700} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Settings */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>AYARLAR</Text>
        <View style={styles.menuCard}>
          {settingsItems.map((item, index) => (
            <View
              key={index}
              style={[
                styles.menuItem,
                index === settingsItems.length - 1 && styles.menuItemLast,
              ]}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={20} color={COLORS.gray400} />
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.toggle ? (
                  renderToggle(item.value, item.onToggle)
                ) : (
                  <>
                    <Text style={styles.menuItemValue}>{item.value}</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.gray700} />
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* App Info */}
      <Animated.View style={[styles.appInfo, { opacity: fadeAnim }]}>
        <Text style={styles.appInfoText}>AI Maç Analiz v1.0.0</Text>
        <Text style={styles.appInfoSub}>© 2024 Tüm Hakları Saklıdır</Text>
      </Animated.View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [liveDetailMatch, setLiveDetailMatch] = useState(null);

  // AI Analiz için (MatchAnalysisScreen)
  const handleMatchPress = (match) => {
    setSelectedMatch(match);
  };

  const handleBackPress = () => {
    setSelectedMatch(null);
  };

  // Canlı Takip için (LiveMatchDetailScreen)
  const handleLiveMatchPress = (match) => {
    setLiveDetailMatch(match);
  };

  const handleLiveDetailBack = () => {
    setLiveDetailMatch(null);
  };

  const renderScreen = () => {
    // Canlı maç detay sayfası (halı saha + olaylar)
    if (liveDetailMatch) {
      return <LiveMatchDetailScreen match={liveDetailMatch} onBack={handleLiveDetailBack} />;
    }

    // AI Analiz sayfası
    if (selectedMatch) {
      return <MatchAnalysisScreen match={selectedMatch} onBack={handleBackPress} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onMatchPress={handleMatchPress} />;
      case 'live':
        return <LiveScreen onMatchPress={handleMatchPress} onLiveMatchPress={handleLiveMatchPress} />;
      case 'analysis':
        return <AnalysisScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onMatchPress={handleMatchPress} />;
    }
  };

  const isDetailScreen = selectedMatch || liveDetailMatch;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        {renderScreen()}
        {!isDetailScreen && <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenContent: {
    paddingHorizontal: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 16,
    letterSpacing: 1,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.warning,
    marginLeft: 8,
    flex: 1,
  },

  // No Matches
  noMatchesBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noMatchesText: {
    fontSize: 14,
    color: COLORS.gray600,
    marginTop: 12,
  },

  // League Row
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leagueLogo: {
    width: 16,
    height: 16,
    marginRight: 8,
  },

  // Team Logo
  teamLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },

  // Live Score
  liveScore: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },

  // Live Indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  liveText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
    letterSpacing: 1,
  },

  // Match Row Updates
  matchTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  matchTeamLogo: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  matchScore: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: 'auto',
  },
  matchLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  matchLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.danger,
    marginRight: 4,
  },
  matchLiveMin: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    marginBottom: 24,
  },
  headerDate: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // BÜLTEN STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  bultenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  bultenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  bultenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  bultenHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 8,
    position: 'relative',
  },
  calendarIcon: {
    position: 'relative',
  },
  calendarDay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontSize: 7,
    fontWeight: '700',
    color: COLORS.bg,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Date Tabs
  dateTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  dateTab: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateTabActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  dateTabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray500,
    marginBottom: 2,
  },
  dateTabLabelActive: {
    color: COLORS.accent,
  },
  dateTabDate: {
    fontSize: 11,
    color: COLORS.gray600,
  },
  dateTabDateActive: {
    color: COLORS.accent,
  },

  // Current Date Bar
  currentDateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  currentDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '85%',
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  datePickerList: {
    paddingVertical: 8,
  },
  datePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datePickerItemActive: {
    backgroundColor: COLORS.accentDim,
  },
  datePickerItemLeft: {
    flex: 1,
  },
  datePickerItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  datePickerItemLabelActive: {
    color: COLORS.accent,
  },
  datePickerItemDate: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  datePickerItemDateActive: {
    color: COLORS.accent,
  },

  // Filter Panel - Bottom Sheet
  filterPanelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  filterPanelDismiss: {
    flex: 0.4,
  },
  filterPanelContent: {
    flex: 0.6,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  filterPanelHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  filterPanelHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray600,
    borderRadius: 2,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  filterPanelScroll: {
    flex: 1,
  },
  filterPanelBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  filterPanelFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterLabel: {
    fontSize: 15,
    color: COLORS.white,
    marginLeft: 12,
  },
  filterLeagueBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLeagueBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLeagueBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 8,
  },
  filterLeagueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
    marginLeft: 8,
  },
  applyFiltersBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
  },
  applyFiltersBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // League Selector
  leagueListContainer: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  leagueSelectorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  leagueSelectorActionBtn: {
    paddingVertical: 4,
  },
  leagueSelectorActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  leagueSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leagueSelectorItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leagueSelectorFlag: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray800,
    marginRight: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueSelectorFlagImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  leagueSelectorName: {
    fontSize: 14,
    color: COLORS.white,
    flex: 1,
  },
  leagueSelectorCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueSelectorCheckboxActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
    padding: 0,
    height: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  searchClearBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: 'transparent',
    borderColor: COLORS.accent,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray500,
  },
  filterTextActive: {
    color: COLORS.accent,
  },

  // Matches Scroll
  matchesScroll: {
    flex: 1,
  },

  // League Section
  leagueSection: {
    marginBottom: 8,
    marginHorizontal: 16,
  },
  leagueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bultenLeagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bultenFlagContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray800,
    marginRight: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bultenFlag: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bultenFlagPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bultenLeagueName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
    marginRight: 8,
  },
  leagueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchCount: {
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: '500',
  },

  // Match Card
  matchesList: {
    backgroundColor: COLORS.card,
    marginTop: 2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  matchTimeCol: {
    width: 50,
    marginRight: 12,
  },
  matchTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  liveTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
    marginRight: 4,
  },
  liveTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  teamsCol: {
    flex: 1,
    marginRight: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  teamLogoContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray800,
    marginRight: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoSmall: {
    width: 24,
    height: 24,
  },
  teamNameText: {
    fontSize: 14,
    color: COLORS.white,
    flex: 1,
  },
  predictionCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 50,
    justifyContent: 'flex-end',
  },
  predictionPercent: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 2,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    borderRadius: 2,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
  },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },

  // Section
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray500,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  sectionCount: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
  },

  // Featured Card
  featuredCard: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featuredLeague: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featuredTime: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray400,
  },
  featuredTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featuredTeam: {
    flex: 1,
  },
  featuredTeamRight: {
    alignItems: 'flex-end',
  },
  teamShort: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -2,
  },
  teamName: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  vsBox: {
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 12,
    color: COLORS.gray700,
    fontWeight: '600',
  },

  // Probability
  probContainer: {
    marginBottom: 20,
  },
  probBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: COLORS.gray800,
  },
  probFill: {
    height: '100%',
  },
  probHome: {
    backgroundColor: COLORS.accent,
  },
  probDraw: {
    backgroundColor: COLORS.gray600,
  },
  probAway: {
    backgroundColor: COLORS.gray400,
  },
  probLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  probText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray400,
  },

  // AI Comment
  aiCommentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.accentDim,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  aiIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  aiComment: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray100,
    lineHeight: 20,
  },

  // Confidence
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    letterSpacing: 1,
    width: 70,
  },
  confidenceBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray800,
    borderRadius: 2,
    marginHorizontal: 12,
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  confidenceValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
    width: 30,
    textAlign: 'right',
  },

  // Match Row
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  matchTime: {
    width: 65,
  },
  matchTimeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
  },
  matchLeague: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: COLORS.gray600,
    marginTop: 2,
  },
  matchTeams: {
    flex: 1,
    paddingHorizontal: 12,
  },
  matchTeamText: {
    fontSize: 14,
    color: COLORS.gray100,
    fontWeight: '500',
  },
  matchVs: {
    fontSize: 11,
    color: COLORS.gray700,
    marginVertical: 2,
  },
  matchAi: {
    width: 50,
    alignItems: 'flex-end',
  },
  matchAiText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  matchAiHigh: {
    color: COLORS.accent,
  },

  // Trends
  trendsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  trendBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
    marginRight: 8,
  },
  trendTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  trendTeam: {
    fontSize: 13,
    color: COLORS.gray100,
  },
  trendStreak: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '600',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabIconActive: {
    backgroundColor: COLORS.accentDim,
  },
  tabLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },

  // Placeholder
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 16,
  },
  placeholderSub: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIVE SCREEN STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 24,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveHeaderTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  liveCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    marginRight: 6,
  },
  liveDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.danger,
    marginRight: 5,
  },
  liveCountText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Live Card
  liveCard: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveCardLeague: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveLeagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveLeagueLogo: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  liveTeamLogo: {
    width: 32,
    height: 32,
    marginBottom: 6,
  },
  liveMinuteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveMinuteText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },

  // Score Section
  liveScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveTeamCol: {
    flex: 1,
  },
  liveTeamColRight: {
    alignItems: 'flex-end',
  },
  liveTeamShort: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  liveTeamName: {
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 2,
  },
  liveScoreBox: {
    paddingHorizontal: 20,
  },
  liveScoreText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },

  // Events
  liveEventsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  liveEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray800,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  liveEventIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  liveEventText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray400,
  },

  // Stats
  liveStatsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  liveStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveStatValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray400,
    width: 30,
    textAlign: 'center',
  },
  liveStatBarContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  liveStatBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.gray800,
    borderRadius: 2,
    overflow: 'hidden',
  },
  liveStatBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  liveStatBarHome: {
    backgroundColor: COLORS.accent,
  },
  liveStatLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: COLORS.gray600,
    marginTop: 4,
    letterSpacing: 1,
  },

  // No Live
  noLiveContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  noLiveText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 16,
  },
  noLiveSub: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 8,
  },

  // New Live Match Card Styles
  liveMatchCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveMatchCardCritical: {
    borderLeftColor: '#ff4757',
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  liveMatchCardImportant: {
    borderLeftColor: '#ffa502',
    backgroundColor: 'rgba(255, 165, 2, 0.05)',
    borderColor: 'rgba(255, 165, 2, 0.2)',
  },
  liveMatchCardExpanded: {
    borderLeftWidth: 4,
  },
  liveLeagueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveLeagueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  liveLeagueLogoSmall: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  liveLeagueName: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray500,
    flex: 1,
  },
  liveMinuteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  liveMinuteBadgeCritical: {
    backgroundColor: 'rgba(255, 71, 87, 0.25)',
  },
  liveMinuteBadgeImportant: {
    backgroundColor: 'rgba(255, 165, 2, 0.2)',
  },
  liveDotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
  },
  liveScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  liveTeamSection: {
    flex: 1,
    alignItems: 'center',
  },
  liveTeamSectionRight: {
    alignItems: 'center',
  },
  liveTeamLogoLarge: {
    width: 44,
    height: 44,
    marginBottom: 8,
  },
  liveTeamNameMain: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    maxWidth: 100,
  },
  liveScoreCenter: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  liveScoreBig: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  liveScoreCritical: {
    color: '#ff4757',
  },
  liveBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  liveEventsContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  liveEventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray800,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveEventMinute: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray400,
  },
  liveExpandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  liveStatsContainer: {
    gap: 12,
  },
  liveStatBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveStatBarValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    width: 35,
    textAlign: 'center',
  },
  liveStatBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  liveStatBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.gray800,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  liveStatBarFillHome: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  liveStatBarFillAway: {
    height: '100%',
    backgroundColor: COLORS.primary,
    position: 'absolute',
    right: 0,
  },
  liveStatBarLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 8,
  },
  liveDetailButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // MATCH DETAIL SCREEN STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  detailScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  detailBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLeague: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailFavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Match Info
  detailMatchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailTeamCol: {
    flex: 1,
  },
  detailTeamColRight: {
    alignItems: 'flex-end',
  },
  detailTeamShort: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  detailTeamName: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 4,
  },
  detailTeamLogo: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  detailScoreCol: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailScoreText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 3,
  },
  detailTimeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  detailDateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 4,
  },
  detailLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  detailLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
    marginRight: 6,
  },
  detailLiveText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },

  // Tabs
  detailTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailTabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  detailTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  detailTabBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
    letterSpacing: 1,
  },
  detailTabBtnTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Tab Content
  detailTabContent: {
    padding: 20,
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailCardTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray500,
    letterSpacing: 1,
    marginLeft: 8,
  },

  // Win Probability
  winProbContainer: {
    marginBottom: 20,
  },
  winProbBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.gray800,
  },
  winProbFill: {
    height: '100%',
  },
  winProbHome: {
    backgroundColor: COLORS.accent,
  },
  winProbDraw: {
    backgroundColor: COLORS.gray600,
  },
  winProbAway: {
    backgroundColor: COLORS.gray400,
  },
  winProbLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  winProbLabelItem: {
    alignItems: 'center',
  },
  winProbValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  winProbLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 4,
    letterSpacing: 1,
  },

  // AI Confidence
  aiConfidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  aiConfidenceLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    letterSpacing: 1,
    width: 70,
  },
  aiConfidenceBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray800,
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  aiConfidenceBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  aiConfidenceValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
    width: 30,
    textAlign: 'right',
  },
  aiLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentDim,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  aiLoadingText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.accent,
  },
  aiBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  aiBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.bg,
  },
  aiAdviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.accentDim,
    borderRadius: 4,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  aiAdviceText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray300,
    lineHeight: 20,
  },

  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickStatBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: COLORS.gray600,
    marginTop: 6,
    letterSpacing: 1,
  },

  // Factors
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  factorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray400,
    marginLeft: 10,
    lineHeight: 20,
  },

  // Stats Comparison
  statCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statCompareValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    width: 40,
    textAlign: 'center',
  },
  statCompareCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statCompareBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.gray800,
    borderRadius: 2,
    overflow: 'hidden',
  },
  statCompareBarHome: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  statCompareLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // H2H Summary
  h2hSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  h2hSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  h2hSummaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  h2hSummaryLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 6,
    letterSpacing: 1,
  },

  // H2H Match Row
  h2hMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  h2hMatchDate: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
  },
  h2hMatchScore: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 2,
  },
  h2hMatchVenue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    letterSpacing: 1,
    width: 40,
    textAlign: 'right',
  },

  // Lineups
  lineupsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  lineupTeam: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lineupTeamName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  lineupFormation: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  lineupPlayer: {
    fontSize: 12,
    color: COLORS.gray400,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lineupTeamLogo: {
    width: 40,
    height: 40,
    alignSelf: 'center',
    marginBottom: 8,
  },
  lineupCoach: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: 8,
  },
  lineupDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  noDataText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingTextSmall: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
  h2hMatchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
  },
  h2hMatchTeamName: {
    fontSize: 11,
    color: COLORS.gray400,
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANALYSIS SCREEN STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  analysisHeader: {
    paddingTop: 16,
    marginBottom: 24,
  },
  analysisTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 2,
  },
  periodBtnActive: {
    backgroundColor: COLORS.gray800,
  },
  periodBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
    letterSpacing: 1,
  },
  periodBtnTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Main Stats
  analysisMainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analysisAccuracyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 24,
  },
  analysisAccuracyValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: -1,
  },
  analysisAccuracyLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    letterSpacing: 1,
    marginTop: 2,
  },
  analysisSubStats: {
    flex: 1,
    gap: 16,
  },
  analysisSubStatItem: {
    alignItems: 'flex-start',
  },
  analysisSubStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -1,
  },
  analysisSubStatLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    letterSpacing: 1,
    marginTop: 4,
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBarBg: {
    width: 8,
    height: 60,
    backgroundColor: COLORS.gray800,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  categoryBarFill: {
    width: '100%',
    backgroundColor: COLORS.gray500,
    borderRadius: 4,
  },
  categoryBarHigh: {
    backgroundColor: COLORS.accent,
  },
  categoryBarLow: {
    backgroundColor: COLORS.danger,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  categoryLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 8,
    color: COLORS.gray600,
    marginTop: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // League Performance
  leagueList: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leagueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leagueInfo: {
    width: 120,
  },
  leagueName: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '500',
  },
  leaguePredictions: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 2,
  },
  leagueBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray800,
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  leagueBar: {
    height: '100%',
    backgroundColor: COLORS.gray500,
    borderRadius: 2,
  },
  leagueAccuracy: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
    width: 45,
    textAlign: 'right',
  },
  leagueAccuracyHigh: {
    color: COLORS.accent,
  },

  // Predictions
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionTeams: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '500',
  },
  predictionDate: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 4,
  },
  predictionResult: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  predictionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  predictionBadgeCorrect: {
    backgroundColor: COLORS.accentDim,
  },
  predictionBadgeWrong: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  predictionBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  predictionActual: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray500,
  },
  predictionStatus: {
    width: 30,
    alignItems: 'center',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // PROFILE SCREEN STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.gray800,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  profileMember: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 4,
  },
  profileEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Stats
  profileStatsRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  profileStatBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  profileStatLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: COLORS.gray600,
    marginTop: 6,
    letterSpacing: 1,
  },

  // Favorite Teams
  favoriteTeamsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  favoriteTeamBadge: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  favoriteTeamShort: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  addTeamBtn: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },

  // Menu
  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 14,
    color: COLORS.white,
    marginLeft: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray600,
    marginRight: 8,
  },

  // Toggle
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray800,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.accent,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray600,
  },
  toggleKnobActive: {
    backgroundColor: COLORS.white,
    alignSelf: 'flex-end',
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  appInfoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray600,
  },
  appInfoSub: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray700,
    marginTop: 4,
  },
});
