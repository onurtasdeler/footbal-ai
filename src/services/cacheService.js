/**
 * Cache Service - API Maliyet Optimizasyonu
 * AsyncStorage ile akıllı önbellekleme sistemi
 * AI analizi + Genel API cache
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logCacheError } from '../utils/errorLogger';

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const AI_CACHE_PREFIX = 'ai_analysis_';
const API_CACHE_PREFIX = '@api_cache_';
const ONBOARDING_KEY = '@goalwise_onboarding_completed';
const MATCH_FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];

// Cache süreleri (milisaniye)
export const CACHE_DURATIONS = {
  // Canlı veriler - kısa cache
  LIVE_FIXTURES: 30 * 1000,           // 30 saniye
  TODAY_FIXTURES: 60 * 1000,          // 1 dakika
  FIXTURE_DETAILS: 60 * 1000,         // 1 dakika
  FIXTURE_STATS: 30 * 1000,           // 30 saniye
  FIXTURE_EVENTS: 30 * 1000,          // 30 saniye

  // Yarı statik veriler - orta cache
  FIXTURE_LINEUPS: 5 * 60 * 1000,     // 5 dakika
  STANDINGS: 30 * 60 * 1000,          // 30 dakika
  PREDICTIONS: 30 * 60 * 1000,        // 30 dakika
  HEAD_TO_HEAD: 60 * 60 * 1000,       // 1 saat

  // Statik veriler - uzun cache
  TOP_SCORERS: 60 * 60 * 1000,        // 1 saat
  TOP_ASSISTS: 60 * 60 * 1000,        // 1 saat
  TOP_CARDS: 60 * 60 * 1000,          // 1 saat
  INJURIES: 2 * 60 * 60 * 1000,       // 2 saat
  TRANSFERS: 6 * 60 * 60 * 1000,      // 6 saat

  // Çok nadir değişen - çok uzun cache
  LEAGUES: 24 * 60 * 60 * 1000,       // 1 gün
  TEAM_INFO: 24 * 60 * 60 * 1000,     // 1 gün
  TEAM_STATS: 6 * 60 * 60 * 1000,     // 6 saat

  // Özel durumlar
  FINISHED_MATCH: 7 * 24 * 60 * 60 * 1000, // 7 gün - biten maçlar
};

// İstatistikler
let cacheStats = {
  hits: 0,
  misses: 0,
  saves: 0,
  apiCallsSaved: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING FONKSİYONLARI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Onboarding tamamlandı mı kontrol et
 * @returns {Promise<boolean>} - Onboarding tamamlandıysa true
 */
export const hasCompletedOnboarding = async () => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    logCacheError('hasCompletedOnboarding', ONBOARDING_KEY, error);
    return false;
  }
};

/**
 * Onboarding tamamlandı olarak işaretle
 * @returns {Promise<boolean>} - Başarılı mı
 */
export const setOnboardingCompleted = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    return true;
  } catch (error) {
    logCacheError('setOnboardingCompleted', ONBOARDING_KEY, error);
    return false;
  }
};

/**
 * Onboarding durumunu sıfırla (test için)
 * @returns {Promise<boolean>} - Başarılı mı
 */
