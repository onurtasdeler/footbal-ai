import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
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
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import footballApi from '../services/footballApi';
import { getAnalyzedFixtureIds } from '../services/cacheService';
import { useIsPro } from '../context/SubscriptionContext';
import { COLORS } from '../theme/colors';

const LOCALE_TO_COUNTRY = {
  'tr': 'Turkey', 'en': 'England', 'de': 'Germany', 'es': 'Spain', 'fr': 'France',
  'it': 'Italy', 'pt': 'Portugal', 'nl': 'Netherlands', 'be': 'Belgium',
};

const POPULAR_LEAGUE_IDS = [39, 140, 135, 78, 61, 203, 2, 3];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const HomeScreen = ({ navigation }) => {
  // Safe area insets for proper header positioning
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isPro = useIsPro();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchesByLeague, setMatchesByLeague] = useState({});
  const [expandedLeagues, setExpandedLeagues] = useState({});
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [selectedDateOffset, setSelectedDateOffset] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userCountry, setUserCountry] = useState(null);
  // sortedLeagues artık useMemo ile hesaplanıyor (aşağıda)
  
  // Advanced Filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [hideFinished, setHideFinished] = useState(false);
  const [onlyNotStarted, setOnlyNotStarted] = useState(false);
  const [onlyDraws, setOnlyDraws] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState([]);

  // Favoriler ve Analiz Edilenler
  const [favoriteMatchIds, setFavoriteMatchIds] = useState([]);
  const [analyzedMatchIds, setAnalyzedMatchIds] = useState([]);

  const filters = ['Tümü', 'Canlı', 'Favoriler', 'Analizler'];
  const dateOptions = [-1, 0, 1]; // Sadece Dün, Bugün, Yarın

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  
  const getDateString = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  };

  const formatDateLabel = (offset) => {
    if (offset === -1) return 'Dün';
    if (offset === 0) return 'Bugün';
    if (offset === 1) return 'Yarın';
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const formatDateDisplay = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${days[date.getDay()]}`;
  };

  const formatShortDate = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  useEffect(() => {
    try {
      const rawLocale = Localization.locale || 'tr';
      const locale = rawLocale.split(/[-_]/)[0].toLowerCase();
      const country = LOCALE_TO_COUNTRY[locale] || null;
      setUserCountry(country);
    } catch (e) {
      // Silent fail
    }
  }, []);

  // Favori maçları ve analiz edilmiş maçları yükle
  const loadFavoritesAndAnalyzed = useCallback(async () => {
    try {
      // Favori maçları yükle
      const favoritesJson = await AsyncStorage.getItem('@favorite_matches');
      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        setFavoriteMatchIds(favorites.map(f => f.id));
      }

      // Analiz edilmiş maçları yükle
      const analyzedIds = await getAnalyzedFixtureIds();
      setAnalyzedMatchIds(analyzedIds);
    } catch (error) {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    loadFavoritesAndAnalyzed();
  }, [loadFavoritesAndAnalyzed]);

  // Favori toggle fonksiyonu
  const toggleFavorite = async (match) => {
    try {
      const favoritesJson = await AsyncStorage.getItem('@favorite_matches');
      let favorites = favoritesJson ? JSON.parse(favoritesJson) : [];

      const index = favorites.findIndex(f => f.id === match.id);
      if (index > -1) {
        favorites.splice(index, 1);
      } else {
        favorites.push({ id: match.id, home: match.home, away: match.away, league: match.league });
      }

      await AsyncStorage.setItem('@favorite_matches', JSON.stringify(favorites));
      setFavoriteMatchIds(favorites.map(f => f.id));
    } catch (error) {
      // Silent fail
    }
  };

  const fetchData = useCallback(async (dateOffset = selectedDateOffset) => {
    try {
      setError(null);
      setLoading(true);
      const dateString = getDateString(dateOffset);
      const fixtures = await footballApi.getFixturesByDate(dateString);

      if (fixtures && fixtures.length > 0) {
        const formatted = fixtures.map(f => {
          const match = footballApi.formatFixture(f);
          // prediction: Gerçek AI analiz sonucu için MatchAnalysisScreen kullanılmalı
          match.prediction = null;
          return match;
        });

        const grouped = {};
        formatted.forEach(match => {
          const leagueId = match.league?.id || 'unknown';
          const leagueKey = `league_${leagueId}`;
          if (!grouped[leagueKey]) {
            grouped[leagueKey] = {
              id: leagueId,
              name: match.league?.name || 'Bilinmeyen Lig',
              country: match.league?.country || '',
              flag: match.league?.flag,
              logo: match.league?.logo,
              matches: [],
            };
          }
          grouped[leagueKey].matches.push(match);
        });
        setMatchesByLeague(grouped);
      } else {
        setMatchesByLeague({});
        setSortedLeagues([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDateOffset]);

  useEffect(() => {
    fetchData(selectedDateOffset);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [selectedDateOffset]);

  // useMemo: Sıralanmış ligler (gereksiz re-render'ları önler)
  const sortedLeagues = useMemo(() => {
    if (Object.keys(matchesByLeague).length === 0) return [];

    return Object.entries(matchesByLeague).sort(([, a], [, b]) => {
      if (userCountry) {
        const aIsUser = a.country === userCountry;
        const bIsUser = b.country === userCountry;
        if (aIsUser && !bIsUser) return -1;
        if (!aIsUser && bIsUser) return 1;
      }
      const aPop = POPULAR_LEAGUE_IDS.indexOf(a.id);
      const bPop = POPULAR_LEAGUE_IDS.indexOf(b.id);
      const aIsPop = aPop !== -1;
      const bIsPop = bPop !== -1;
      if (aIsPop && !bIsPop) return -1;
      if (!aIsPop && bIsPop) return 1;
      if (aIsPop && bIsPop) return aPop - bPop;
      return (a.country + a.name).localeCompare(b.country + b.name);
    });
  }, [matchesByLeague, userCountry]);

  // Side effect: İlk ligi otomatik genişlet
  useEffect(() => {
    if (sortedLeagues.length > 0 && Object.keys(expandedLeagues).length === 0) {
      setExpandedLeagues({ [sortedLeagues[0][0]]: true });
    }
  }, [sortedLeagues]);

  const toggleLeague = (key) => {
    setExpandedLeagues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDateChange = (offset) => {
    if (offset !== selectedDateOffset) {
      setSelectedDateOffset(offset);
      setMatchesByLeague({});
      setExpandedLeagues({});
    }
  };

  const getFilteredMatches = (matches, league) => {
    let filtered = [...matches];
    
    // Advanced Filters
    if (hideFinished) {
      filtered = filtered.filter(m => !['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'].includes(m.status));
    }
    if (onlyNotStarted) {
      filtered = filtered.filter(m => m.status === 'NS');
    }
    if (onlyDraws) {
      filtered = filtered.filter(m => m.home?.score !== undefined && m.home.score === m.away.score);
    }

    // Search
    if (searchText.trim()) {
      const s = searchText.toLowerCase().trim();
      const leagueMatches = league && (
        league.name?.toLowerCase().includes(s) ||
        league.country?.toLowerCase().includes(s)
      );

      if (!leagueMatches) {
        filtered = filtered.filter(m => 
          m.home?.name?.toLowerCase().includes(s) || 
          m.away?.name?.toLowerCase().includes(s)
        );
      }
    }

    // Tab Filters
    if (activeFilter === 'Canlı') {
      return filtered.filter(m => m.isLive === true);
    }
    if (activeFilter === 'Favoriler') {
      return filtered.filter(m => favoriteMatchIds.includes(m.id));
    }
    if (activeFilter === 'Analizler') {
      return filtered.filter(m => analyzedMatchIds.includes(m.id));
    }

    return filtered;
  };

  const getPredictionColor = (value) => {
    if (value >= 60) return COLORS.success;
    if (value >= 40) return COLORS.warning;
    return COLORS.danger;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={[styles.bultenHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Goalwise</Text>
        <TouchableOpacity
          style={[styles.proBadge, isPro && styles.proBadgeActive]}
          onPress={isPro ? undefined : () => navigation.navigate('Paywall')}
          activeOpacity={isPro ? 1 : 0.7}
          disabled={isPro}
        >
          <Ionicons
            name={isPro ? "checkmark-circle" : "trophy"}
            size={16}
            color={isPro ? "#00d4aa" : "#F4B43A"}
          />
          <Text style={[styles.proText, isPro && styles.proTextActive]}>
            {isPro ? "PRO" : "PRO"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Pressable
          style={styles.searchBar}
          onPress={() => searchInputRef.current?.focus()}
        >
          <Ionicons name="search" size={18} color={COLORS.gray500} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Takım veya lig ara..."
            placeholderTextColor={COLORS.gray500}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            selectionColor={COLORS.accent}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                searchInputRef.current?.focus();
              }}
              style={styles.searchClearBtn}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.gray500} />
            </TouchableOpacity>
          )}
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive,
              filter === 'Canlı' && styles.filterTabLive,
              filter === 'Canlı' && activeFilter === filter && styles.filterTabLiveActive,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            {filter === 'Canlı' && (
              <View style={[
                styles.liveIndicator,
                activeFilter === filter && styles.liveIndicatorActive,
              ]} />
            )}
            <Text
              style={[
                styles.filterText,
                activeFilter === filter && styles.filterTextActive,
                filter === 'Canlı' && styles.filterTextLive,
                filter === 'Canlı' && activeFilter === filter && styles.filterTextLiveActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.matchesScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(selectedDateOffset)}
              tintColor={COLORS.accent}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {sortedLeagues.length === 0 ? (
               <View style={styles.noMatchesBox}>
               <Ionicons name="football-outline" size={40} color={COLORS.gray700} />
               <Text style={styles.noMatchesText}>
                 Bugün maç bulunamadı
               </Text>
             </View>
            ) : (
              sortedLeagues.map(([leagueKey, league]) => {
                const filteredMatches = getFilteredMatches(league.matches, league);
                if (filteredMatches.length === 0) return null;

                return (
                  <View key={leagueKey} style={styles.leagueSection}>
                    <TouchableOpacity
                      style={styles.leagueHeader}
                      onPress={() => toggleLeague(leagueKey)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.bultenLeagueInfo}>
                        <View style={styles.bultenFlagContainer}>
                          {(league.flag || league.logo) ? (
                            <Image
                              source={{ uri: league.flag || league.logo }}
                              style={styles.bultenFlag}
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="football" size={16} color={COLORS.gray500} />
                          )}
                        </View>
                        <Text style={styles.bultenLeagueName} numberOfLines={1}>
                          {league.country ? `${league.country} - ${league.name}` : league.name}
                        </Text>
                      </View>
                      <View style={styles.leagueRight}>
                        <Text style={styles.matchCount}>{filteredMatches.length}</Text>
                        <Ionicons
                          name={expandedLeagues[leagueKey] ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={COLORS.gray500}
                        />
                      </View>
                    </TouchableOpacity>

                    {expandedLeagues[leagueKey] && (
                      <View style={styles.matchesList}>
                        {filteredMatches.map((match) => (
                          <TouchableOpacity
                            key={match.id}
                            style={styles.matchCard}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('MatchAnalysis', { match })}
                          >
                            <View style={[styles.matchTimeCol, match.isLive && styles.matchTimeColLive]}>
                              {match.isLive ? (
                                <View style={styles.liveTimeBadge}>
                                  <View style={styles.liveBadgeTop}>
                                    <View style={styles.liveDotPulse} />
                                    <Text style={styles.liveLabel}>CANLI</Text>
                                  </View>
                                  <Text style={styles.liveMinuteText}>{match.minute}'</Text>
                                </View>
                              ) : (
                                <Text style={styles.matchTimeText}>{match.time}</Text>
                              )}
                            </View>

                            <View style={styles.teamsCol}>
                              <View style={styles.teamRow}>
                                <View style={styles.teamLogoContainer}>
                                  {match.home?.logo ? (
                                    <Image source={{ uri: match.home.logo }} style={styles.teamLogoSmall} resizeMode="contain" />
                                  ) : (
                                    <Ionicons name="shirt-outline" size={14} color={COLORS.gray600} />
                                  )}
                                </View>
                                <Text style={styles.teamNameText} numberOfLines={1}>
                                  {match.home?.name || 'Ev Sahibi'}
                                </Text>
                              </View>
                              <View style={styles.teamRow}>
                                <View style={styles.teamLogoContainer}>
                                  {match.away?.logo ? (
                                    <Image source={{ uri: match.away.logo }} style={styles.teamLogoSmall} resizeMode="contain" />
                                  ) : (
                                    <Ionicons name="shirt-outline" size={14} color={COLORS.gray600} />
                                  )}
                                </View>
                                <Text style={styles.teamNameText} numberOfLines={1}>
                                  {match.away?.name || 'Deplasman'}
                                </Text>
                              </View>
                            </View>

                            {match.prediction !== null && (
                              <View style={styles.predictionCol}>
                                <Text style={[styles.predictionPercent, { color: COLORS.gray500 }]}>%</Text>
                                <Text style={[styles.predictionValue, { color: getPredictionColor(match.prediction) }]}>
                                  {match.prediction}
                                </Text>
                              </View>
                            )}

                            <TouchableOpacity
                              style={styles.favoriteBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                toggleFavorite(match);
                              }}
                            >
                              <Ionicons
                                name={favoriteMatchIds.includes(match.id) ? "heart" : "heart-outline"}
                                size={20}
                                color={favoriteMatchIds.includes(match.id) ? COLORS.danger : COLORS.gray500}
                              />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: 120 }} />
          </Animated.View>
        </ScrollView>
      )}

      {/* DATE PICKER BOTTOM SHEET */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable
            style={styles.bottomSheetDismiss}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Tarih Seçin</Text>
            <View style={styles.dateCardsRow}>
              {dateOptions.map((offset) => (
                <TouchableOpacity
                  key={offset}
                  style={[
                    styles.dateCard,
                    selectedDateOffset === offset && styles.dateCardActive,
                  ]}
                  onPress={() => {
                    handleDateChange(offset);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[
                    styles.dateCardLabel,
                    selectedDateOffset === offset && styles.dateCardLabelActive,
                  ]}>
                    {formatDateLabel(offset)}
                  </Text>
                  <Text style={[
                    styles.dateCardDate,
                    selectedDateOffset === offset && styles.dateCardDateActive,
                  ]}>
                    {formatShortDate(offset)}
                  </Text>
                  {selectedDateOffset === offset && (
                    <View style={styles.dateCardCheck}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES (Restored Old Styles + Cleaned)
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Header
  bultenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerIconBtn: {
    position: 'relative',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 180, 58, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  proText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F4B43A',
    letterSpacing: 0.5,
  },
  proBadgeActive: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
  },
  proTextActive: {
    color: '#00d4aa',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Search
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    height: '100%',
  },
  searchClearBtn: {
    padding: 4,
  },
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  filterTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  // Live Tab Styles
  filterTabLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  filterTabLiveActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: COLORS.liveRed,
  },
  filterTextLive: {
    color: COLORS.liveRed,
  },
  filterTextLiveActive: {
    color: COLORS.liveRed,
    fontWeight: '600',
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.liveRed,
  },
  liveIndicatorActive: {
    backgroundColor: COLORS.liveRed,
  },
  // Content
  matchesScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray500,
  },
  noMatchesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noMatchesText: {
    marginTop: 12,
    color: COLORS.gray500,
  },
  // League Section
  leagueSection: {
    marginBottom: 16,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bultenLeagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bultenFlagContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  bultenFlag: {
    width: 24,
    height: 24,
  },
  bultenLeagueName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  leagueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchCount: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  // Match Card
  matchesList: {
    gap: 8,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  matchTimeCol: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingRight: 8,
    marginRight: 8,
  },
  matchTimeColLive: {
    width: 55,
    borderRightColor: 'rgba(255, 59, 48, 0.3)',
  },
  matchTimeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  liveTimeBadge: {
    alignItems: 'center',
    gap: 4,
  },
  liveBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  liveDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.liveRed,
  },
  liveLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.liveRed,
    letterSpacing: 0.5,
  },
  liveMinuteText: {
    fontSize: 14,
    color: COLORS.liveRed,
    fontWeight: '700',
  },
  teamsCol: {
    flex: 1,
    gap: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogoContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  teamLogoSmall: {
    width: 18,
    height: 18,
  },
  teamNameText: {
    fontSize: 13,
    color: COLORS.gray100,
  },
  predictionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 8,
    minWidth: 55,
  },
  predictionPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Favorite Button
  favoriteBtn: {
    padding: 8,
    marginLeft: 4,
  },
  // Bottom Sheet Modal
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetDismiss: {
    flex: 1,
  },
  bottomSheetContent: {
    height: '50%',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray600,
    borderRadius: 2,
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 32,
  },
  dateCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  dateCard: {
    width: 100,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateCardActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  dateCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  dateCardLabelActive: {
    color: COLORS.accent,
  },
  dateCardDate: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  dateCardDateActive: {
    color: COLORS.accent,
  },
  dateCardCheck: {
    marginTop: 12,
  },
  // Filter Panel
  filterPanelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterPanelDismiss: {
    flex: 1,
  },
  filterPanelContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  filterPanelBody: {
    padding: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLabel: {
    fontSize: 14,
    color: COLORS.white,
  },
});

export default HomeScreen;