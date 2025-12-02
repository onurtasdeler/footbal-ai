import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW SERVICE - In-App Review Prompt Management
// iOS: SKStoreReviewController (max 3/year, OS-enforced)
// Android: Google Play In-App Review API (quota-based)
// ═══════════════════════════════════════════════════════════════════════════════

const REVIEW_STATE_KEY = '@review_state';

// Configuration
const CONFIG = {
  MIN_ANALYSIS_COUNT: 1,      // Prompt after first analysis
  MIN_DAYS_BETWEEN: 14,       // Minimum 14 days between prompts
  DELAY_MS: 5000,             // 5 second delay after analysis
  MAX_PROMPTS_PER_YEAR: 3,    // iOS limit (we track even though OS enforces)
};

const DEFAULT_STATE = {
  lastPromptDate: null,
  promptCount: 0,
  analysisCount: 0,
  hasReviewed: false,
  firstAnalysisDate: null,
};

/**
 * Get current review state from storage
 */
const getReviewState = async () => {
  try {
    const data = await AsyncStorage.getItem(REVIEW_STATE_KEY);
    return data ? JSON.parse(data) : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

/**
 * Save review state to storage
 */
const saveReviewState = async (state) => {
  try {
    await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // Silent fail - don't disrupt user experience
  }
};

/**
 * Increment analysis count - call this after each successful AI analysis
 */
export const incrementAnalysisCount = async () => {
  const state = await getReviewState();
  state.analysisCount += 1;

  if (!state.firstAnalysisDate) {
    state.firstAnalysisDate = new Date().toISOString();
  }

  await saveReviewState(state);
  return state.analysisCount;
};

/**
 * Check if we should prompt for review based on conditions
 */
export const shouldPromptReview = async () => {
  const state = await getReviewState();

  // Already reviewed - never prompt again
  if (state.hasReviewed) {
    return false;
  }

  // Check minimum analysis count
  if (state.analysisCount < CONFIG.MIN_ANALYSIS_COUNT) {
    return false;
  }

  // Check if enough days passed since last prompt
  if (state.lastPromptDate) {
    const lastPrompt = new Date(state.lastPromptDate);
    const now = new Date();
    const daysSinceLast = (now - lastPrompt) / (1000 * 60 * 60 * 24);

    if (daysSinceLast < CONFIG.MIN_DAYS_BETWEEN) {
      return false;
    }
  }

  // Check yearly prompt limit (extra safety, iOS enforces this anyway)
  if (state.promptCount >= CONFIG.MAX_PROMPTS_PER_YEAR) {
    const firstPromptYear = state.firstAnalysisDate
      ? new Date(state.firstAnalysisDate).getFullYear()
      : new Date().getFullYear();
    const currentYear = new Date().getFullYear();

    // Reset count if new year
    if (currentYear > firstPromptYear) {
      state.promptCount = 0;
      await saveReviewState(state);
    } else {
      return false;
    }
  }

  return true;
};

/**
 * Show the native review dialog
 * Returns true if dialog was shown, false otherwise
 */
export const promptReview = async () => {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();

    if (!isAvailable) {
      return false;
    }

    // Update state before showing (in case user dismisses quickly)
    const state = await getReviewState();
    state.lastPromptDate = new Date().toISOString();
    state.promptCount += 1;
    await saveReviewState(state);

    // Show native review dialog
    await StoreReview.requestReview();

    return true;
  } catch {
    return false;
  }
};

/**
 * Mark that user has reviewed (call if you have feedback that user completed review)
 * Note: Native APIs don't provide this info, so this is optional
 */
export const markAsReviewed = async () => {
  const state = await getReviewState();
  state.hasReviewed = true;
  await saveReviewState(state);
};

/**
 * Main function to check conditions and prompt review with delay
 * Call this after AI analysis completes
 */
export const checkAndPromptReview = async () => {
  try {
    // First increment analysis count
    await incrementAnalysisCount();

    // Check if should prompt
    const shouldPrompt = await shouldPromptReview();

    if (!shouldPrompt) {
      return false;
    }

    // Wait configured delay (let user see the analysis first)
    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MS));

    // Show review prompt
    return await promptReview();
  } catch {
    // Silent fail - never disrupt user experience
    return false;
  }
};

/**
 * Check if store review is available on this platform/device
 */
export const isReviewAvailable = async () => {
  try {
    return await StoreReview.isAvailableAsync();
  } catch {
    return false;
  }
};

/**
 * Get current review state (for debugging/analytics)
 */
export const getReviewStats = async () => {
  const state = await getReviewState();
  return {
    ...state,
    platform: Platform.OS,
    config: CONFIG,
  };
};

/**
 * Reset review state (for testing only)
 */
export const resetReviewState = async () => {
  await AsyncStorage.removeItem(REVIEW_STATE_KEY);
};

export default {
  checkAndPromptReview,
  incrementAnalysisCount,
  shouldPromptReview,
  promptReview,
  markAsReviewed,
  isReviewAvailable,
  getReviewStats,
  resetReviewState,
};