export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    return true;
  } catch (error) {
    logCacheError('resetOnboarding', ONBOARDING_KEY, error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GENEL API CACHE FONKSİYONLARI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache key oluşturucu
 * @param {string} base - Base key
 * @param {Object} params - Parametreler
 * @returns {string} - Unique cache key
 */
export const buildCacheKey = (base, params = {}) => {
  const paramStr = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('_');

  return paramStr ? `${base}_${paramStr}` : base;
};

/**
 * Cache'den veri al
 * @param {string} key - Cache anahtarı
 * @param {number} maxAge - Maksimum cache yaşı (ms)
 * @returns {Promise<any|null>} - Cache'deki veri veya null
 */
export const getFromCache = async (key, maxAge = CACHE_DURATIONS.TODAY_FIXTURES) => {
  try {
    const cacheKey = API_CACHE_PREFIX + key;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) {
      cacheStats.misses++;
      return null;
    }

    const { data, timestamp, requestCount = 1 } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // Cache süresi dolmuş mu?
    if (age > maxAge) {
      cacheStats.misses++;
      return null;
    }

    cacheStats.hits++;
    cacheStats.apiCallsSaved += requestCount;

    return data;
  } catch (error) {
    logCacheError('getFromCache', key, error);
    return null;
  }
};

/**
 * Cache'e veri kaydet
 * @param {string} key - Cache anahtarı
 * @param {any} data - Kaydedilecek veri
 * @param {number} requestCount - Bu veri için yapılan API çağrı sayısı
 * @returns {Promise<boolean>} - Başarılı mı?
 */
export const saveToCache = async (key, data, requestCount = 1) => {
  try {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return false; // Boş veri cache'leme
    }

    const cacheKey = API_CACHE_PREFIX + key;
    const cacheData = {
      data,
      timestamp: Date.now(),
      requestCount,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    cacheStats.saves++;

    return true;
  } catch (error) {
    logCacheError('saveToCache', key, error);
    return false;
  }
};

/**
 * Cache-first strategy ile veri çek
 * @param {string} key - Cache anahtarı
 * @param {Function} fetchFn - API çağrı fonksiyonu
 * @param {number} maxAge - Cache süresi
 * @param {number} requestCount - API çağrı sayısı
 * @returns {Promise<any>} - Veri
 */
export const fetchWithCache = async (key, fetchFn, maxAge, requestCount = 1) => {
  // Önce cache'e bak
  const cached = await getFromCache(key, maxAge);
  if (cached !== null) {
    return cached;
  }

  // Cache yoksa API'den çek
  try {
    const freshData = await fetchFn();
    if (freshData) {
      await saveToCache(key, freshData, requestCount);
    }
    return freshData;
  } catch (error) {
    throw error;
  }
};

/**
 * Belirli bir cache'i sil
 * @param {string} key - Cache anahtarı
 */
export const clearCache = async (key) => {
  try {
    const cacheKey = API_CACHE_PREFIX + key;
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    // Silent fail
  }
};

/**
 * Belirli bir pattern'e uyan cache'leri sil
 * @param {string} pattern - Key pattern (örn: 'standings')
 */
export const clearCacheByPattern = async (pattern) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter(k =>
      k.startsWith(API_CACHE_PREFIX) && k.includes(pattern)
    );

    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
    }
  } catch (error) {
    // Silent fail
  }
};

/**
 * Tüm API cache'ini temizle
 */
export const clearAllApiCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(API_CACHE_PREFIX));

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }

    return cacheKeys.length;
  } catch (error) {
    return 0;
  }
};

/**
 * Cache istatistiklerini al
 */
export const getCacheStats = () => {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? Math.round((cacheStats.hits / total) * 100) : 0;

  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    totalRequests: total,
  };
};

/**
 * İstatistikleri sıfırla
 */
export const resetCacheStats = () => {
  cacheStats = { hits: 0, misses: 0, saves: 0, apiCallsSaved: 0 };
};

/**
 * Cache durumunu al (boyut, sayı)
 */
export const getCacheInfo = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const apiCacheKeys = keys.filter(k => k.startsWith(API_CACHE_PREFIX));
    const aiCacheKeys = keys.filter(k => k.startsWith(AI_CACHE_PREFIX));

    let apiSize = 0;
    let aiSize = 0;

    for (const key of apiCacheKeys) {
      const value = await AsyncStorage.getItem(key);
      apiSize += value ? value.length : 0;
    }

    for (const key of aiCacheKeys) {
      const value = await AsyncStorage.getItem(key);
      aiSize += value ? value.length : 0;
    }

    return {
      apiCache: {
        count: apiCacheKeys.length,
        sizeKB: Math.round(apiSize / 1024),
      },
      aiCache: {
        count: aiCacheKeys.length,
        sizeKB: Math.round(aiSize / 1024),
      },
      total: {
        count: apiCacheKeys.length + aiCacheKeys.length,
        sizeKB: Math.round((apiSize + aiSize) / 1024),
      },
    };
  } catch (error) {
    return { apiCache: { count: 0, sizeKB: 0 }, aiCache: { count: 0, sizeKB: 0 }, total: { count: 0, sizeKB: 0 } };
  }
};

/**
 * Eski cache'leri temizle (batch işlem ile optimize edildi)
 * @param {number} maxAge - Maksimum yaş (ms), default 7 gün
 */
