/**
 * Error Logger Utility
 * Merkezi hata loglama sistemi - production'da crash analytics entegrasyonu için hazır
 *
 * Kullanım:
 * import { logError, logWarning } from '../utils/errorLogger';
 *
 * try {
 *   // kod
 * } catch (error) {
 *   logError('ServiceName', 'functionName', error);
 * }
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Production'da Sentry/Crashlytics entegrasyonu için bu fonksiyonu güncelleyin
const reportToAnalytics = (level, context, error) => {
  // TODO: Production'da Sentry veya Crashlytics entegrasyonu ekleyin
  // Örnek Sentry kullanımı:
  // if (!__DEV__) {
  //   Sentry.captureException(error, { extra: { context, level } });
  // }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hata logla (error seviyesi)
 * @param {string} service - Servis adı (örn: 'FootballApi', 'CacheService')
 * @param {string} operation - İşlem adı (örn: 'fetchFixtures', 'saveCache')
 * @param {Error|string} error - Hata objesi veya mesajı
 * @param {Object} [extra] - Ek bilgiler (opsiyonel)
 */
export const logError = (service, operation, error, extra = {}) => {
  const context = `[${service}] ${operation}`;
  const message = error?.message || String(error);

  if (__DEV__) {
    console.error(`❌ ${context}:`, message, extra);
    if (error?.stack) {
      console.error('Stack:', error.stack);
    }
  }

  reportToAnalytics('error', context, error);
};

/**
 * Uyarı logla (warning seviyesi)
 * @param {string} service - Servis adı
 * @param {string} operation - İşlem adı
 * @param {string} message - Uyarı mesajı
 * @param {Object} [extra] - Ek bilgiler (opsiyonel)
 */
export const logWarning = (service, operation, message, extra = {}) => {
  const context = `[${service}] ${operation}`;

  if (__DEV__) {
    console.warn(`⚠️ ${context}:`, message, extra);
  }

  reportToAnalytics('warning', context, new Error(message));
};

/**
 * Bilgi logla (info seviyesi) - sadece development'ta
 * @param {string} service - Servis adı
 * @param {string} operation - İşlem adı
 * @param {string} message - Bilgi mesajı
 * @param {Object} [extra] - Ek bilgiler (opsiyonel)
 */
export const logInfo = (service, operation, message, extra = {}) => {
  if (__DEV__) {
    const context = `[${service}] ${operation}`;
    console.log(`ℹ️ ${context}:`, message, extra);
  }
};

/**
 * API hatası logla (özel formatlama)
 * @param {string} endpoint - API endpoint
 * @param {number} statusCode - HTTP status kodu
 * @param {Error|string} error - Hata
 */
export const logApiError = (endpoint, statusCode, error) => {
  logError('API', endpoint, error, { statusCode });
};

/**
 * Cache hatası logla
 * @param {string} operation - Cache işlemi (get/set/delete)
 * @param {string} key - Cache anahtarı
 * @param {Error|string} error - Hata
 */
export const logCacheError = (operation, key, error) => {
  logError('Cache', operation, error, { cacheKey: key });
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  logError,
  logWarning,
  logInfo,
  logApiError,
  logCacheError,
};
