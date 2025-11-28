/**
 * Claude AI Service for Football Match Analysis
 * Enhanced with comprehensive analysis variables
 * Anthropic Claude Sonnet 4 Integration
 */

import { CLAUDE_API_KEY as ENV_CLAUDE_KEY } from '@env';

const CLAUDE_API_KEY = ENV_CLAUDE_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Generate comprehensive match analysis using Claude AI
 * @param {object} matchData - Complete match data object
 * @returns {object} - Enhanced AI analysis response
 */
export const analyzeMatch = async (matchData) => {
  const prompt = generateEnhancedPrompt(matchData);

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
        max_tokens: 3000,
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
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { rawAnalysis: content };
    }
  } catch (error) {
    console.error('Claude AI Error:', error);
    throw error;
  }
};

/**
 * Generate enhanced analysis prompt with all variables
 */
const generateEnhancedPrompt = (data) => {
  const {
    // Basic match info
    home,
    away,
    league,
    date,
    time,
    fixtureId,

    // Form data
    homeForm,
    awayForm,
    homeTeamStats,
    awayTeamStats,

    // H2H data
    h2h,

    // API prediction
    prediction,

    // Enhanced data (if available)
    tactics,
    motivation,
    advanced,
    referee,
    squad,
    external,
  } = data;

  // Extract team names
  const homeName = home?.name || home || 'Ev Sahibi';
  const awayName = away?.name || away || 'Deplasman';
  const leagueName = league?.name || league || 'Lig';

  return `Sen dünya çapında ünlü bir futbol analisti ve bahis uzmanısın. Aşağıdaki kapsamlı maç verilerini analiz et ve profesyonel bir tahmin raporu hazırla.

═══════════════════════════════════════════════════════════════════
                        MAÇ BİLGİLERİ
═══════════════════════════════════════════════════════════════════
• Maç ID: ${fixtureId || 'N/A'}
• Ev Sahibi: ${homeName}
• Deplasman: ${awayName}
• Lig: ${leagueName}
• Tarih: ${date || 'N/A'}
• Saat: ${time || 'N/A'}

═══════════════════════════════════════════════════════════════════
                      1. TAKIM FORM VERİLERİ
═══════════════════════════════════════════════════════════════════
📊 EV SAHİBİ - ${homeName}:
• Son 5 Maç: ${homeForm || 'Bilinmiyor'}
• Ev Sahibi Formu: ${homeTeamStats?.homeForm || homeForm || 'N/A'}
• Maç Başı Atılan Gol: ${homeTeamStats?.avgGoalsScored || homeTeamStats?.goalsPerGame || 'N/A'}
• Maç Başı Yenilen Gol: ${homeTeamStats?.avgGoalsConceded || homeTeamStats?.concededPerGame || 'N/A'}
• Clean Sheet Oranı: ${homeTeamStats?.cleanSheetRate || 'N/A'}%
• İlk Golü Atma Oranı: ${homeTeamStats?.firstGoalRate || 'N/A'}%
• Geriden Gelme Oranı: ${homeTeamStats?.comebackRate || 'N/A'}%
• Galibiyet Oranı: ${homeTeamStats?.winRate || 'N/A'}%

📊 DEPLASMAN - ${awayName}:
• Son 5 Maç: ${awayForm || 'Bilinmiyor'}
• Deplasman Formu: ${awayTeamStats?.awayForm || awayForm || 'N/A'}
• Maç Başı Atılan Gol: ${awayTeamStats?.avgGoalsScored || awayTeamStats?.goalsPerGame || 'N/A'}
• Maç Başı Yenilen Gol: ${awayTeamStats?.avgGoalsConceded || awayTeamStats?.concededPerGame || 'N/A'}
• Clean Sheet Oranı: ${awayTeamStats?.cleanSheetRate || 'N/A'}%
• İlk Golü Atma Oranı: ${awayTeamStats?.firstGoalRate || 'N/A'}%
• Geriden Gelme Oranı: ${awayTeamStats?.comebackRate || 'N/A'}%
• Galibiyet Oranı: ${awayTeamStats?.winRate || 'N/A'}%

═══════════════════════════════════════════════════════════════════
                   2. KAFA KAFAYA (H2H) VERİLERİ
═══════════════════════════════════════════════════════════════════
${h2h ? `
• Toplam Karşılaşma: ${h2h.total || h2h.length || 0}
• ${homeName} Galibiyeti: ${h2h.homeWins || 0}
• Beraberlik: ${h2h.draws || 0}
• ${awayName} Galibiyeti: ${h2h.awayWins || 0}
• H2H Gol Ortalaması: ${h2h.avgGoals || 'N/A'}

Son Karşılaşmalar:
${(h2h.recentMatches || h2h || []).slice(0, 5).map(m =>
  `  - ${m.date || ''}: ${m.homeName || homeName} ${m.homeScore}-${m.awayScore} ${m.awayName || awayName}`
).join('\n') || 'Veri yok'}
` : 'H2H verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                     3. TAKTİKSEL VERİLER
═══════════════════════════════════════════════════════════════════
${tactics ? `
• Ev Sahibi Top Hakimiyeti: ${tactics.homePossession || 'N/A'}%
• Deplasman Top Hakimiyeti: ${tactics.awayPossession || 'N/A'}%
• Ev Sahibi Pas İsabeti: ${tactics.homePassAccuracy || 'N/A'}%
• Deplasman Pas İsabeti: ${tactics.awayPassAccuracy || 'N/A'}%
• Ev Sahibi Oyun Stili: ${tactics.homePlayStyle || 'N/A'}
• Deplasman Oyun Stili: ${tactics.awayPlayStyle || 'N/A'}
` : 'Taktiksel veri mevcut değil'}

═══════════════════════════════════════════════════════════════════
                   4. MOTİVASYON FAKTÖRLERİ
═══════════════════════════════════════════════════════════════════
${motivation ? `
• Ev Sahibi Lig Sırası: ${motivation.homeLeaguePosition || 'N/A'}
• Deplasman Lig Sırası: ${motivation.awayLeaguePosition || 'N/A'}
• Ev Sahibi Hedef Bölge: ${motivation.homeZone || 'N/A'}
• Deplasman Hedef Bölge: ${motivation.awayZone || 'N/A'}
• Derbi Mi?: ${motivation.isDerby ? 'Evet' : 'Hayır'}
` : 'Motivasyon verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                   5. xG VE İLERİ METRİKLER
═══════════════════════════════════════════════════════════════════
${advanced ? `
• Ev Sahibi xG: ${advanced.homeXG || 'N/A'}
• Deplasman xG: ${advanced.awayXG || 'N/A'}
• Ev Sahibi xGA: ${advanced.homeXGA || 'N/A'}
• Deplasman xGA: ${advanced.awayXGA || 'N/A'}
• Ev Sahibi Maç Başı Şut: ${advanced.homeShotsPerGame || 'N/A'}
• Deplasman Maç Başı Şut: ${advanced.awayShotsPerGame || 'N/A'}
• Ev Sahibi İsabetli Şut: ${advanced.homeShotsOnTarget || 'N/A'}
• Deplasman İsabetli Şut: ${advanced.awayShotsOnTarget || 'N/A'}
` : 'İleri metrik verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                       6. HAKEM VERİLERİ
═══════════════════════════════════════════════════════════════════
${referee ? `
• Hakem: ${referee.name || 'N/A'}
• Maç Başı Kart Ort.: ${referee.avgCards || 'N/A'}
• Maç Başı Faul Ort.: ${referee.avgFouls || 'N/A'}
• Penaltı Eğilimi: ${referee.penaltyRate || 'N/A'}
• Ev Sahibi Kazanma Oranı: ${referee.homeWinRate || 'N/A'}%
• Maç Başı Gol Ort.: ${referee.avgGoals || 'N/A'}
` : 'Hakem verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                      7. KADRO DURUMU
═══════════════════════════════════════════════════════════════════
${squad ? `
• Ev Sahibi Sakatlıklar: ${squad.homeInjuries?.join(', ') || 'Yok'}
• Deplasman Sakatlıklar: ${squad.awayInjuries?.join(', ') || 'Yok'}
• Ev Sahibi Cezalılar: ${squad.homeSuspensions?.join(', ') || 'Yok'}
• Deplasman Cezalılar: ${squad.awaySuspensions?.join(', ') || 'Yok'}
• Ev Sahibi Kritik Oyuncu Eksik: ${squad.homeKeyMissing ? 'Evet' : 'Hayır'}
• Deplasman Kritik Oyuncu Eksik: ${squad.awayKeyMissing ? 'Evet' : 'Hayır'}
` : 'Kadro verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                      8. DIŞ FAKTÖRLER
═══════════════════════════════════════════════════════════════════
${external ? `
• Hafta Sonu Maçı: ${external.isWeekend ? 'Evet' : 'Hayır'}
• Ev Sahibi Son Maçtan Bu Yana: ${external.homeLastMatchDays || 'N/A'} gün
• Deplasman Son Maçtan Bu Yana: ${external.awayLastMatchDays || 'N/A'} gün
• Ev Sahibi Avrupa Maçı Var: ${external.homeEuropeanMatch ? 'Evet' : 'Hayır'}
• Deplasman Avrupa Maçı Var: ${external.awayEuropeanMatch ? 'Evet' : 'Hayır'}
` : 'Dış faktör verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                      API TAHMİN VERİSİ
═══════════════════════════════════════════════════════════════════
${prediction ? `
• Ev Kazanır: ${prediction.percent?.home || 'N/A'}%
• Beraberlik: ${prediction.percent?.draw || 'N/A'}%
• Deplasman Kazanır: ${prediction.percent?.away || 'N/A'}%
• API Tavsiyesi: ${prediction.advice || 'N/A'}
• Beklenen Ev Gol: ${prediction.goals?.home || 'N/A'}
• Beklenen Dep Gol: ${prediction.goals?.away || 'N/A'}
` : 'API tahmin verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                           GÖREV
═══════════════════════════════════════════════════════════════════

Yukarıdaki TÜM verileri dikkate alarak kapsamlı bir analiz yap.
Poisson/Monte Carlo benzeri istatistiksel modelleme yaklaşımı kullan.
Mevcut olmayan veriler için mantıksal çıkarımlar kullan.
Aşağıdaki JSON formatında SADECE JSON olarak yanıt ver:

{
  "homeWinProb": <0-100 sayı>,
  "drawProb": <0-100 sayı>,
  "awayWinProb": <0-100 sayı>,
  "confidence": <1-10 güven skoru, ondalıklı olabilir>,

  "expectedGoals": <beklenen toplam gol, örn: 2.7>,
  "expectedHomeGoals": <ev sahibi beklenen gol, örn: 1.6>,
  "expectedAwayGoals": <deplasman beklenen gol, örn: 1.1>,
  "bttsProb": <KG Var olasılığı 0-100>,
  "over25Prob": <2.5 Üst olasılığı 0-100>,
  "over15Prob": <1.5 Üst olasılığı 0-100>,
  "over35Prob": <3.5 Üst olasılığı 0-100>,

  "goalDistribution": {
    "home": { "0": <yüzde>, "1": <yüzde>, "2": <yüzde>, "3": <yüzde>, "4plus": <yüzde> },
    "away": { "0": <yüzde>, "1": <yüzde>, "2": <yüzde>, "3": <yüzde>, "4plus": <yüzde> }
  },
  "bttsDistribution": {
    "bothScore": <her iki takım da gol atar yüzde>,
    "onlyHomeScores": <sadece ev sahibi gol atar yüzde>,
    "onlyAwayScores": <sadece deplasman gol atar yüzde>,
    "noGoals": <golsüz yüzde>
  },

  "htHomeWinProb": <İY ev önde 0-100>,
  "htDrawProb": <İY berabere 0-100>,
  "htAwayWinProb": <İY dep önde 0-100>,
  "htOver05Prob": <İY 0.5 üst 0-100>,
  "htOver15Prob": <İY 1.5 üst 0-100>,

  "mostLikelyScore": "<en olası skor, örn: 2-1>",
  "scoreProb": <skor olasılığı 0-100>,
  "alternativeScores": [
    { "score": "<skor>", "prob": <olasılık> },
    { "score": "<skor>", "prob": <olasılık> },
    { "score": "<skor>", "prob": <olasılık> }
  ],

  "riskLevel": "<düşük/orta/yüksek>",
  "bankoScore": <banko güven puanı 0-100>,
  "volatility": <0-1 arası sürprize açıklık>,
  "winner": "<ev/dep/belirsiz>",
  "advice": "<Türkçe detaylı tavsiye, max 100 kelime>",

  "factors": [
    { "category": "form", "text": "<form analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "h2h", "text": "<h2h analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "kadro", "text": "<kadro analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "motivasyon", "text": "<motivasyon analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "taktik", "text": "<taktik analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "hakem", "text": "<hakem analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "hava", "text": "<hava durumu analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "market", "text": "<bahis piyasası analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> }
  ],

  "recommendedBets": [
    { "type": "<bahis türü, örn: MS1>", "confidence": <0-100>, "risk": "<düşük/orta/yüksek>", "reasoning": "<kısa sebep>" },
    { "type": "<bahis türü>", "confidence": <0-100>, "risk": "<düşük/orta/yüksek>", "reasoning": "<kısa sebep>" },
    { "type": "<bahis türü>", "confidence": <0-100>, "risk": "<düşük/orta/yüksek>", "reasoning": "<kısa sebep>" }
  ],

  "homeTeamAnalysis": {
    "strengths": ["<güçlü yön 1>", "<güçlü yön 2>", "<güçlü yön 3>"],
    "weaknesses": ["<zayıf yön 1>", "<zayıf yön 2>"],
    "keyPlayer": "<kritik oyuncu adı veya null>",
    "tacticalSummary": "<kısa taktik özet>"
  },
  "awayTeamAnalysis": {
    "strengths": ["<güçlü yön 1>", "<güçlü yön 2>"],
    "weaknesses": ["<zayıf yön 1>", "<zayıf yön 2>"],
    "keyPlayer": "<kritik oyuncu adı veya null>",
    "tacticalSummary": "<kısa taktik özet>"
  },

  "trendSummary": {
    "homeFormTrend": "<yükselen/düşen/dengeli>",
    "awayFormTrend": "<yükselen/düşen/dengeli>",
    "homeXGTrend": "<yukarı/aşağı/stabil>",
    "awayXGTrend": "<yukarı/aşağı/stabil>",
    "tacticalMatchupSummary": "<kısa taktik karşılaştırma>"
  },

  "riskFlags": {
    "highDerbyVolatility": <true/false>,
    "weatherImpact": "<düşük/orta/yüksek>",
    "fatigueRiskHome": "<düşük/orta/yüksek>",
    "fatigueRiskAway": "<düşük/orta/yüksek>",
    "marketDisagreement": <true/false>
  }
}

SADECE JSON yanıt ver. Başka açıklama ekleme.`;
};

