/**
 * Firebase Analytics Service
 * Realtime analytics tracking for Goalwise app
 *
 * Note: Firebase Analytics only works in development builds (not Expo Go)
 * In Expo Go, events are logged to console for debugging
 */

let analytics = null;
let isFirebaseAvailable = false;

// Try to import Firebase Analytics
try {
  analytics = require('@react-native-firebase/analytics').default;
  isFirebaseAvailable = true;
} catch (error) {
  __DEV__ && console.log('[Analytics] Firebase not available, using mock mode');
}

// Helper to log or mock
const logEvent = async (eventName, params = {}) => {
  if (isFirebaseAvailable && analytics) {
    try {
      await analytics().logEvent(eventName, params);
    } catch (error) {
      __DEV__ && console.warn(`[Analytics] Error logging ${eventName}:`, error.message);
    }
  } else {
    // Mock mode - log to console in development
    if (__DEV__) {
      console.log(`[Analytics Mock] ${eventName}:`, params);
    }
  }
};

// Screen tracking
export const logScreenView = async (screenName, screenClass) => {
  if (isFirebaseAvailable && analytics) {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      __DEV__ && console.warn('[Analytics] Screen view error:', error.message);
    }
  } else if (__DEV__) {
    console.log(`[Analytics Mock] Screen: ${screenName}`);
  }
};

// Match events
export const logMatchView = async (fixtureId, homeTeam, awayTeam, league) => {
  await logEvent('match_view', {
    fixture_id: String(fixtureId),
    home_team: homeTeam,
    away_team: awayTeam,
    league: league,
  });
};

export const logAnalysisRequest = async (fixtureId, homeTeam, awayTeam) => {
  await logEvent('analysis_request', {
    fixture_id: String(fixtureId),
    home_team: homeTeam,
    away_team: awayTeam,
  });
};

export const logAnalysisComplete = async (fixtureId, confidence, winner) => {
  await logEvent('analysis_complete', {
    fixture_id: String(fixtureId),
    confidence: confidence,
    predicted_winner: winner,
  });
};

// Rate limit events
export const logRateLimitHit = async (screen) => {
  await logEvent('rate_limit_hit', {
    screen: screen,
  });
};

// Subscription events
export const logPaywallView = async (source) => {
  await logEvent('paywall_view', {
    source: source,
  });
};

export const logSubscriptionStart = async (productId, price) => {
  await logEvent('subscription_start', {
    product_id: productId,
    price: String(price),
  });
};

// User engagement
export const logSearch = async (searchTerm) => {
  if (isFirebaseAvailable && analytics) {
    try {
      await analytics().logSearch({
        search_term: searchTerm,
      });
    } catch (error) {
      __DEV__ && console.warn('[Analytics] Search error:', error.message);
    }
  } else if (__DEV__) {
    console.log(`[Analytics Mock] Search: ${searchTerm}`);
  }
};

export const logFavoriteTeam = async (teamId, teamName, action) => {
  await logEvent('favorite_team', {
    team_id: String(teamId),
    team_name: teamName,
    action: action, // 'add' or 'remove'
  });
};

export const logLeagueFilter = async (leagueId, leagueName) => {
  await logEvent('league_filter', {
    league_id: String(leagueId),
    league_name: leagueName,
  });
};

// Tab navigation
export const logTabChange = async (tabName) => {
  await logEvent('tab_change', {
    tab_name: tabName,
  });
};

// App lifecycle
export const logAppOpen = async () => {
  if (isFirebaseAvailable && analytics) {
    try {
      await analytics().logAppOpen();
    } catch (error) {
      __DEV__ && console.warn('[Analytics] App open error:', error.message);
    }
  } else if (__DEV__) {
    console.log('[Analytics Mock] App opened');
  }
};

// Set user properties
export const setUserProperty = async (name, value) => {
  if (isFirebaseAvailable && analytics) {
    try {
      await analytics().setUserProperty(name, value);
    } catch (error) {
      __DEV__ && console.warn('[Analytics] Set user property error:', error.message);
    }
  } else if (__DEV__) {
    console.log(`[Analytics Mock] User property: ${name}=${value}`);
  }
};

// Set user ID (for logged in users)
export const setUserId = async (userId) => {
  if (isFirebaseAvailable && analytics) {
    try {
      await analytics().setUserId(userId);
    } catch (error) {
      __DEV__ && console.warn('[Analytics] Set user id error:', error.message);
    }
  } else if (__DEV__) {
    console.log(`[Analytics Mock] User ID: ${userId}`);
  }
};

// Prediction events
export const logPredictionView = async (fixtureId, predictionType) => {
  await logEvent('prediction_view', {
    fixture_id: String(fixtureId),
    prediction_type: predictionType,
  });
};

// Date tab change
export const logDateChange = async (date) => {
  await logEvent('date_change', {
    selected_date: date,
  });
};

// Live match tracking
export const logLiveMatchView = async (fixtureId, homeTeam, awayTeam, minute) => {
  await logEvent('live_match_view', {
    fixture_id: String(fixtureId),
    home_team: homeTeam,
    away_team: awayTeam,
    match_minute: String(minute),
  });
};

// Error tracking
export const logError = async (errorType, errorMessage, screen) => {
  await logEvent('app_error', {
    error_type: errorType,
    error_message: errorMessage?.substring(0, 100) || 'unknown',
    screen: screen,
  });
};

// Check if Firebase is available
export const isAnalyticsAvailable = () => isFirebaseAvailable;

export default {
  logScreenView,
  logMatchView,
  logAnalysisRequest,
  logAnalysisComplete,
  logRateLimitHit,
  logPaywallView,
  logSubscriptionStart,
  logSearch,
  logFavoriteTeam,
  logLeagueFilter,
  logTabChange,
  logAppOpen,
  setUserProperty,
  setUserId,
  logPredictionView,
  logDateChange,
  logLiveMatchView,
  logError,
  isAnalyticsAvailable,
};
