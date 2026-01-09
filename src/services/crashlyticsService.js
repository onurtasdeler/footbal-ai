/**
 * Firebase Crashlytics Service
 * Crash reporting ve error tracking için
 *
 * NOT: Expo Go'da çalışmaz - sadece development/production build'lerde aktif
 */

import Constants from 'expo-constants';

// Expo Go'da Firebase native modülleri yok - conditional import
const isExpoGo = Constants.appOwnership === 'expo';

let crashlytics = null;
if (!isExpoGo) {
  try {
    crashlytics = require('@react-native-firebase/crashlytics').default;
  } catch {
    // Native module not available
  }
}

// Helper: Crashlytics mevcut mu kontrol et
const isCrashlyticsAvailable = () => crashlytics !== null;

// ═══════════════════════════════════════════════════════════════════════════════
// CRASHLYTICS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crashlytics'i başlat
 * App.js veya index.js'de çağrılmalı
 */
export const initCrashlytics = async () => {
  if (!isCrashlyticsAvailable()) {
    __DEV__ && console.log('[Crashlytics] Skipped - running in Expo Go');
    return;
  }

  try {
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    __DEV__ && console.log('[Crashlytics] Initialized successfully');
  } catch (error) {
    __DEV__ && console.error('[Crashlytics] Init error:', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kullanıcı ID'si ayarla (anonim ID kullanılabilir)
 * @param {string} userId - Kullanıcı ID
 */
export const setUserId = async (userId) => {
  if (!isCrashlyticsAvailable()) return;
  try {
    await crashlytics().setUserId(userId);
  } catch {
    // Silent fail
  }
};

/**
 * Kullanıcı attribute'u ayarla
 * @param {string} key - Attribute key
 * @param {string} value - Attribute value
 */
export const setUserAttribute = async (key, value) => {
  if (!isCrashlyticsAvailable()) return;
  try {
    await crashlytics().setAttribute(key, String(value));
  } catch {
    // Silent fail
  }
};

/**
 * Birden fazla attribute ayarla
 * @param {Object} attributes - Key-value pairs
 */
export const setUserAttributes = async (attributes) => {
  if (!isCrashlyticsAvailable()) return;
  try {
    await crashlytics().setAttributes(attributes);
  } catch {
    // Silent fail
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hata logla (crash olmadan)
 * @param {Error} error - Error object
 */
export const logError = (error) => {
  if (!isCrashlyticsAvailable()) return;
  try {
    crashlytics().recordError(error);
    __DEV__ && console.log('[Crashlytics] Error recorded:', error.message);
  } catch {
    // Silent fail
  }
};

/**
 * Custom mesaj logla
 * @param {string} message - Log message
 */
export const log = (message) => {
  if (!isCrashlyticsAvailable()) return;
  try {
    crashlytics().log(message);
  } catch {
    // Silent fail
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Navigasyon değişikliğini logla
 * @param {string} screenName - Ekran adı
 */
export const logScreenView = (screenName) => {
  log(`Screen: ${screenName}`);
};

/**
 * API çağrısını logla
 * @param {string} endpoint - API endpoint
 * @param {string} status - success/error
 */
export const logApiCall = (endpoint, status) => {
  log(`API: ${endpoint} - ${status}`);
};

/**
 * Kullanıcı aksiyonunu logla
 * @param {string} action - Aksiyon adı
 */
export const logUserAction = (action) => {
  log(`Action: ${action}`);
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subscription durumunu ayarla
 * @param {boolean} isPro - PRO kullanıcı mı
 */
export const setSubscriptionStatus = async (isPro) => {
  await setUserAttribute('subscription', isPro ? 'pro' : 'free');
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES (Development only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test crash tetikle (SADECE TEST İÇİN!)
 * Production'da çağırma!
 */
export const testCrash = () => {
  if (!isCrashlyticsAvailable()) {
    __DEV__ && console.warn('[Crashlytics] Test crash skipped - not available');
    return;
  }
  if (__DEV__) {
    console.warn('[Crashlytics] Test crash triggered!');
    crashlytics().crash();
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  initCrashlytics,
  setUserId,
  setUserAttribute,
  setUserAttributes,
  logError,
  log,
  logScreenView,
  logApiCall,
  logUserAction,
  setSubscriptionStatus,
  testCrash,
  isCrashlyticsAvailable,
};
