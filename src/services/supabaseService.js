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

  // Cleanup
  cleanupExpired,

  // Client (for advanced usage)
  supabase,
};
