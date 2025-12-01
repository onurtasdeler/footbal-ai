import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE SERVICE - Shared Analysis Cache for All Users
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jyqyibzwalxxzupqgfew.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cXlpYnp3YWx4eHp1cHFnZmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODc3NDgsImV4cCI6MjA3OTc2Mzc0OH0.IPYD7qyM2EoiBKmm759OA8KHQZGSvMe_cmrjYJI5Wec';

// Cache TTL in hours
const CACHE_TTL_HOURS = 24;

// Create Supabase client - exported for Edge Function calls
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS CACHE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get shared analysis from Supabase
 * @param {number} fixtureId - The fixture ID
 * @returns {Promise<Object|null>} Analysis data or null if not found/expired
 */
export const getSharedAnalysis = async (fixtureId) => {
  try {
    const { data, error } = await supabase
      .from('match_analyses')
      .select('analysis, expires_at')
      .eq('fixture_id', fixtureId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Delete expired entry
      await deleteAnalysis(fixtureId);
      return null;
    }

    return data.analysis;
  } catch (error) {
    return null;
  }
};

/**
 * Save analysis to Supabase for all users to access
 * @param {number} fixtureId - The fixture ID
 * @param {Object} analysis - The analysis data
 * @param {string} matchDate - The match date
 * @returns {Promise<boolean>} Success status
 */
export const saveSharedAnalysis = async (fixtureId, analysis, matchDate) => {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    const { error } = await supabase
      .from('match_analyses')
      .upsert({
        fixture_id: fixtureId,
        analysis: analysis,
        match_date: matchDate,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'fixture_id',
      });

    return !error;
  } catch (error) {
    return false;
  }
};

/**
 * Delete analysis from Supabase
 * @param {number} fixtureId - The fixture ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteAnalysis = async (fixtureId) => {
  try {
    const { error } = await supabase
      .from('match_analyses')
      .delete()
      .eq('fixture_id', fixtureId);

    return !error;
  } catch (error) {
    return false;
  }
};

/**
 * Check if analysis exists in Supabase
 * @param {number} fixtureId - The fixture ID
 * @returns {Promise<boolean>} True if analysis exists and not expired
 */
export const hasSharedAnalysis = async (fixtureId) => {
  const analysis = await getSharedAnalysis(fixtureId);
  return analysis !== null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTION CACHE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get shared prediction from Supabase
 * @param {number} fixtureId - The fixture ID
 * @returns {Promise<Object|null>} Prediction data or null if not found/expired
 */
export const getSharedPrediction = async (fixtureId) => {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select('prediction, expires_at')
      .eq('fixture_id', fixtureId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      await deletePrediction(fixtureId);
      return null;
    }

    return data.prediction;
  } catch (error) {
    return null;
  }
};

/**
 * Save prediction to Supabase for all users to access
 * @param {number} fixtureId - The fixture ID
 * @param {Object} prediction - The prediction data
 * @param {string} matchDate - The match date
 * @returns {Promise<boolean>} Success status
 */
export const saveSharedPrediction = async (fixtureId, prediction, matchDate) => {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    const { error } = await supabase
      .from('match_predictions')
      .upsert({
        fixture_id: fixtureId,
        prediction: prediction,
        match_date: matchDate,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'fixture_id',
      });

    return !error;
  } catch (error) {
    return false;
  }
};

/**
 * Delete prediction from Supabase
 * @param {number} fixtureId - The fixture ID
 * @returns {Promise<boolean>} Success status
 */
