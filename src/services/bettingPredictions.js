/**
 * Betting Predictions Service
 * Claude AI entegrasyonu ile bahis tahminleri
 * NOW USING SUPABASE EDGE FUNCTIONS - API Keys are server-side
 * NOT: Bu servis analyzeMatch'ten FARKLIDIR - sadece bahis tahminleri üretir
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseService';
import { BETTING_CATEGORIES, RISK_LEVELS } from '../data/bettingTypes';
import { getLanguage } from '../i18n';

// Edge Function handles Claude API - key is stored server-side
const USE_EDGE_FUNCTIONS = true; // Toggle for migration

// Cache key prefix (local cache for quick access)
const PREDICTION_CACHE_KEY = '@betting_predictions_';

/**
 * Maç için bahis tahminleri al - Edge Function üzerinden
 * @param {object} matchData - Maç verileri
 * @param {boolean} isPro - User subscription status (PRO users get higher rate limit)
 * @returns {object} - Bahis tahminleri
 */
export const getBettingPredictions = async (matchData, isPro = false) => {
  const matchDate = matchData.date || new Date().toISOString().split('T')[0];
  const language = getLanguage();
  const cacheKey = `${PREDICTION_CACHE_KEY}${matchData.id}_${matchDate}_${language}`;

  // ⭐ Cache + Server Sync Pattern
  // Local cache'i oku ama ÖNCE rate limit kontrolü yap
  let localCache = null;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data } = JSON.parse(cached);
      if (data && !data.rateLimitExceeded) {
        localCache = data; // Cache'i sakla, rate limit kontrolü sonrası kullanılacak
      }
    }
  } catch (e) {
    // Silent fail
  }

  try {
    if (USE_EDGE_FUNCTIONS) {
      // Use Supabase Edge Function - API key is stored server-side
      // Edge Function handles Supabase database caching
      const { data, error } = await supabase.functions.invoke('claude-predictions', {
        body: {
          matchData: {
            home: matchData.home,
            away: matchData.away,
            league: matchData.league,
            date: matchData.date,
            time: matchData.time,
            homeForm: matchData.homeForm,
            awayForm: matchData.awayForm,
            h2h: matchData.h2h,
            homeTeamStats: matchData.homeTeamStats,
            awayTeamStats: matchData.awayTeamStats,
          },
          fixtureId: matchData.id,
          language: language,
          isPro: isPro, // ⭐ PRO kullanıcılar için yüksek rate limit (50 vs 3)
        },
      });

      // ⭐ Error handling (403 PRO only + 429 Rate limit)
      if (error) {
        // ⭐ FIX: Check for PRO only feature error (403)
        const isProOnlyError =
          error.message?.includes('pro_only') ||
          error.context?.status === 403;

        if (isProOnlyError) {
          return {
            ...getDefaultPredictions(language),
            proOnlyFeature: true,
            proOnlyMessage: language === 'en'
              ? 'AI Predictions is a PRO feature. Upgrade to access detailed betting tips.'
              : 'AI Tahminler PRO özelliğidir. Detaylı bahis ipuçlarına erişmek için PRO\'ya yükseltin.',
          };
        }

        // Check for rate limit error
        const isRateLimitError =
          error.message?.includes('rate_limit') ||
          error.message?.includes('429') ||
          error.context?.status === 429;

        if (isRateLimitError) {
          const limit = isPro ? 50 : 3;
          return {
            ...getDefaultPredictions(language),
            rateLimitExceeded: true,
            rateLimitMessage: language === 'en'
              ? `Daily prediction limit reached (${limit} different matches/day). Try again tomorrow.`
              : `Günlük tahmin limitinize ulaştınız (${limit} farklı maç/gün). Yarın tekrar deneyin.`,
          };
        }

        return getDefaultPredictions();
      }

      // ⭐ FIX: Check if response contains PRO only error
      if (data?.error === 'pro_only_feature') {
        return {
          ...getDefaultPredictions(language),
          proOnlyFeature: true,
          proOnlyMessage: data.message || (language === 'en'
            ? 'AI Predictions is a PRO feature. Upgrade to access detailed betting tips.'
            : 'AI Tahminler PRO özelliğidir. Detaylı bahis ipuçlarına erişmek için PRO\'ya yükseltin.'),
        };
      }

      // Check if response itself contains rate limit error
      if (data?.error === 'rate_limit_exceeded') {
        const limit = data.dailyLimit || (isPro ? 50 : 3);
        return {
          ...getDefaultPredictions(language),
          rateLimitExceeded: true,
          rateLimitMessage: data.message || (language === 'en'
            ? `Daily prediction limit reached (${limit} different matches/day). Try again tomorrow.`
            : `Günlük tahmin limitinize ulaştınız (${limit} farklı maç/gün). Yarın tekrar deneyin.`),
        };
      }

      // ⭐ Rate limit OK - Local cache varsa onu kullan (hızlı), yoksa server response
      if (localCache) {
        return localCache;
      }

      // Enrich with UI data
      const enrichedPredictions = enrichPredictions(data);

      // Save to local cache for quick access
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          data: enrichedPredictions,
          matchDate: matchDate,
          matchId: matchData.id,
        }));
      } catch (e) {
        // Silent fail
      }

      return enrichedPredictions;
    }

    // Fallback disabled
    throw new Error('Direct API calls disabled - use Edge Functions');
  } catch (error) {
    return getDefaultPredictions();
  }
};