/**
 * Quick analysis with minimal data
 */
export const quickAnalyze = async (homeName, awayName, leagueName) => {
  const prompt = `Futbol maçı: ${homeName} vs ${awayName} (${leagueName})

Kısa analiz yap ve JSON döndür:
{
  "homeWinProb": <0-100>,
  "drawProb": <0-100>,
  "awayWinProb": <0-100>,
  "confidence": <1-10>,
  "expectedGoals": <beklenen gol>,
  "bttsProb": <KG Var 0-100>,
  "over25Prob": <2.5 Üst 0-100>,
  "winner": "<ev/beraberlik/deplasman>",
  "advice": "<kısa Türkçe tavsiye>"
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
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error('Quick analyze error:', error);
    return null;
  }
};

/**
 * Get default/fallback analysis data structure
 */
export const getDefaultAnalysis = () => ({
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

  // Risk Analizi
  riskLevel: 'orta',
  bankoScore: 50,
  volatility: 0.5,
  winner: 'belirsiz',
  advice: 'Analiz için yeterli veri bulunmuyor.',

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

  // Trend ve Uyum Özeti
  trendSummary: {
    homeFormTrend: 'dengeli',
    awayFormTrend: 'dengeli',
    homeXGTrend: 'stabil',
    awayXGTrend: 'stabil',
    tacticalMatchupSummary: '',
  },

  // Risk Uyarıları
  riskFlags: {
    highDerbyVolatility: false,
    weatherImpact: 'düşük',
    fatigueRiskHome: 'düşük',
    fatigueRiskAway: 'düşük',
    marketDisagreement: false,
  },
});

export default {
  analyzeMatch,
  quickAnalyze,
  getDefaultAnalysis,
};