export const deletePrediction = async (fixtureId) => {
  try {
    const { error } = await supabase
      .from('match_predictions')
      .delete()
      .eq('fixture_id', fixtureId);

    return !error;
  } catch (error) {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get multiple analyses at once
 * @param {number[]} fixtureIds - Array of fixture IDs
 * @returns {Promise<Object>} Map of fixtureId -> analysis
 */
export const getMultipleAnalyses = async (fixtureIds) => {
  try {
    const { data, error } = await supabase
      .from('match_analyses')
      .select('fixture_id, analysis, expires_at')
      .in('fixture_id', fixtureIds)
      .gt('expires_at', new Date().toISOString());

    if (error || !data) {
      return {};
    }

    const result = {};
    data.forEach((item) => {
      result[item.fixture_id] = item.analysis;
    });

    return result;
  } catch (error) {
    return {};
  }
};

/**
 * Get multiple predictions at once
 * @param {number[]} fixtureIds - Array of fixture IDs
 * @returns {Promise<Object>} Map of fixtureId -> prediction
 */
export const getMultiplePredictions = async (fixtureIds) => {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select('fixture_id, prediction, expires_at')
      .in('fixture_id', fixtureIds)
      .gt('expires_at', new Date().toISOString());

    if (error || !data) {
      return {};
    }

    const result = {};
    data.forEach((item) => {
      result[item.fixture_id] = item.prediction;
    });

    return result;
  } catch (error) {
    return {};
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean up expired entries (can be called periodically)
 * @returns {Promise<{analyses: number, predictions: number}>} Count of deleted entries
 */
export const cleanupExpired = async () => {
  try {
    const now = new Date().toISOString();

    const { count: analysesDeleted } = await supabase
      .from('match_analyses')
      .delete()
      .lt('expires_at', now)
      .select('*', { count: 'exact', head: true });

    const { count: predictionsDeleted } = await supabase
      .from('match_predictions')
      .delete()
      .lt('expires_at', now)
      .select('*', { count: 'exact', head: true });

    return {
      analyses: analysesDeleted || 0,
      predictions: predictionsDeleted || 0,
    };
  } catch (error) {
    return { analyses: 0, predictions: 0 };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTBALL DATA CACHE FUNCTIONS
// Server-side cached data from sync-football-data Edge Function
// ═══════════════════════════════════════════════════════════════════════════════

// TTL values in hours (must match Edge Function sync intervals)
const CACHE_TTL = {
  fixtures: 1,    // 1 hour
  standings: 1,   // 1 hour
  leagues: 24,    // 24 hours
  teams: 24,      // 24 hours
  injuries: 2,    // 2 hours
};

/**
 * Check if cached data is stale based on TTL
 * @param {string} updatedAt - ISO timestamp
 * @param {number} ttlHours - TTL in hours
 * @returns {boolean} True if data is stale
 */
const isCacheStale = (updatedAt, ttlHours) => {
  if (!updatedAt) return true;
  const updatedTime = new Date(updatedAt).getTime();
  const staleTime = updatedTime + (ttlHours * 60 * 60 * 1000);
  return Date.now() > staleTime;
};

/**
 * Get cached fixtures for a specific date
 * @param {string} date - Date in YYYY-MM-DD format (default: today)
 * @returns {Promise<{data: Array, is_stale: boolean, updated_at: string}|null>}
 */
export const getFixturesCache = async (date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('fixtures_cache')
      .select('data, updated_at, fixture_count')
      .eq('date', targetDate)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      data: data.data || [],
      is_stale: isCacheStale(data.updated_at, CACHE_TTL.fixtures),
      updated_at: data.updated_at,
      fixture_count: data.fixture_count,
    };
  } catch (error) {
    __DEV__ && console.error('[SupabaseCache] getFixturesCache error:', error);
    return null;
  }
};

/**
 * Get cached standings for a league
 * @param {number} leagueId - League ID
 * @param {number} season - Season year (default: current year)
 * @returns {Promise<{data: Object, is_stale: boolean, updated_at: string}|null>}
 */
export const getStandingsCache = async (leagueId, season = null) => {
  try {
    const targetSeason = season || new Date().getFullYear();

    const { data, error } = await supabase
      .from('standings_cache')
      .select('data, updated_at')
      .eq('league_id', leagueId)
      .eq('season', targetSeason)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      data: data.data,
      is_stale: isCacheStale(data.updated_at, CACHE_TTL.standings),
      updated_at: data.updated_at,
    };
  } catch (error) {
    __DEV__ && console.error('[SupabaseCache] getStandingsCache error:', error);
    return null;
  }
};

/**
 * Get cached leagues list
 * @returns {Promise<{data: Array, is_stale: boolean, updated_at: string}|null>}
 */
export const getLeaguesCache = async () => {
  try {
    const { data, error } = await supabase
      .from('leagues_cache')
      .select('league_id, data, updated_at')
      .order('league_id');

    if (error || !data || data.length === 0) {
      return null;
    }

    // Find oldest update time for staleness check
    const oldestUpdate = data.reduce((oldest, item) => {
      const itemTime = new Date(item.updated_at).getTime();
      return itemTime < oldest ? itemTime : oldest;
    }, Date.now());

    return {
      data: data.map(item => item.data),
      is_stale: isCacheStale(new Date(oldestUpdate).toISOString(), CACHE_TTL.leagues),
      updated_at: new Date(oldestUpdate).toISOString(),
      count: data.length,
    };
  } catch (error) {
    __DEV__ && console.error('[SupabaseCache] getLeaguesCache error:', error);
    return null;
  }
};

/**
 * Get cached team information
 * @param {number} teamId - Team ID
 * @returns {Promise<{data: Object, is_stale: boolean, updated_at: string}|null>}
 */
export const getTeamCache = async (teamId) => {
  try {
    const { data, error } = await supabase
      .from('teams_cache')
      .select('data, updated_at')
      .eq('team_id', teamId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      data: data.data,
      is_stale: isCacheStale(data.updated_at, CACHE_TTL.teams),
      updated_at: data.updated_at,
    };
  } catch (error) {
    __DEV__ && console.error('[SupabaseCache] getTeamCache error:', error);
    return null;
  }
};

/**
 * Get multiple teams at once
 * @param {number[]} teamIds - Array of team IDs
 * @returns {Promise<Object>} Map of teamId -> team data
 */
export const getMultipleTeamsCache = async (teamIds) => {
  try {
    const { data, error } = await supabase
      .from('teams_cache')
      .select('team_id, data, updated_at')
      .in('team_id', teamIds);

    if (error || !data) {
      return {};
    }

    const result = {};
    data.forEach((item) => {
      result[item.team_id] = {
        data: item.data,
        is_stale: isCacheStale(item.updated_at, CACHE_TTL.teams),
      };
    });

    return result;
  } catch (error) {
    __DEV__ && console.error('[SupabaseCache] getMultipleTeamsCache error:', error);
    return {};
  }
};

/**
 * Get cached injuries for a league
 * @param {number} leagueId - League ID
 * @param {number} season - Season year (default: current year)
 * @returns {Promise<{data: Array, is_stale: boolean, updated_at: string}|null>}
 */
export const getInjuriesCache = async (leagueId, season = null) => {
  try {
    const targetSeason = season || new Date().getFullYear();

    const { data, error } = await supabase
      .from('injuries_cache')
      .select('data, updated_at')
      .eq('league_id', leagueId)
      .eq('season', targetSeason)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      data: data.data || [],
      is_stale: isCacheStale(data.updated_at, CACHE_TTL.injuries),
      updated_at: data.updated_at,
    };
  } catch (error) {
    __DEV__ && console.error('[SupabaseCache] getInjuriesCache error:', error);
    return null;
  }
};

/**
 * Get sync log status
 * @param {string} syncType - Type of sync (fixtures, standings, etc.)
 * @param {number} limit - Number of recent logs to fetch
 * @returns {Promise<Array>} Recent sync logs
 */
export const getSyncLogs = async (syncType = null, limit = 10) => {
  try {
    let query = supabase
      .from('sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (syncType) {
      query = query.eq('sync_type', syncType);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    __DEV__ && console.error('[SupabaseCache] getSyncLogs error:', error);
    return [];
  }
};

// Export default
export default {
  // Analysis
  getSharedAnalysis,
  saveSharedAnalysis,
  deleteAnalysis,
  hasSharedAnalysis,
  getMultipleAnalyses,

  // Predictions
  getSharedPrediction,
  saveSharedPrediction,
  deletePrediction,
  getMultiplePredictions,

  // Football Data Cache (read-only from cron sync)
  getFixturesCache,
  getStandingsCache,
  getLeaguesCache,
  getTeamCache,
  getMultipleTeamsCache,
  getInjuriesCache,
  getSyncLogs,

  // Cleanup
  cleanupExpired,

  // Client (for advanced usage)
  supabase,
};
