/**
 * AI Service for Football Match Analysis
 * Backend: Gemini 2.5 Flash (migrated from Claude Sonnet for cost savings)
 * Cost: ~95% cheaper ($0.15/$0.60 vs $3/$15 per MTok)
 * NOW USING SUPABASE EDGE FUNCTIONS - API Keys are server-side
 */

import { supabase } from './supabaseService';
import { getLanguage } from '../i18n';

// Edge Function handles Gemini API - key is stored server-side
const USE_EDGE_FUNCTIONS = true;

/**
 * Generate comprehensive match analysis using Gemini 2.5 Flash via Edge Function
 * @param {object} matchData - Complete match data object
 * @param {boolean} isPro - User subscription status (PRO users get higher rate limit)
 * @returns {object} - Enhanced AI analysis response
 */
export const analyzeMatch = async (matchData, isPro = false) => {
  try {
    if (USE_EDGE_FUNCTIONS) {
      // Use Supabase Edge Function - API key is stored server-side
      // Edge Function handles caching in Supabase database
      // isPro parametresi rate limit için gönderiliyor (FREE: 3, PRO: 50)
      const { data, error } = await supabase.functions.invoke('claude-analysis', {
        body: {
          matchData: {
            home: matchData.home,
            away: matchData.away,
            league: matchData.league,
            date: matchData.date,
            time: matchData.time,
            fixtureId: matchData.fixtureId,
            homeForm: matchData.homeForm,
            awayForm: matchData.awayForm,
            homeTeamStats: matchData.homeTeamStats,
            awayTeamStats: matchData.awayTeamStats,
            h2h: matchData.h2h,
            prediction: matchData.prediction,
            tactics: matchData.tactics,
            motivation: matchData.motivation,
            advanced: matchData.advanced,
            referee: matchData.referee,
            squad: matchData.squad,
            external: matchData.external,
          },
          fixtureId: matchData.fixtureId,
          language: getLanguage(),
          isPro: isPro, // ⭐ PRO kullanıcılar için yüksek rate limit (50 vs 3)
        },
      });

      // ⭐ Error handling (PRO only + Rate limit)
      if (error) {
        const language = getLanguage();

        // Check for PRO only feature error (403)
        const isProOnlyError =
          error.message?.includes('pro_only') ||
          error.context?.status === 403;

        if (isProOnlyError) {
          return {
            ...getDefaultAnalysis(language),
            proOnlyFeature: true,
            proOnlyMessage: language === 'en'
              ? 'AI Match Analysis is a PRO feature. Upgrade to access detailed predictions.'
              : 'AI Maç Analizi PRO özelliğidir. Detaylı tahminlere erişmek için PRO\'ya yükseltin.',
          };
        }

        // Check for rate limit error (429)
        const isRateLimitError =
          error.message?.includes('rate_limit') ||
          error.message?.includes('429') ||
          error.context?.status === 429;

        if (isRateLimitError) {
          return {
            ...getDefaultAnalysis(language),
            rateLimitExceeded: true,
            rateLimitMessage: language === 'en'
              ? 'Daily analysis limit reached (50 different matches/day). Try again tomorrow.'
              : 'Günlük analiz limitinize ulaştınız (50 farklı maç/gün). Yarın tekrar deneyin.',
          };
        }

        throw new Error(error.message || 'Edge Function error');
      }

      // Check if response contains PRO only error
      if (data?.error === 'pro_only_feature') {
        const language = getLanguage();
        return {
          ...getDefaultAnalysis(language),
          proOnlyFeature: true,
          proOnlyMessage: data.message || (language === 'en'
            ? 'AI Match Analysis is a PRO feature. Upgrade to access detailed predictions.'
            : 'AI Maç Analizi PRO özelliğidir. Detaylı tahminlere erişmek için PRO\'ya yükseltin.'),
        };
      }

      // Check if response contains rate limit error
      if (data?.error === 'rate_limit_exceeded') {
        const language = getLanguage();
        const limit = data.dailyLimit || 50;
        return {
          ...getDefaultAnalysis(language),
          rateLimitExceeded: true,
          rateLimitMessage: data.message || (language === 'en'
            ? `Daily analysis limit reached (${limit} different matches/day). Try again tomorrow.`
            : `Günlük analiz limitinize ulaştınız (${limit} farklı maç/gün). Yarın tekrar deneyin.`),
        };
      }

      return data;
    }

    // Fallback disabled - use Edge Functions only
    throw new Error('Direct API calls disabled - use Edge Functions');
  } catch (error) {
    throw error;
  }
};

// NOT: generateEnhancedPrompt fonksiyonu Edge Function'da (claude-analysis/index.ts) tanımlı
// İstemci tarafında prompt oluşturmaya gerek yok, tüm işlem sunucu tarafında Gemini API ile yapılıyor

/**
 * Quick analysis with minimal data - uses same Edge Function
 * @param {string} homeName - Home team name
 * @param {string} awayName - Away team name
 * @param {string} leagueName - League name
 * @param {boolean} isPro - User subscription status
 */
