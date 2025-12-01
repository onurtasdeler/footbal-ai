// Claude Analysis Edge Function
// Maç analizi için Claude AI çağrıları
// API Key sunucu tarafında saklanır, cache Supabase'de tutulur
// Multi-language support: TR (default), EN
// Rate Limiting: IP bazlı, günde 3 farklı maç

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')!
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Rate limit ayarları
const DAILY_MATCH_LIMIT = 3  // Günde 3 farklı maç

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// IP adresini al
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || 'unknown'
}

// Rate limit kontrolü (Maç bazlı)
async function checkRateLimit(
  supabase: any,
  ipAddress: string,
  fixtureId: number,
  endpoint: string,
  dailyLimit: number = 3
): Promise<{ allowed: boolean; remaining: number; resetAt: string; isNewMatch: boolean }> {
  const today = new Date().toISOString().split('T')[0]

  // 1. Bu maç bugün bu IP için daha önce analiz edilmiş mi?
  const { data: existingMatch } = await supabase
    .from('rate_limits')
    .select('id')
    .eq('ip_address', ipAddress)
    .eq('fixture_id', fixtureId)
    .eq('endpoint', endpoint)
    .eq('request_date', today)
    .single()

  // Aynı maç zaten analiz edilmişse, rate limit sayılmaz
  if (existingMatch) {
    const { count } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .eq('endpoint', endpoint)
      .eq('request_date', today)

    return {
      allowed: true,
      remaining: Math.max(0, dailyLimit - (count || 0)),
      resetAt: '',
      isNewMatch: false
    }
  }

  // 2. Yeni maç - bugün kaç farklı maç analiz edilmiş?
  const { count: uniqueMatchCount } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .eq('endpoint', endpoint)
    .eq('request_date', today)

  const currentCount = uniqueMatchCount || 0

  if (currentCount >= dailyLimit) {
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)

    return {
      allowed: false,
      remaining: 0,
      resetAt: tomorrow.toISOString(),
      isNewMatch: true
    }
  }

  // 3. Yeni maç kaydı oluştur
  await supabase.from('rate_limits').insert({
    ip_address: ipAddress,
    fixture_id: fixtureId,
    endpoint: endpoint,
    request_date: today,
    first_request_at: new Date().toISOString()
  })

  return {
    allowed: true,
    remaining: dailyLimit - currentCount - 1,
    resetAt: '',
    isNewMatch: true
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { matchData, fixtureId, language = 'tr' } = await req.json()

    // Validate language parameter
    const lang = ['tr', 'en'].includes(language) ? language : 'tr'

    if (!fixtureId || !matchData) {
      return new Response(
        JSON.stringify({ error: 'fixtureId and matchData are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase client oluştur
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ⭐ RATE LIMIT KONTROLÜ (Maç bazlı)
    const clientIP = getClientIP(req)
    const rateLimit = await checkRateLimit(supabase, clientIP, fixtureId, 'claude-analysis', DAILY_MATCH_LIMIT)

    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP ${clientIP}`)
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: lang === 'en'
            ? 'Daily match analysis limit reached (3 different matches/day)'
            : 'Günlük maç analizi limitinize ulaştınız (3 farklı maç/gün)',
          remaining: 0,
          resetAt: rateLimit.resetAt
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt
          }
        }
      )
    }

    // 1. Önce cache kontrol (language dahil)
    const { data: cached } = await supabase
      .from('match_analyses')
      .select('analysis, expires_at')
      .eq('fixture_id', fixtureId)
      .eq('language', lang)
      .single()

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`Cache hit for fixture ${fixtureId} (${lang})`)
      return new Response(JSON.stringify(cached.analysis), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining)
        },
      })
    }

    console.log(`Cache miss for fixture ${fixtureId} (${lang}), calling Claude API`)

    // 2. Cache'de yoksa veya expire olmuşsa Claude API çağır
    const prompt = lang === 'en'
      ? generateEnhancedPromptEN(matchData)
      : generateEnhancedPromptTR(matchData)

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

    // 3. Cache'e kaydet (24 saat TTL) - language dahil
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const matchDate = matchData.date || new Date().toISOString().split('T')[0]

    await supabase.from('match_analyses').upsert({
      fixture_id: fixtureId,
      language: lang,
      analysis: analysis,
      match_date: matchDate,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'fixture_id,language',
    })

    console.log(`Analysis saved to cache for fixture ${fixtureId} (${lang})`)

    return new Response(JSON.stringify(analysis), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimit.remaining)
      },
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
 * Generate comprehensive analysis prompt - TURKISH
 */
function generateEnhancedPromptTR(data: any): string {
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

/**
 * Generate comprehensive analysis prompt - ENGLISH
 */
function generateEnhancedPromptEN(data: any): string {
  const {
    home, away, league, date, time, fixtureId,
    homeForm, awayForm, homeTeamStats, awayTeamStats,
    h2h, prediction, tactics, motivation, advanced, referee, squad, external,
  } = data

  const homeName = home?.name || home || 'Home Team'
  const awayName = away?.name || away || 'Away Team'
  const leagueName = league?.name || league || 'League'

  return `You are a world-renowned football analyst and betting expert. Analyze the comprehensive match data below and prepare a professional prediction report.

═══════════════════════════════════════════════════════════════════
                        MATCH INFORMATION
═══════════════════════════════════════════════════════════════════
• Match ID: ${fixtureId || 'N/A'}
• Home Team: ${homeName}
• Away Team: ${awayName}
• League: ${leagueName}
• Date: ${date || 'N/A'}
• Time: ${time || 'N/A'}

═══════════════════════════════════════════════════════════════════
                      1. TEAM FORM DATA
═══════════════════════════════════════════════════════════════════
📊 HOME TEAM - ${homeName}:
• Last 5 Matches: ${homeForm || 'Unknown'}
• Home Form: ${homeTeamStats?.homeForm || homeForm || 'N/A'}
• Goals Scored Per Match: ${homeTeamStats?.avgGoalsScored || homeTeamStats?.goalsPerGame || 'N/A'}
• Goals Conceded Per Match: ${homeTeamStats?.avgGoalsConceded || homeTeamStats?.concededPerGame || 'N/A'}
• Clean Sheet Rate: ${homeTeamStats?.cleanSheetRate || 'N/A'}%
• Win Rate: ${homeTeamStats?.winRate || 'N/A'}%

📊 AWAY TEAM - ${awayName}:
• Last 5 Matches: ${awayForm || 'Unknown'}
• Away Form: ${awayTeamStats?.awayForm || awayForm || 'N/A'}
• Goals Scored Per Match: ${awayTeamStats?.avgGoalsScored || awayTeamStats?.goalsPerGame || 'N/A'}
• Goals Conceded Per Match: ${awayTeamStats?.avgGoalsConceded || awayTeamStats?.concededPerGame || 'N/A'}
• Clean Sheet Rate: ${awayTeamStats?.cleanSheetRate || 'N/A'}%
• Win Rate: ${awayTeamStats?.winRate || 'N/A'}%

═══════════════════════════════════════════════════════════════════
                   2. HEAD TO HEAD (H2H) DATA
═══════════════════════════════════════════════════════════════════
${h2h ? `
• Total Meetings: ${h2h.total || h2h.length || 0}
• ${homeName} Wins: ${h2h.homeWins || 0}
• Draws: ${h2h.draws || 0}
• ${awayName} Wins: ${h2h.awayWins || 0}
• H2H Goal Average: ${h2h.avgGoals || 'N/A'}
` : 'H2H data not available'}

═══════════════════════════════════════════════════════════════════
                      API PREDICTION DATA
═══════════════════════════════════════════════════════════════════
${prediction ? `
• Home Win: ${prediction.percent?.home || 'N/A'}%
• Draw: ${prediction.percent?.draw || 'N/A'}%
• Away Win: ${prediction.percent?.away || 'N/A'}%
• API Advice: ${prediction.advice || 'N/A'}
` : 'API prediction data not available'}

═══════════════════════════════════════════════════════════════════
                           TASK
═══════════════════════════════════════════════════════════════════

Analyze ALL the data above comprehensively.
Use Poisson/Monte Carlo-like statistical modeling approach.
Use logical inferences for unavailable data.
Respond ONLY in JSON format as follows:

{
  "homeWinProb": <0-100 number>,
  "drawProb": <0-100 number>,
  "awayWinProb": <0-100 number>,
  "confidence": <1-10 confidence score>,
  "expectedGoals": <expected total goals>,
  "expectedHomeGoals": <home team expected goals>,
  "expectedAwayGoals": <away team expected goals>,
  "bttsProb": <BTTS probability 0-100>,
  "over25Prob": <Over 2.5 probability 0-100>,
  "over15Prob": <Over 1.5 probability 0-100>,
  "over35Prob": <Over 3.5 probability 0-100>,
  "goalDistribution": {
    "home": { "0": <percent>, "1": <percent>, "2": <percent>, "3": <percent>, "4plus": <percent> },
    "away": { "0": <percent>, "1": <percent>, "2": <percent>, "3": <percent>, "4plus": <percent> }
  },
  "bttsDistribution": {
    "bothScore": <both teams score percent>,
    "onlyHomeScores": <only home scores percent>,
    "onlyAwayScores": <only away scores percent>,
    "noGoals": <no goals percent>
  },
  "htHomeWinProb": <HT home ahead 0-100>,
  "htDrawProb": <HT draw 0-100>,
  "htAwayWinProb": <HT away ahead 0-100>,
  "htOver05Prob": <HT Over 0.5 0-100>,
  "htOver15Prob": <HT Over 1.5 0-100>,
  "mostLikelyScore": "<most likely score>",
  "scoreProb": <score probability 0-100>,
  "alternativeScores": [
    { "score": "<score>", "prob": <probability> },
    { "score": "<score>", "prob": <probability> },
    { "score": "<score>", "prob": <probability> }
  ],
  "riskLevel": "<low/medium/high>",
  "bankoScore": <sure bet confidence score 0-100>,
  "volatility": <0-1 upset potential>,
  "winner": "<home/away/undecided>",
  "advice": "<English detailed advice, max 100 words>",
  "factors": [
    { "category": "form", "text": "<form analysis>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> },
    { "category": "h2h", "text": "<h2h analysis>", "impact": "<positive/neutral/negative/mixed>", "weight": <0.00-1.00> }
  ],
  "recommendedBets": [
    { "type": "<bet type>", "confidence": <0-100>, "risk": "<low/medium/high>", "reasoning": "<short reason>" }
  ],
  "homeTeamAnalysis": {
    "strengths": ["<strength>"],
    "weaknesses": ["<weakness>"],
    "keyPlayer": "<key player>",
    "tacticalSummary": "<tactical summary>"
  },
  "awayTeamAnalysis": {
    "strengths": ["<strength>"],
    "weaknesses": ["<weakness>"],
    "keyPlayer": "<key player>",
    "tacticalSummary": "<tactical summary>"
  },
  "trendSummary": {
    "homeFormTrend": "<rising/falling/stable>",
    "awayFormTrend": "<rising/falling/stable>",
    "tacticalMatchupSummary": "<tactical comparison>"
  },
  "riskFlags": {
    "highDerbyVolatility": <true/false>,
    "weatherImpact": "<low/medium/high>",
    "fatigueRiskHome": "<low/medium/high>",
    "fatigueRiskAway": "<low/medium/high>",
    "marketDisagreement": <true/false>
  }
}

Respond ONLY with JSON. Do not add any other explanation.`
}
