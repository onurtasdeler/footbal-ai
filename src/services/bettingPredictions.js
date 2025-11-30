/**
 * Betting Predictions Service
 * Claude AI entegrasyonu ile bahis tahminleri
 * NOT: Bu servis analyzeMatch'ten FARKLIDIR - sadece bahis tahminleri üretir
 */

import { CLAUDE_API_KEY as ENV_CLAUDE_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllBettingTypes, BETTING_CATEGORIES, RISK_LEVELS } from '../data/bettingTypes';

const CLAUDE_API_KEY = ENV_CLAUDE_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Cache key prefix
const PREDICTION_CACHE_KEY = '@betting_predictions_';
// Cache süresi yok - maç bitene kadar saklanır

/**
 * Maç için bahis tahminleri al
 * @param {object} matchData - Maç verileri
 * @returns {object} - Bahis tahminleri
 */
export const getBettingPredictions = async (matchData) => {
  // Cache key: maç ID + tarih (maç bitene kadar saklanır)
  const matchDate = matchData.date || new Date().toISOString().split('T')[0];
  const cacheKey = `${PREDICTION_CACHE_KEY}${matchData.id}_${matchDate}`;

  // Cache kontrol - süre kontrolü yok, direkt döndür
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data } = JSON.parse(cached);
      if (data) {
        return data;
      }
    }
  } catch (e) {
    console.log('Cache read error:', e);
  }

  // API çağrısı
  const prompt = generateBettingPrompt(matchData);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API Error:', error);
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const predictions = JSON.parse(jsonMatch[0]);

        // Tahminleri zenginleştir
        const enrichedPredictions = enrichPredictions(predictions);

        // Cache'e kaydet (maç bitene kadar saklanır)
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data: enrichedPredictions,
            matchDate: matchDate,
            matchId: matchData.id,
          }));
        } catch (e) {
          console.log('Cache write error:', e);
        }

        return enrichedPredictions;
      }
      throw new Error('Invalid JSON response');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return getDefaultPredictions();
    }
  } catch (error) {
    console.error('Betting Predictions Error:', error);
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
 */
const getDefaultPredictions = () => ({
  predictions: [
    {
      betType: '2.5U',
      betName: '2.5 Üst',
      category: 'gol_bahisleri',
      selection: '2.5 Üst',
      confidence: 50,
      risk: 'orta',
      reasoning: 'Veri yetersiz, genel ortalamaya dayalı tahmin',
      riskColor: RISK_LEVELS.orta.color,
      riskBgColor: RISK_LEVELS.orta.bgColor,
      riskIcon: RISK_LEVELS.orta.icon,
      riskLabel: RISK_LEVELS.orta.label,
      categoryColor: BETTING_CATEGORIES.gol_bahisleri.color,
      categoryIcon: BETTING_CATEGORIES.gol_bahisleri.icon,
    },
    {
      betType: 'KGV',
      betName: 'Karşılıklı Gol Var',
      category: 'gol_bahisleri',
      selection: 'KG Var',
      confidence: 45,
      risk: 'orta',
      reasoning: 'Veri yetersiz, genel ortalamaya dayalı tahmin',
      riskColor: RISK_LEVELS.orta.color,
      riskBgColor: RISK_LEVELS.orta.bgColor,
      riskIcon: RISK_LEVELS.orta.icon,
      riskLabel: RISK_LEVELS.orta.label,
      categoryColor: BETTING_CATEGORIES.gol_bahisleri.color,
      categoryIcon: BETTING_CATEGORIES.gol_bahisleri.icon,
    },
  ],
  topPick: null,
  summary: 'Yeterli veri olmadığından detaylı tahmin yapılamadı.',
  riskWarning: 'Bu tahminler sınırlı veriye dayanmaktadır.',
  generatedAt: new Date().toISOString(),
  isDefault: true,
});

/**
 * Hızlı tahmin (sadece temel verilerle)
 */
export const getQuickPredictions = async (homeName, awayName, leagueName) => {
  const prompt = `Futbol maçı: ${homeName} vs ${awayName} (${leagueName})

En olası 3 bahis tahmini ver:

JSON formatı:
{
  "predictions": [
    {
      "betType": "<kod>",
      "betName": "<isim>",
      "confidence": <0-100>,
      "risk": "<dusuk/orta/yuksek>",
      "reasoning": "<kısa sebep>"
    }
  ]
}

SADECE JSON yanıt ver.`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error('Claude API error');
    }

    const data = await response.json();
    const content = data.content[0]?.text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return enrichPredictions(JSON.parse(jsonMatch[0]));
    }
    return null;
  } catch (error) {
    console.error('Quick predictions error:', error);
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
    console.error('Clear cache error:', error);
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
    console.error('Clean old cache error:', error);
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
    console.error('Get cached match IDs error:', error);
    return new Set();
  }
};

/**
 * Belirli maç için cache var mı kontrol et
 */
export const hasCachedPrediction = async (matchId, matchDate) => {
  try {
    const cacheKey = `${PREDICTION_CACHE_KEY}${matchId}_${matchDate}`;
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
