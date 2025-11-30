// Claude Analysis Edge Function
// Maç analizi için Claude AI çağrıları
// API Key sunucu tarafında saklanır, cache Supabase'de tutulur

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')!
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { matchData, fixtureId } = await req.json()

    if (!fixtureId || !matchData) {
      return new Response(
        JSON.stringify({ error: 'fixtureId and matchData are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase client oluştur
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Önce cache kontrol
    const { data: cached } = await supabase
      .from('match_analyses')
      .select('analysis, expires_at')
      .eq('fixture_id', fixtureId)
      .single()

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`Cache hit for fixture ${fixtureId}`)
      return new Response(JSON.stringify(cached.analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Cache miss for fixture ${fixtureId}, calling Claude API`)

    // 2. Cache'de yoksa veya expire olmuşsa Claude API çağır
    const prompt = generateEnhancedPrompt(matchData)

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
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Claude API Error:', error)
      return new Response(
        JSON.stringify({ error: 'Claude API error', details: error }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.content[0]?.text

    // JSON parse
    let analysis
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        analysis = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      analysis = { rawAnalysis: content }
    }

    // 3. Cache'e kaydet (24 saat TTL)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const matchDate = matchData.date || new Date().toISOString().split('T')[0]

    await supabase.from('match_analyses').upsert({
      fixture_id: fixtureId,
      analysis: analysis,
      match_date: matchDate,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'fixture_id',
    })

    console.log(`Analysis saved to cache for fixture ${fixtureId}`)

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Claude Analysis Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Generate comprehensive analysis prompt
 */
function generateEnhancedPrompt(data: any): string {
  const {
    home, away, league, date, time, fixtureId,
    homeForm, awayForm, homeTeamStats, awayTeamStats,
    h2h, prediction, tactics, motivation, advanced, referee, squad, external,
  } = data

  const homeName = home?.name || home || 'Ev Sahibi'
  const awayName = away?.name || away || 'Deplasman'
  const leagueName = league?.name || league || 'Lig'

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
• Galibiyet Oranı: ${homeTeamStats?.winRate || 'N/A'}%

📊 DEPLASMAN - ${awayName}:
• Son 5 Maç: ${awayForm || 'Bilinmiyor'}
• Deplasman Formu: ${awayTeamStats?.awayForm || awayForm || 'N/A'}
• Maç Başı Atılan Gol: ${awayTeamStats?.avgGoalsScored || awayTeamStats?.goalsPerGame || 'N/A'}
• Maç Başı Yenilen Gol: ${awayTeamStats?.avgGoalsConceded || awayTeamStats?.concededPerGame || 'N/A'}
• Clean Sheet Oranı: ${awayTeamStats?.cleanSheetRate || 'N/A'}%
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
` : 'H2H verisi mevcut değil'}

═══════════════════════════════════════════════════════════════════
                      API TAHMİN VERİSİ
═══════════════════════════════════════════════════════════════════
${prediction ? `
• Ev Kazanır: ${prediction.percent?.home || 'N/A'}%
• Beraberlik: ${prediction.percent?.draw || 'N/A'}%
• Deplasman Kazanır: ${prediction.percent?.away || 'N/A'}%
• API Tavsiyesi: ${prediction.advice || 'N/A'}
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
  "confidence": <1-10 güven skoru>,
  "expectedGoals": <beklenen toplam gol>,
  "expectedHomeGoals": <ev sahibi beklenen gol>,
  "expectedAwayGoals": <deplasman beklenen gol>,
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
  "mostLikelyScore": "<en olası skor>",
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
    { "category": "h2h", "text": "<h2h analizi>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> }
  ],
  "recommendedBets": [
    { "type": "<bahis türü>", "confidence": <0-100>, "risk": "<düşük/orta/yüksek>", "reasoning": "<kısa sebep>" }
  ],
  "homeTeamAnalysis": {
    "strengths": ["<güçlü yön>"],
    "weaknesses": ["<zayıf yön>"],
    "keyPlayer": "<kritik oyuncu>",
    "tacticalSummary": "<taktik özet>"
  },
  "awayTeamAnalysis": {
    "strengths": ["<güçlü yön>"],
    "weaknesses": ["<zayıf yön>"],
    "keyPlayer": "<kritik oyuncu>",
    "tacticalSummary": "<taktik özet>"
  },
  "trendSummary": {
    "homeFormTrend": "<yükselen/düşen/dengeli>",
    "awayFormTrend": "<yükselen/düşen/dengeli>",
    "tacticalMatchupSummary": "<taktik karşılaştırma>"
  },
  "riskFlags": {
    "highDerbyVolatility": <true/false>,
    "weatherImpact": "<düşük/orta/yüksek>",
    "fatigueRiskHome": "<düşük/orta/yüksek>",
    "fatigueRiskAway": "<düşük/orta/yüksek>",
    "marketDisagreement": <true/false>
  }
}

SADECE JSON yanıt ver. Başka açıklama ekleme.`
}
