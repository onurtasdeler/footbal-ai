// Football API Service
// API-Football v3 Integration

import { API_FOOTBALL_KEY, API_FOOTBALL_URL } from '@env';

const API_KEY = API_FOOTBALL_KEY;
const BASE_URL = API_FOOTBALL_URL || 'https://v3.football.api-sports.io';

// Rate limiting: Pro plan = 300 req/min
let requestCount = 0;
let lastResetTime = Date.now();

const headers = {
  'x-apisports-key': API_KEY,
};

// Helper function for API calls with rate limiting
const apiCall = async (endpoint, params = {}) => {
  // Pro plan rate limiting (300 req/min)
  const now = Date.now();
  if (now - lastResetTime >= 60000) {
    // Reset counter every minute
    requestCount = 0;
    lastResetTime = now;
  }

  requestCount++;
  if (requestCount > 280) { // Safety margin
    const waitTime = 60000 - (now - lastResetTime);
    console.warn(`Rate limit approaching (${requestCount}/300), waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 1;
    lastResetTime = Date.now();
  }

  const queryString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API Error:', data.errors);
      throw new Error(Object.values(data.errors).join(', '));
    }

    return data.response || [];
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES (Matches)
// ═══════════════════════════════════════════════════════════════════════════════

// Get today's fixtures
export const getTodayFixtures = async (timezone = 'Europe/Istanbul') => {
  const today = new Date().toISOString().split('T')[0];
  return apiCall('fixtures', { date: today, timezone });
};

// Get live fixtures
export const getLiveFixtures = async () => {
  return apiCall('fixtures', { live: 'all' });
};

// Get fixtures by date
export const getFixturesByDate = async (date, timezone = 'Europe/Istanbul') => {
  return apiCall('fixtures', { date, timezone });
};

// Get fixtures by league and season
export const getFixturesByLeague = async (leagueId, season, options = {}) => {
  return apiCall('fixtures', {
    league: leagueId,
    season,
    ...options
  });
};

// Get single fixture details
export const getFixtureById = async (fixtureId) => {
  return apiCall('fixtures', { id: fixtureId });
};

// Get fixture statistics
export const getFixtureStats = async (fixtureId) => {
  return apiCall('fixtures/statistics', { fixture: fixtureId });
};

// Get fixture events (goals, cards, subs)
export const getFixtureEvents = async (fixtureId) => {
  return apiCall('fixtures/events', { fixture: fixtureId });
};

// Get fixture lineups
export const getFixtureLineups = async (fixtureId) => {
  return apiCall('fixtures/lineups', { fixture: fixtureId });
};

// Get head to head
export const getHeadToHead = async (team1Id, team2Id, last = 10) => {
  return apiCall('fixtures/headtohead', { h2h: `${team1Id}-${team2Id}`, last });
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Get AI predictions for a fixture
export const getPredictions = async (fixtureId) => {
  return apiCall('predictions', { fixture: fixtureId });
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEAGUES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all leagues
export const getLeagues = async (options = {}) => {
  return apiCall('leagues', options);
};

// Get popular leagues (top 5 European + Turkey)
export const getPopularLeagues = async () => {
  const popularIds = [39, 140, 135, 78, 61, 203]; // PL, La Liga, Serie A, Bundesliga, Ligue 1, Super Lig
  const season = new Date().getFullYear();
  return apiCall('leagues', { id: popularIds.join('-'), season });
};

// ═══════════════════════════════════════════════════════════════════════════════
// STANDINGS
// ═══════════════════════════════════════════════════════════════════════════════

// Get league standings
export const getStandings = async (leagueId, season) => {
  return apiCall('standings', { league: leagueId, season });
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════════════════════

// Get team info
export const getTeamInfo = async (teamId) => {
  return apiCall('teams', { id: teamId });
};

// Get team statistics
export const getTeamStats = async (teamId, leagueId, season) => {
  return apiCall('teams/statistics', { team: teamId, league: leagueId, season });
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
  formatFixture,
  formatPrediction,
  getStatusText,
};
