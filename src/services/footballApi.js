// Football API Service
// API-Football v3 Integration with Cache Optimization
// NOW USING SUPABASE EDGE FUNCTIONS - API Keys are server-side

import {
  fetchWithCache,
  buildCacheKey,
  CACHE_DURATIONS,
  getCacheStats,
} from './cacheService';
import {
  supabase,
  getFixturesCache,
  getStandingsCache,
  getLeaguesCache,
  getTeamCache,
  getInjuriesCache,
} from './supabaseService';

// Edge Function URL (Supabase handles the API key)
const USE_EDGE_FUNCTIONS = true; // Toggle for migration

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMIT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 300,     // API-Football Pro plan limit
  SAFETY_MARGIN: 280,                // Client-side safety margin
  RESET_INTERVAL_MS: 60000,          // 1 minute
};

// Rate limiting: Pro plan = 300 req/min (still tracked client-side for safety)
let requestCount = 0;
let lastResetTime = Date.now();

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTRY TO FLAG MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

// API-Football country names to ISO 3166-1 alpha-2 codes (lowercase)
// Ayrı JSON dosyasından import edildi - bundle boyutu optimizasyonu
import COUNTRY_TO_ISO from '../data/countryToIso.json';

// Get flag URL from country name
export const getCountryFlagUrl = (countryName) => {
  if (!countryName) return null;

  const isoCode = COUNTRY_TO_ISO[countryName];
  if (isoCode) {
    // Use flagcdn.com for PNG flags (reliable CDN)
    // Format: https://flagcdn.com/48x36/{code}.png
    return `https://flagcdn.com/48x36/${isoCode}.png`;
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// API CALL HELPER (with rate limiting) - NOW USING EDGE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const apiCall = async (endpoint, params = {}) => {
  // Pro plan rate limiting - still track client-side for safety
  const now = Date.now();
  if (now - lastResetTime >= RATE_LIMIT_CONFIG.RESET_INTERVAL_MS) {
    requestCount = 0;
    lastResetTime = now;
  }

  requestCount++;
  if (requestCount > RATE_LIMIT_CONFIG.SAFETY_MARGIN) {
    const waitTime = RATE_LIMIT_CONFIG.RESET_INTERVAL_MS - (now - lastResetTime);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 1;
    lastResetTime = Date.now();
  }

  try {
    // Use Supabase Edge Function - API key is stored server-side
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('football-proxy', {
        body: { endpoint, params },
      });

      if (error) {
        throw new Error(error.message || 'Edge Function error');
      }

      // Edge Function returns the API response directly
      if (data?.errors && Object.keys(data.errors).length > 0) {
        throw new Error(Object.values(data.errors).join(', '));
      }

      return data?.response || data || [];
    }

    // Fallback: Direct API call (for development/testing only)
    // NOTE: This path should not be used in production
    throw new Error('Direct API calls disabled - use Edge Functions');
  } catch (error) {
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED API CALL HELPER
// ═══════════════════════════════════════════════════════════════════════════════

const cachedApiCall = async (cacheKey, endpoint, params = {}, cacheDuration) => {
  return fetchWithCache(
    cacheKey,
    () => apiCall(endpoint, params),
    cacheDuration
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES (Matches)
// ═══════════════════════════════════════════════════════════════════════════════

// Get today's fixtures - SUPABASE-FIRST (1 dakika fallback cache)
export const getTodayFixtures = async (timezone = 'Europe/Istanbul') => {
  const today = new Date().toISOString().split('T')[0];

  // 1. Try Supabase cache first (server-side cron synced)
  try {
    const cached = await getFixturesCache(today);
    if (cached && !cached.is_stale && cached.data.length > 0) {
      __DEV__ && console.log(`[FootballAPI] Supabase cache hit for fixtures: ${today}`);
      return cached.data;
    }
  } catch (e) {
    __DEV__ && console.warn('[FootballAPI] Supabase cache failed, falling back to API:', e.message);
  }

  // 2. Fallback to direct API call (Edge Function)
  const cacheKey = buildCacheKey('today_fixtures', { date: today, timezone });
  return cachedApiCall(
    cacheKey,
    'fixtures',
    { date: today, timezone },
    CACHE_DURATIONS.TODAY_FIXTURES
  );
};

// Get live fixtures (30 saniye cache - canlı veriler)
export const getLiveFixtures = async () => {
  const cacheKey = 'live_fixtures';

  return cachedApiCall(
    cacheKey,
    'fixtures',
    { live: 'all' },
    CACHE_DURATIONS.LIVE_FIXTURES
  );
};

// Get fixtures by date - SUPABASE-FIRST (1 dakika fallback cache)
export const getFixturesByDate = async (date, timezone = 'Europe/Istanbul') => {
  // 1. Try Supabase cache first (server-side cron synced)
  try {
    const cached = await getFixturesCache(date);
    if (cached && !cached.is_stale && cached.data.length > 0) {
      __DEV__ && console.log(`[FootballAPI] Supabase cache hit for fixtures: ${date}`);
      return cached.data;
    }
  } catch (e) {
    __DEV__ && console.warn('[FootballAPI] Supabase cache failed, falling back to API:', e.message);
  }

  // 2. Fallback to direct API call (Edge Function)
  const cacheKey = buildCacheKey('fixtures_by_date', { date, timezone });
  return cachedApiCall(
    cacheKey,
    'fixtures',
    { date, timezone },
    CACHE_DURATIONS.TODAY_FIXTURES
  );
};

// Get fixtures by league and season
export const getFixturesByLeague = async (leagueId, season, options = {}) => {
  const cacheKey = buildCacheKey('fixtures_by_league', { league: leagueId, season, ...options });

  return cachedApiCall(
    cacheKey,
    'fixtures',
    { league: leagueId, season, ...options },
    CACHE_DURATIONS.TODAY_FIXTURES
  );
};

// Get single fixture details (1 dakika cache)
export const getFixtureById = async (fixtureId) => {
  const cacheKey = buildCacheKey('fixture', { id: fixtureId });

  return cachedApiCall(
    cacheKey,
    'fixtures',
    { id: fixtureId },
    CACHE_DURATIONS.FIXTURE_DETAILS
  );
};

// Get fixture statistics (30 saniye - canlı maç için)
export const getFixtureStats = async (fixtureId) => {
  const cacheKey = buildCacheKey('fixture_stats', { fixture: fixtureId });

  return cachedApiCall(
    cacheKey,
    'fixtures/statistics',
    { fixture: fixtureId },
    CACHE_DURATIONS.FIXTURE_STATS
  );
};

// Get fixture events (30 saniye - canlı maç için)
export const getFixtureEvents = async (fixtureId) => {
  const cacheKey = buildCacheKey('fixture_events', { fixture: fixtureId });

  return cachedApiCall(
    cacheKey,
    'fixtures/events',
    { fixture: fixtureId },
    CACHE_DURATIONS.FIXTURE_EVENTS
  );
};

// Get fixture lineups (5 dakika cache - maç başladıktan sonra değişmez)
export const getFixtureLineups = async (fixtureId) => {
  const cacheKey = buildCacheKey('fixture_lineups', { fixture: fixtureId });

  return cachedApiCall(
    cacheKey,
    'fixtures/lineups',
    { fixture: fixtureId },
    CACHE_DURATIONS.FIXTURE_LINEUPS
  );
};

// Get head to head (1 saat cache)
export const getHeadToHead = async (team1Id, team2Id, last = 10) => {
  const cacheKey = buildCacheKey('h2h', { h2h: `${team1Id}-${team2Id}`, last });

  return cachedApiCall(
    cacheKey,
    'fixtures/headtohead',
    { h2h: `${team1Id}-${team2Id}`, last },
    CACHE_DURATIONS.HEAD_TO_HEAD
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Get AI predictions for a fixture (30 dakika cache)
export const getPredictions = async (fixtureId) => {
  const cacheKey = buildCacheKey('predictions', { fixture: fixtureId });

  return cachedApiCall(
    cacheKey,
    'predictions',
    { fixture: fixtureId },
    CACHE_DURATIONS.PREDICTIONS
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEAGUES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all leagues - SUPABASE-FIRST (1 gün fallback cache)
export const getLeagues = async (options = {}) => {
  // Only use Supabase cache for basic leagues request (no special options)
  if (Object.keys(options).length === 0) {
    try {
      const cached = await getLeaguesCache();
      if (cached && !cached.is_stale && cached.data.length > 0) {
        __DEV__ && console.log(`[FootballAPI] Supabase cache hit for leagues: ${cached.count} leagues`);
        return cached.data;
      }
    } catch (e) {
      __DEV__ && console.warn('[FootballAPI] Supabase cache failed, falling back to API:', e.message);
    }
  }

  // Fallback to direct API call (Edge Function)
  const cacheKey = buildCacheKey('leagues', options);
  return cachedApiCall(
    cacheKey,
    'leagues',
    options,
    CACHE_DURATIONS.LEAGUES
  );
};

// Get popular leagues (1 gün cache)
export const getPopularLeagues = async () => {
  const popularIds = [39, 140, 135, 78, 61, 203];
  const season = new Date().getFullYear();
  const cacheKey = buildCacheKey('popular_leagues', { season });

  return cachedApiCall(
    cacheKey,
    'leagues',
    { id: popularIds.join('-'), season },
    CACHE_DURATIONS.LEAGUES
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STANDINGS
// ═══════════════════════════════════════════════════════════════════════════════

// Get league standings - SUPABASE-FIRST (30 dakika fallback cache)
export const getStandings = async (leagueId, season) => {
  // 1. Try Supabase cache first (server-side cron synced)
  try {
    const cached = await getStandingsCache(leagueId, season);
    if (cached && !cached.is_stale && cached.data) {
      __DEV__ && console.log(`[FootballAPI] Supabase cache hit for standings: league ${leagueId}`);
      // Return as array to match API response format
      return [cached.data];
    }
  } catch (e) {
    __DEV__ && console.warn('[FootballAPI] Supabase cache failed, falling back to API:', e.message);
  }

  // 2. Fallback to direct API call (Edge Function)
  const cacheKey = buildCacheKey('standings', { league: leagueId, season });
  return cachedApiCall(
    cacheKey,
    'standings',
    { league: leagueId, season },
    CACHE_DURATIONS.STANDINGS
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════════════════════

// Get team info - SUPABASE-FIRST (1 gün fallback cache)
export const getTeamInfo = async (teamId) => {
  // 1. Try Supabase cache first (server-side cron synced)
  try {
    const cached = await getTeamCache(teamId);
    if (cached && !cached.is_stale && cached.data) {
      __DEV__ && console.log(`[FootballAPI] Supabase cache hit for team: ${teamId}`);
      // Return as array to match API response format
      return [cached.data];
    }
  } catch (e) {
    __DEV__ && console.warn('[FootballAPI] Supabase cache failed, falling back to API:', e.message);
  }

  // 2. Fallback to direct API call (Edge Function)
  const cacheKey = buildCacheKey('team_info', { id: teamId });
  return cachedApiCall(
    cacheKey,
    'teams',
    { id: teamId },
    CACHE_DURATIONS.TEAM_INFO
  );
};

// Get team statistics (6 saat cache)
export const getTeamStats = async (teamId, leagueId, season) => {
  const cacheKey = buildCacheKey('team_stats', { team: teamId, league: leagueId, season });

  return cachedApiCall(
    cacheKey,
    'teams/statistics',
    { team: teamId, league: leagueId, season },
    CACHE_DURATIONS.TEAM_STATS
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYERS (Top Scorers, Assists, Cards)
// ═══════════════════════════════════════════════════════════════════════════════

// Get top scorers (1 saat cache)
export const getTopScorers = async (leagueId, season) => {
  const cacheKey = buildCacheKey('top_scorers', { league: leagueId, season });

  return cachedApiCall(
    cacheKey,
    'players/topscorers',
    { league: leagueId, season },
    CACHE_DURATIONS.TOP_SCORERS
  );
};

// Get top assists (1 saat cache)
export const getTopAssists = async (leagueId, season) => {
  const cacheKey = buildCacheKey('top_assists', { league: leagueId, season });

  return cachedApiCall(
    cacheKey,
    'players/topassists',
    { league: leagueId, season },
    CACHE_DURATIONS.TOP_ASSISTS
  );
};

// Get top yellow cards (1 saat cache)
export const getTopYellowCards = async (leagueId, season) => {
  const cacheKey = buildCacheKey('top_yellows', { league: leagueId, season });

  return cachedApiCall(
    cacheKey,
    'players/topyellowcards',
    { league: leagueId, season },
    CACHE_DURATIONS.TOP_CARDS
  );
};

// Get top red cards (1 saat cache)
export const getTopRedCards = async (leagueId, season) => {
  const cacheKey = buildCacheKey('top_reds', { league: leagueId, season });

  return cachedApiCall(
    cacheKey,
    'players/topredcards',
    { league: leagueId, season },
    CACHE_DURATIONS.TOP_CARDS
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFERS & INJURIES
// ═══════════════════════════════════════════════════════════════════════════════

// Get transfers by team (6 saat cache)
export const getTransfers = async (teamId) => {
  const cacheKey = buildCacheKey('transfers', { team: teamId });

  return cachedApiCall(
    cacheKey,
    'transfers',
    { team: teamId },
    CACHE_DURATIONS.TRANSFERS
  );
};

// Get injuries by league - SUPABASE-FIRST (2 saat fallback cache)
export const getInjuries = async (leagueId, season) => {
  // 1. Try Supabase cache first (server-side cron synced)
  try {
    const cached = await getInjuriesCache(leagueId, season);
    if (cached && !cached.is_stale && cached.data) {
      __DEV__ && console.log(`[FootballAPI] Supabase cache hit for injuries: league ${leagueId}`);
      return cached.data;
    }
  } catch (e) {
    __DEV__ && console.warn('[FootballAPI] Supabase cache failed, falling back to API:', e.message);
  }

  // 2. Fallback to direct API call (Edge Function)
  const cacheKey = buildCacheKey('injuries', { league: leagueId, season });
  return cachedApiCall(
    cacheKey,
    'injuries',
    { league: leagueId, season },
    CACHE_DURATIONS.INJURIES
  );
};

// Get injuries for a specific fixture (5 dakika cache)
export const getFixtureInjuries = async (fixtureId) => {
  const cacheKey = buildCacheKey('fixture_injuries', { fixture: fixtureId });

  return cachedApiCall(
    cacheKey,
    'injuries',
    { fixture: fixtureId },
    CACHE_DURATIONS.FIXTURE_LINEUPS // 5 dakika - kadro gibi
  );
};

// Get sidelined players (2 saat cache)
export const getSidelined = async (playerId) => {
  const cacheKey = buildCacheKey('sidelined', { player: playerId });

  return cachedApiCall(
    cacheKey,
    'sidelined',
    { player: playerId },
    CACHE_DURATIONS.INJURIES
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ODDS (Bahis Oranları)
// ═══════════════════════════════════════════════════════════════════════════════

// Bet type IDs mapping
export const BET_TYPES = {
  MATCH_WINNER: 1,        // 1X2 Maç Sonucu
  OVER_UNDER: 5,          // Alt/Üst Gol
  BTTS: 8,                // Karşılıklı Gol (Both Teams To Score)
  HANDICAP: 10,           // Handikap
  DOUBLE_CHANCE: 12,      // Çifte Şans
  FIRST_HALF_WINNER: 13,  // 1. Yarı Sonucu
  EXACT_SCORE: 16,        // Skor Tahmini
};

// Get odds for a specific fixture (1 dakika cache)
export const getFixtureOdds = async (fixtureId, bookmaker = null) => {
  const params = { fixture: fixtureId };
  if (bookmaker) params.bookmaker = bookmaker;

  const cacheKey = buildCacheKey('odds', params);

  return cachedApiCall(
    cacheKey,
    'odds',
    params,
    CACHE_DURATIONS.FIXTURE_DETAILS
  );
};

// Get odds by date - günün maçları için toplu oranlar (1 dakika cache)
export const getOddsByDate = async (date, timezone = 'Europe/Istanbul', bookmaker = null) => {
  const params = { date, timezone };
  if (bookmaker) params.bookmaker = bookmaker;

  const cacheKey = buildCacheKey('odds_by_date', params);

  return cachedApiCall(
    cacheKey,
    'odds',
    params,
    CACHE_DURATIONS.TODAY_FIXTURES
  );
};

// Get live odds (30 saniye cache - canlı oranlar)
export const getLiveOdds = async (bookmaker = null) => {
  const params = { live: 'all' };
  if (bookmaker) params.bookmaker = bookmaker;

  const cacheKey = buildCacheKey('live_odds', params);

  return cachedApiCall(
    cacheKey,
    'odds/live',
    params,
    CACHE_DURATIONS.LIVE_FIXTURES
  );
};

// Get list of all bet types (1 gün cache - nadir değişir)
export const getBetTypes = async () => {
  const cacheKey = 'bet_types';

  return cachedApiCall(
    cacheKey,
    'odds/bets',
    {},
    CACHE_DURATIONS.LEAGUES
  );
};

// Get list of all bookmakers (1 gün cache - nadir değişir)
export const getBookmakers = async () => {
  const cacheKey = 'bookmakers';

  return cachedApiCall(
    cacheKey,
    'odds/bookmakers',
    {},
    CACHE_DURATIONS.LEAGUES
  );
};

// Get pre-match odds mapping (odds for multiple fixtures from today's fixtures)
export const getTodayOdds = async (timezone = 'Europe/Istanbul') => {
  const today = new Date().toISOString().split('T')[0];
  return getOddsByDate(today, timezone);
};

// ═══════════════════════════════════════════════════════════════════════════════
// ODDS HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Format odds response for easier usage
export const formatOdds = (oddsData) => {
  if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
    return null;
  }

  // İlk bookmaker'ı al (genellikle en popüler)
  const bookmaker = oddsData.bookmakers[0];
  const formatted = {
    fixtureId: oddsData.fixture?.id,
    bookmaker: {
      id: bookmaker.id,
      name: bookmaker.name,
    },
    bets: {},
  };

  // Her bet tipini işle
  bookmaker.bets.forEach(bet => {
    const betKey = getBetKey(bet.id);
    if (betKey) {
      formatted.bets[betKey] = {
        id: bet.id,
        name: bet.name,
        values: bet.values.map(v => ({
          label: v.value,
          odd: parseFloat(v.odd),
        })),
      };
    }
  });

  return formatted;
};

// Get bet key from bet ID
const getBetKey = (betId) => {
  const mapping = {
    1: 'matchWinner',
    5: 'overUnder',
    8: 'btts',
    10: 'handicap',
    12: 'doubleChance',
    13: 'firstHalfWinner',
    16: 'exactScore',
  };
  return mapping[betId] || null;
};

// Extract specific bet type from odds data
export const extractBetType = (oddsData, betType) => {
  if (!oddsData || !oddsData.bookmakers) return null;

  for (const bookmaker of oddsData.bookmakers) {
    const bet = bookmaker.bets.find(b => b.id === betType);
    if (bet) {
      return {
        bookmaker: bookmaker.name,
        name: bet.name,
        values: bet.values.map(v => ({
          label: v.value,
          odd: parseFloat(v.odd),
        })),
      };
    }
  }
  return null;
};

// Get 1X2 odds from formatted data
export const get1X2Odds = (oddsData) => {
  const bet = extractBetType(oddsData, BET_TYPES.MATCH_WINNER);
  if (!bet || !bet.values) return null;

  const home = bet.values.find(v => v.label === 'Home');
  const draw = bet.values.find(v => v.label === 'Draw');
  const away = bet.values.find(v => v.label === 'Away');

  return {
    home: home?.odd || null,
    draw: draw?.odd || null,
    away: away?.odd || null,
  };
};

// Get Over/Under odds from formatted data
export const getOverUnderOdds = (oddsData, line = 2.5) => {
  const bet = extractBetType(oddsData, BET_TYPES.OVER_UNDER);
  if (!bet || !bet.values) return null;

  const over = bet.values.find(v => v.label === `Over ${line}`);
  const under = bet.values.find(v => v.label === `Under ${line}`);

  return {
    line,
    over: over?.odd || null,
    under: under?.odd || null,
  };
};

// Get BTTS odds from formatted data
export const getBTTSOdds = (oddsData) => {
  const bet = extractBetType(oddsData, BET_TYPES.BTTS);
  if (!bet || !bet.values) return null;

  const yes = bet.values.find(v => v.label === 'Yes');
  const no = bet.values.find(v => v.label === 'No');

  return {
    yes: yes?.odd || null,
    no: no?.odd || null,
  };
};

// Get Double Chance odds from formatted data
export const getDoubleChanceOdds = (oddsData) => {
  const bet = extractBetType(oddsData, BET_TYPES.DOUBLE_CHANCE);
  if (!bet || !bet.values) return null;

  const homeOrDraw = bet.values.find(v => v.label === 'Home/Draw');
  const homeOrAway = bet.values.find(v => v.label === 'Home/Away');
  const drawOrAway = bet.values.find(v => v.label === 'Draw/Away');

  return {
    homeOrDraw: homeOrDraw?.odd || null,
    homeOrAway: homeOrAway?.odd || null,
    drawOrAway: drawOrAway?.odd || null,
  };
};

// Get Handicap odds from formatted data
export const getHandicapOdds = (oddsData) => {
  const bet = extractBetType(oddsData, BET_TYPES.HANDICAP);
  if (!bet || !bet.values) return null;

  // Group by handicap value
  const handicaps = {};
  bet.values.forEach(v => {
    const match = v.label.match(/(Home|Away)\s*([+-]?\d+\.?\d*)/);
    if (match) {
      const team = match[1].toLowerCase();
      const value = match[2];
      if (!handicaps[value]) handicaps[value] = {};
      handicaps[value][team] = v.odd;
    }
  });

  return Object.entries(handicaps).map(([value, odds]) => ({
    handicap: value,
    home: odds.home || null,
    away: odds.away || null,
  }));
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Format fixture for display
export const formatFixture = (fixture) => {
  const { fixture: f, league, teams, goals, score } = fixture;

  const homeName = teams?.home?.name || 'TBD';
  const awayName = teams?.away?.name || 'TBD';

  return {
    id: f?.id,
    date: f?.date,
    time: f?.date ? new Date(f.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
    status: f?.status?.short || 'NS',
    minute: f?.status?.elapsed,
    league: {
      id: league?.id,
      name: league?.name || 'Unknown',
      country: league?.country,
      logo: league?.logo,
      // API fixtures endpoint'inde flag yok, country name'den generate ediyoruz
      flag: getCountryFlagUrl(league?.country) || league?.logo,
    },
    home: {
      id: teams?.home?.id,
      name: homeName,
      short: homeName.substring(0, 3).toUpperCase(),
      logo: teams?.home?.logo,
      score: goals?.home,
    },
    away: {
      id: teams?.away?.id,
      name: awayName,
      short: awayName.substring(0, 3).toUpperCase(),
      logo: teams?.away?.logo,
      score: goals?.away,
    },
    isLive: ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(f?.status?.short),
    isFinished: ['FT', 'AET', 'PEN'].includes(f?.status?.short),
    isNotStarted: f?.status?.short === 'NS',
  };
};

// Format prediction for display
export const formatPrediction = (prediction) => {
  if (!prediction || !prediction.predictions) return null;

  const { predictions, teams } = prediction;

  return {
    winner: predictions.winner?.name,
    winOrDraw: predictions.win_or_draw,
    underOver: predictions.under_over,
    goals: predictions.goals,
    advice: predictions.advice,
    percent: {
      home: parseInt(predictions.percent.home) || 0,
      draw: parseInt(predictions.percent.draw) || 0,
      away: parseInt(predictions.percent.away) || 0,
    },
    homeForm: teams.home?.league?.form || '',
    awayForm: teams.away?.league?.form || '',
    comparison: prediction.comparison,
  };
};

// Get fixture status text in Turkish
export const getStatusText = (status) => {
  const statusMap = {
    'NS': 'Başlamadı',
    '1H': '1. Yarı',
    'HT': 'Devre Arası',
    '2H': '2. Yarı',
    'ET': 'Uzatma',
    'BT': 'Uzatma Arası',
    'P': 'Penaltılar',
    'FT': 'Bitti',
    'AET': 'Uzatma Sonrası',
    'PEN': 'Penaltılar Sonrası',
    'SUSP': 'Ertelendi',
    'INT': 'Ara Verildi',
    'PST': 'Ertelendi',
    'CANC': 'İptal',
    'ABD': 'Yarıda Kaldı',
    'AWD': 'Hükmen',
    'WO': 'Hükmen',
  };
  return statusMap[status] || status;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE UTILITIES (Export for debugging/monitoring)
// ═══════════════════════════════════════════════════════════════════════════════

export const getApiCacheStats = getCacheStats;

export default {
  getTodayFixtures,
  getLiveFixtures,
  getFixturesByDate,
  getFixturesByLeague,
  getFixtureById,
  getFixtureStats,
  getFixtureEvents,
  getFixtureLineups,
  getHeadToHead,
  getPredictions,
  getLeagues,
  getPopularLeagues,
  getStandings,
  getTeamInfo,
  getTeamStats,
  // Explore Screen APIs
  getTopScorers,
  getTopAssists,
  getTopYellowCards,
  getTopRedCards,
  getTransfers,
  getInjuries,
  getFixtureInjuries,
  getSidelined,
  // Odds Screen APIs
  getFixtureOdds,
  getOddsByDate,
  getLiveOdds,
  getBetTypes,
  getBookmakers,
  getTodayOdds,
  // Odds Helpers
  BET_TYPES,
  formatOdds,
  extractBetType,
  get1X2Odds,
  getOverUnderOdds,
  getBTTSOdds,
  getDoubleChanceOdds,
  getHandicapOdds,
  // Helpers
  formatFixture,
  formatPrediction,
  getStatusText,
  getCountryFlagUrl,
  // Cache utilities
  getApiCacheStats,
};