/**
 * Bahis tahmin prompt'u oluştur
 */
const generateBettingPrompt = (matchData) => {
  const {
    home,
    away,
    league,
    date,
    time,
    homeForm,
    awayForm,
    h2h,
    homeTeamStats,
    awayTeamStats,
  } = matchData;

  const homeName = home?.name || home || 'Ev Sahibi';
  const awayName = away?.name || away || 'Deplasman';
  const leagueName = league?.name || league || 'Bilinmeyen Lig';

  // Popüler bahis türlerini al
  const bettingTypes = getAllBettingTypes().slice(0, 30);

  return `Sen profesyonel bir futbol bahis analisti olarak, aşağıdaki maç için BAHİS TAHMİNLERİ üret.

═══════════════════════════════════════════════════════════════════
                          MAÇ BİLGİLERİ
═══════════════════════════════════════════════════════════════════
• Ev Sahibi: ${homeName}
• Deplasman: ${awayName}
• Lig: ${leagueName}
• Tarih: ${date || 'N/A'}
• Saat: ${time || 'N/A'}

═══════════════════════════════════════════════════════════════════
                         FORM VERİLERİ
═══════════════════════════════════════════════════════════════════
• Ev Sahibi Son Form: ${homeForm || 'Bilinmiyor'}
• Deplasman Son Form: ${awayForm || 'Bilinmiyor'}
${homeTeamStats ? `• Ev Sahibi Gol Ort: ${homeTeamStats.avgGoalsScored || 'N/A'}` : ''}
${awayTeamStats ? `• Deplasman Gol Ort: ${awayTeamStats.avgGoalsScored || 'N/A'}` : ''}

═══════════════════════════════════════════════════════════════════
                      KAFA KAFAYA (H2H)
═══════════════════════════════════════════════════════════════════
${h2h ? `
• Toplam Karşılaşma: ${h2h.total || h2h.length || 0}
• ${homeName} Galibiyeti: ${h2h.homeWins || 0}
• Beraberlik: ${h2h.draws || 0}
• ${awayName} Galibiyeti: ${h2h.awayWins || 0}
` : 'H2H verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                    MEVCUT BAHİS TÜRLERİ
═══════════════════════════════════════════════════════════════════
${bettingTypes.map(t => `• ${t.id}: ${t.ad} (${t.categoryName})`).join('\n')}

═══════════════════════════════════════════════════════════════════
                           GÖREV
═══════════════════════════════════════════════════════════════════

Yukarıdaki bahis türlerinden bu maç için EN UYGUN 5-7 tanesini seç.
Her tahmin için güven oranı ve risk seviyesi belirle.

ÖNEMLİ KURALLAR:
1. Sadece yukarıdaki bahis türlerinden seç
2. Güven oranı 0-100 arasında olmalı
3. Risk: "dusuk", "orta", "yuksek" veya "cok_yuksek"
4. Her tahmin için kısa mantıklı bir sebep yaz

JSON FORMATI:
{
  "predictions": [
    {
      "betType": "MS1",
      "betName": "Maç Sonucu - Ev Sahibi",
      "category": "mac_sonucu",
      "selection": "Ev Kazanır",
      "confidence": 72,
      "risk": "orta",
      "reasoning": "Ev sahibi son 5 maçta 4 galibiyet aldı"
    }
  ],
  "topPick": {
    "betType": "2.5U",
    "betName": "2.5 Üst",
    "confidence": 75,
    "reasoning": "En güvenilir tahmin"
  },
  "summary": "Maç özeti (max 80 kelime)",
  "riskWarning": "Bu maç için özel risk uyarısı (varsa)"
}

SADECE JSON yanıt ver. Başka açıklama ekleme.`;
};