export const quickAnalyze = async (homeName, awayName, leagueName, isPro = false) => {
  try {
    // Use the same Edge Function with minimal data
    const { data, error } = await supabase.functions.invoke('claude-analysis', {
      body: {
        matchData: {
          home: { name: homeName },
          away: { name: awayName },
          league: { name: leagueName },
        },
        fixtureId: `quick_${Date.now()}`, // Temporary ID for quick analysis
        language: getLanguage(),
        isPro: isPro, // PRO kullanıcılar için yüksek rate limit
      },
    });

    // ⭐ Error handling (PRO only + Rate limit)
    if (error) {
      const language = getLanguage();

      // Check for PRO only feature error (403)
      const isProOnlyError =
        error.message?.includes('pro_only') ||
        error.context?.status === 403;

      if (isProOnlyError) {
        return {
          ...getDefaultAnalysis(language),
          proOnlyFeature: true,
          proOnlyMessage: language === 'en'
            ? 'AI Match Analysis is a PRO feature. Upgrade to access detailed predictions.'
            : 'AI Maç Analizi PRO özelliğidir. Detaylı tahminlere erişmek için PRO\'ya yükseltin.',
        };
      }

      const isRateLimitError =
        error.message?.includes('rate_limit') ||
        error.message?.includes('429') ||
        error.context?.status === 429;

      if (isRateLimitError) {
        return {
          ...getDefaultAnalysis(language),
          rateLimitExceeded: true,
          rateLimitMessage: language === 'en'
            ? 'Daily analysis limit reached (50 different matches/day). Try again tomorrow.'
            : 'Günlük analiz limitinize ulaştınız (50 farklı maç/gün). Yarın tekrar deneyin.',
        };
      }
      return null;
    }

    // Check if response contains PRO only error
    if (data?.error === 'pro_only_feature') {
      const language = getLanguage();
      return {
        ...getDefaultAnalysis(language),
        proOnlyFeature: true,
        proOnlyMessage: data.message || (language === 'en'
          ? 'AI Match Analysis is a PRO feature. Upgrade to access detailed predictions.'
          : 'AI Maç Analizi PRO özelliğidir. Detaylı tahminlere erişmek için PRO\'ya yükseltin.'),
      };
    }

    // Check if response contains rate limit error
    if (data?.error === 'rate_limit_exceeded') {
      const language = getLanguage();
      const limit = data.dailyLimit || 50;
      return {
        ...getDefaultAnalysis(language),
        rateLimitExceeded: true,
        rateLimitMessage: data.message || (language === 'en'
          ? `Daily analysis limit reached (${limit} different matches/day). Try again tomorrow.`
          : `Günlük analiz limitinize ulaştınız (${limit} farklı maç/gün). Yarın tekrar deneyin.`),
      };
    }

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Get default/fallback analysis data structure
 * @param {string} lang - Language code ('tr' or 'en')
 */
export const getDefaultAnalysis = (lang = null) => {
  const language = lang || getLanguage();
  const isEN = language === 'en';

  return {
    // Ana Maç Sonucu Olasılıkları
    homeWinProb: 33,
    drawProb: 34,
    awayWinProb: 33,
    confidence: 5,

    // Gol Tahminleri
    expectedGoals: 2.5,
    expectedHomeGoals: 1.3,
    expectedAwayGoals: 1.2,
    bttsProb: 50,
    over25Prob: 50,
    over15Prob: 70,
    over35Prob: 30,

    // Poisson / Monte Carlo Özetleri
    goalDistribution: {
      home: { '0': 25, '1': 35, '2': 25, '3': 10, '4plus': 5 },
      away: { '0': 30, '1': 35, '2': 22, '3': 9, '4plus': 4 },
    },
    bttsDistribution: {
      bothScore: 50,
      onlyHomeScores: 25,
      onlyAwayScores: 15,
      noGoals: 10,
    },

    // İlk Yarı Tahminleri
    htHomeWinProb: 30,
    htDrawProb: 45,
    htAwayWinProb: 25,
    htOver05Prob: 55,
    htOver15Prob: 25,

    // Skor Tahminleri
    mostLikelyScore: '1-1',
    scoreProb: 12,
    alternativeScores: [
      { score: '1-0', prob: 10 },
      { score: '2-1', prob: 9 },
      { score: '0-0', prob: 8 },
    ],

    // Risk Analizi - Language dependent values
    riskLevel: isEN ? 'medium' : 'orta',
    bankoScore: 50,
    volatility: 0.5,
    winner: isEN ? 'undecided' : 'belirsiz',
    advice: isEN ? 'Insufficient data for analysis.' : 'Analiz için yeterli veri bulunmuyor.',

    // Faktör Analizi
    factors: [],

    // Önerilen Bahisler
    recommendedBets: [],

    // Takım Analizleri
    homeTeamAnalysis: {
      strengths: [],
      weaknesses: [],
      keyPlayer: null,
      tacticalSummary: '',
    },
    awayTeamAnalysis: {
      strengths: [],
      weaknesses: [],
      keyPlayer: null,
      tacticalSummary: '',
    },

    // Trend ve Uyum Özeti - Language dependent values
    trendSummary: {
      homeFormTrend: isEN ? 'stable' : 'dengeli',
      awayFormTrend: isEN ? 'stable' : 'dengeli',
      homeXGTrend: isEN ? 'stable' : 'stabil',
      awayXGTrend: isEN ? 'stable' : 'stabil',
      tacticalMatchupSummary: '',
    },

    // Risk Uyarıları - Language dependent values
    riskFlags: {
      highDerbyVolatility: false,
      weatherImpact: isEN ? 'low' : 'düşük',
      fatigueRiskHome: isEN ? 'low' : 'düşük',
      fatigueRiskAway: isEN ? 'low' : 'düşük',
      marketDisagreement: false,
    },
  };
};

export default {
  analyzeMatch,
  quickAnalyze,
  getDefaultAnalysis,
};