export const cleanupOldCache = async (maxAge = 7 * 24 * 60 * 60 * 1000) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k =>
      k.startsWith(API_CACHE_PREFIX) || k.startsWith(AI_CACHE_PREFIX)
    );

    // Tüm cache değerlerini paralel olarak oku
    const keyValuePairs = await AsyncStorage.multiGet(cacheKeys);

    // Silinecek anahtarları belirle
    const keysToDelete = [];

    for (const [key, value] of keyValuePairs) {
      if (value) {
        try {
          const { timestamp, cachedAt } = JSON.parse(value);
          const cacheTime = timestamp || cachedAt;
          if (cacheTime && Date.now() - cacheTime > maxAge) {
            keysToDelete.push(key);
          }
        } catch {
          // JSON parse hatası - eski cache, sil
          keysToDelete.push(key);
        }
      }
    }

    // Batch silme işlemi
    if (keysToDelete.length > 0) {
      await AsyncStorage.multiRemove(keysToDelete);
    }

    return keysToDelete.length;
  } catch (error) {
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AI ANALİZ CACHE FONKSİYONLARI (Mevcut sistem)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analiz edilmiş maç ID'lerini getir
 * @returns {Promise<number[]>} - Fixture ID'leri listesi
 */
export const getAnalyzedFixtureIds = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const analysisKeys = keys.filter(k => k.startsWith(AI_CACHE_PREFIX));

    const fixtureIds = analysisKeys.map(key => {
      const idStr = key.replace(AI_CACHE_PREFIX, '');
      return parseInt(idStr, 10);
    }).filter(id => !isNaN(id));

    return fixtureIds;
  } catch (error) {
    return [];
  }
};

const aiCacheService = {
  async getAnalysis(fixtureId) {
    try {
      const key = `${AI_CACHE_PREFIX}${fixtureId}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) return null;

      const data = JSON.parse(cached);

      if (MATCH_FINISHED_STATUSES.includes(data.matchStatus)) {
        await this.removeAnalysis(fixtureId);
        return null;
      }

      return data.analysisData;
    } catch (error) {
      return null;
    }
  },

  async saveAnalysis(fixtureId, analysisData, matchDate, matchStatus = 'NS') {
    try {
      const key = `${AI_CACHE_PREFIX}${fixtureId}`;
      const cacheData = {
        fixtureId,
        analysisData,
        cachedAt: Date.now(),
        matchDate,
        matchStatus,
        expiresWhen: 'match_finished',
      };

      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  },

  async updateMatchStatus(fixtureId, newStatus) {
    try {
      const key = `${AI_CACHE_PREFIX}${fixtureId}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) return false;

      const data = JSON.parse(cached);
      data.matchStatus = newStatus;

      if (MATCH_FINISHED_STATUSES.includes(newStatus)) {
        await this.removeAnalysis(fixtureId);
        return true;
      }

      await AsyncStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  },

  async removeAnalysis(fixtureId) {
    try {
      const key = `${AI_CACHE_PREFIX}${fixtureId}`;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  },

  async hasAnalysis(fixtureId) {
    const analysis = await this.getAnalysis(fixtureId);
    return analysis !== null;
  },

  async clearExpired() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter(k => k.startsWith(AI_CACHE_PREFIX));

      for (const key of analysisKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          if (MATCH_FINISHED_STATUSES.includes(data.matchStatus)) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter(k => k.startsWith(AI_CACHE_PREFIX));

      if (analysisKeys.length > 0) {
        await AsyncStorage.multiRemove(analysisKeys);
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter(k => k.startsWith(AI_CACHE_PREFIX));

      let totalSize = 0;
      const analyses = [];

      for (const key of analysisKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          const data = JSON.parse(cached);
          analyses.push({
            fixtureId: data.fixtureId,
            cachedAt: new Date(data.cachedAt).toLocaleString(),
            matchStatus: data.matchStatus,
          });
        }
      }

      return {
        count: analysisKeys.length,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        analyses,
      };
    } catch (error) {
      return { count: 0, totalSizeKB: '0', analyses: [] };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default aiCacheService;

// aiCacheService sadece named export olarak (default zaten yukarıda)
export { aiCacheService };