/**
 * Tahminleri zenginleştir (renk, ikon vb. ekle)
 */
const enrichPredictions = (predictions) => {
  if (!predictions || !predictions.predictions) {
    return getDefaultPredictions();
  }

  const enrichedPredictions = predictions.predictions.map(pred => {
    const riskInfo = RISK_LEVELS[pred.risk] || RISK_LEVELS.orta;
    const categoryInfo = BETTING_CATEGORIES[pred.category] || {};

    return {
      ...pred,
      riskColor: riskInfo.color,
      riskBgColor: riskInfo.bgColor,
      riskIcon: riskInfo.icon,
      riskLabel: riskInfo.label,
      categoryColor: categoryInfo.color || '#00d4aa',
      categoryIcon: categoryInfo.icon || 'help-circle-outline',
    };
  });

  return {
    ...predictions,
    predictions: enrichedPredictions,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Varsayılan tahminler (hata durumunda)
 * @param {string} lang - Language code ('tr' or 'en')
 */
const getDefaultPredictions = (lang = null) => {
  const language = lang || getLanguage();
  const isEN = language === 'en';

  // Risk key based on language (Edge Function returns 'medium' for EN, 'orta' for TR)
  const riskKey = isEN ? 'medium' : 'orta';
  const riskInfo = RISK_LEVELS[riskKey] || RISK_LEVELS.orta;

  return {
    predictions: [
      {
        betType: '2.5U',
        betName: isEN ? 'Over 2.5 Goals' : '2.5 Üst',
        category: 'gol_bahisleri',
        selection: isEN ? 'Over 2.5' : '2.5 Üst',
        confidence: 50,
        risk: riskKey,
        reasoning: isEN ? 'Insufficient data, prediction based on general average' : 'Veri yetersiz, genel ortalamaya dayalı tahmin',
        riskColor: riskInfo.color,
        riskBgColor: riskInfo.bgColor,
        riskIcon: riskInfo.icon,
        riskLabel: riskInfo.label,
        categoryColor: BETTING_CATEGORIES.gol_bahisleri.color,
        categoryIcon: BETTING_CATEGORIES.gol_bahisleri.icon,
      },
      {
        betType: 'KGV',
        betName: isEN ? 'Both Teams to Score' : 'Karşılıklı Gol Var',
        category: 'gol_bahisleri',
        selection: isEN ? 'BTTS Yes' : 'KG Var',
        confidence: 45,
        risk: riskKey,
        reasoning: isEN ? 'Insufficient data, prediction based on general average' : 'Veri yetersiz, genel ortalamaya dayalı tahmin',
        riskColor: riskInfo.color,
        riskBgColor: riskInfo.bgColor,
        riskIcon: riskInfo.icon,
        riskLabel: riskInfo.label,
        categoryColor: BETTING_CATEGORIES.gol_bahisleri.color,
        categoryIcon: BETTING_CATEGORIES.gol_bahisleri.icon,
      },
    ],
    topPick: null,
    summary: isEN ? 'Detailed prediction not available due to insufficient data.' : 'Yeterli veri olmadığından detaylı tahmin yapılamadı.',
    riskWarning: isEN ? 'These predictions are based on limited data.' : 'Bu tahminler sınırlı veriye dayanmaktadır.',
    generatedAt: new Date().toISOString(),
    isDefault: true,
  };
};

/**
 * Hızlı tahmin (sadece temel verilerle) - Edge Function üzerinden
 */
export const getQuickPredictions = async (homeName, awayName, leagueName) => {
  try {
    const language = getLanguage();

    // Use the same Edge Function with minimal data
    const { data, error } = await supabase.functions.invoke('claude-predictions', {
      body: {
        matchData: {
          home: { name: homeName },
          away: { name: awayName },
          league: { name: leagueName },
        },
        fixtureId: `quick_${Date.now()}`, // Temporary ID
        language: language,
      },
    });

    // ⭐ Error handling (403 PRO only + 429 Rate limit)
    if (error) {
      // ⭐ FIX: Check for PRO only feature error (403)
      const isProOnlyError =
        error.message?.includes('pro_only') ||
        error.context?.status === 403;

      if (isProOnlyError) {
        return {
          ...getDefaultPredictions(language),
          proOnlyFeature: true,
          proOnlyMessage: language === 'en'
            ? 'AI Predictions is a PRO feature. Upgrade to access detailed betting tips.'
            : 'AI Tahminler PRO özelliğidir. Detaylı bahis ipuçlarına erişmek için PRO\'ya yükseltin.',
        };
      }

      const isRateLimitError =
        error.message?.includes('rate_limit') ||
        error.message?.includes('429') ||
        error.context?.status === 429;

      if (isRateLimitError) {
        return {
          ...getDefaultPredictions(language),
          rateLimitExceeded: true,
          rateLimitMessage: language === 'en'
            ? 'Daily prediction limit reached (3 different matches/day). Try again tomorrow.'
            : 'Günlük tahmin limitinize ulaştınız (3 farklı maç/gün). Yarın tekrar deneyin.',
        };
      }
      return null;
    }

    // ⭐ FIX: Check if response contains PRO only error
    if (data?.error === 'pro_only_feature') {
      return {
        ...getDefaultPredictions(language),
        proOnlyFeature: true,
        proOnlyMessage: data.message || (language === 'en'
          ? 'AI Predictions is a PRO feature. Upgrade to access detailed betting tips.'
          : 'AI Tahminler PRO özelliğidir. Detaylı bahis ipuçlarına erişmek için PRO\'ya yükseltin.'),
      };
    }

    // Check if response contains rate limit error
    if (data?.error === 'rate_limit_exceeded') {
      return {
        ...getDefaultPredictions(language),
        rateLimitExceeded: true,
        rateLimitMessage: data.message,
      };
    }

    return enrichPredictions(data);
  } catch (error) {
    return null;
  }
};

/**
 * Cache temizle
 */
export const clearPredictionCache = async (matchId = null) => {
  try {
    if (matchId) {
      // Belirli maç için tüm cache'leri temizle
      const keys = await AsyncStorage.getAllKeys();
      const matchKeys = keys.filter(k => k.startsWith(`${PREDICTION_CACHE_KEY}${matchId}`));
      await AsyncStorage.multiRemove(matchKeys);
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const predictionKeys = keys.filter(k => k.startsWith(PREDICTION_CACHE_KEY));
      await AsyncStorage.multiRemove(predictionKeys);
    }
  } catch (error) {
    // Silent fail
  }
};

/**
 * Eski cache'leri temizle (2 günden eski)
 */
export const cleanOldPredictionCache = async () => {
  try {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const cutoffDate = twoDaysAgo.toISOString().split('T')[0];

    const keys = await AsyncStorage.getAllKeys();
    const predictionKeys = keys.filter(k => k.startsWith(PREDICTION_CACHE_KEY));

    for (const key of predictionKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const { matchDate } = JSON.parse(cached);
          if (matchDate && matchDate < cutoffDate) {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (e) {
        // Parse hatası varsa sil
        await AsyncStorage.removeItem(key);
      }
    }
  } catch (error) {
    // Silent fail
  }
};

/**
 * Cache'deki maç ID'lerini getir
 */
export const getCachedMatchIds = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const predictionKeys = keys.filter(k => k.startsWith(PREDICTION_CACHE_KEY));

    const matchIds = new Set();
    for (const key of predictionKeys) {
      // Key format: @betting_predictions_{matchId}_{date}
      const match = key.match(/@betting_predictions_(\d+)/);
      if (match) {
        matchIds.add(match[1]);
      }
    }
    return matchIds;
  } catch (error) {
    return new Set();
  }
};

/**
 * Belirli maç için cache var mı kontrol et
 */
export const hasCachedPrediction = async (matchId, matchDate) => {
  try {
    const language = getLanguage();
    const cacheKey = `${PREDICTION_CACHE_KEY}${matchId}_${matchDate}_${language}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached !== null;
  } catch (error) {
    return false;
  }
};

export default {
  getBettingPredictions,
  getQuickPredictions,
  clearPredictionCache,
  cleanOldPredictionCache,
  getCachedMatchIds,
  hasCachedPrediction,
  getDefaultPredictions,
};
