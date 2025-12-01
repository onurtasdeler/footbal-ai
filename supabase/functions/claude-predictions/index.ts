// Claude Predictions Edge Function
// Bahis tahminleri için Claude AI çağrıları
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

// Popüler bahis türleri - TURKISH
const BETTING_TYPES_TR = [
  { id: 'MS1', ad: 'Maç Sonucu - Ev Sahibi', categoryName: 'Maç Sonucu' },
  { id: 'MSX', ad: 'Maç Sonucu - Beraberlik', categoryName: 'Maç Sonucu' },
  { id: 'MS2', ad: 'Maç Sonucu - Deplasman', categoryName: 'Maç Sonucu' },
  { id: 'ÇS', ad: 'Çifte Şans - 1X', categoryName: 'Çifte Şans' },
  { id: 'ÇS2', ad: 'Çifte Şans - X2', categoryName: 'Çifte Şans' },
  { id: 'ÇS3', ad: 'Çifte Şans - 12', categoryName: 'Çifte Şans' },
  { id: '1.5U', ad: '1.5 Üst', categoryName: 'Alt/Üst' },
  { id: '2.5U', ad: '2.5 Üst', categoryName: 'Alt/Üst' },
  { id: '3.5U', ad: '3.5 Üst', categoryName: 'Alt/Üst' },
  { id: '1.5A', ad: '1.5 Alt', categoryName: 'Alt/Üst' },
  { id: '2.5A', ad: '2.5 Alt', categoryName: 'Alt/Üst' },
  { id: '3.5A', ad: '3.5 Alt', categoryName: 'Alt/Üst' },
  { id: 'KGV', ad: 'Karşılıklı Gol Var', categoryName: 'Karşılıklı Gol' },
  { id: 'KGY', ad: 'Karşılıklı Gol Yok', categoryName: 'Karşılıklı Gol' },
  { id: 'İY1', ad: 'İlk Yarı - Ev Sahibi', categoryName: 'İlk Yarı' },
  { id: 'İYX', ad: 'İlk Yarı - Beraberlik', categoryName: 'İlk Yarı' },
  { id: 'İY2', ad: 'İlk Yarı - Deplasman', categoryName: 'İlk Yarı' },
  { id: 'İY0.5U', ad: 'İY 0.5 Üst', categoryName: 'İlk Yarı Alt/Üst' },
  { id: 'İY1.5U', ad: 'İY 1.5 Üst', categoryName: 'İlk Yarı Alt/Üst' },
  { id: 'EGA', ad: 'Ev Sahibi Gol Atar', categoryName: 'Gol Atacak Takım' },
  { id: 'DGA', ad: 'Deplasman Gol Atar', categoryName: 'Gol Atacak Takım' },
  { id: 'TG01', ad: 'Toplam Gol 0-1', categoryName: 'Toplam Gol Aralığı' },
  { id: 'TG23', ad: 'Toplam Gol 2-3', categoryName: 'Toplam Gol Aralığı' },
  { id: 'TG46', ad: 'Toplam Gol 4-6', categoryName: 'Toplam Gol Aralığı' },
]

// Popular bet types - ENGLISH
const BETTING_TYPES_EN = [
  { id: 'MS1', ad: 'Match Result - Home', categoryName: 'Match Result' },
  { id: 'MSX', ad: 'Match Result - Draw', categoryName: 'Match Result' },
  { id: 'MS2', ad: 'Match Result - Away', categoryName: 'Match Result' },
  { id: 'DC1', ad: 'Double Chance - 1X', categoryName: 'Double Chance' },
  { id: 'DC2', ad: 'Double Chance - X2', categoryName: 'Double Chance' },
  { id: 'DC3', ad: 'Double Chance - 12', categoryName: 'Double Chance' },
  { id: 'O1.5', ad: 'Over 1.5', categoryName: 'Over/Under' },
  { id: 'O2.5', ad: 'Over 2.5', categoryName: 'Over/Under' },
  { id: 'O3.5', ad: 'Over 3.5', categoryName: 'Over/Under' },
  { id: 'U1.5', ad: 'Under 1.5', categoryName: 'Over/Under' },
  { id: 'U2.5', ad: 'Under 2.5', categoryName: 'Over/Under' },
  { id: 'U3.5', ad: 'Under 3.5', categoryName: 'Over/Under' },
  { id: 'BTTS_Y', ad: 'Both Teams To Score - Yes', categoryName: 'BTTS' },
  { id: 'BTTS_N', ad: 'Both Teams To Score - No', categoryName: 'BTTS' },
  { id: 'HT1', ad: 'Half Time - Home', categoryName: 'Half Time' },
  { id: 'HTX', ad: 'Half Time - Draw', categoryName: 'Half Time' },
  { id: 'HT2', ad: 'Half Time - Away', categoryName: 'Half Time' },
  { id: 'HTO0.5', ad: 'HT Over 0.5', categoryName: 'Half Time Over/Under' },
  { id: 'HTO1.5', ad: 'HT Over 1.5', categoryName: 'Half Time Over/Under' },
  { id: 'HTS', ad: 'Home Team Scores', categoryName: 'Team To Score' },
  { id: 'ATS', ad: 'Away Team Scores', categoryName: 'Team To Score' },
  { id: 'TG01', ad: 'Total Goals 0-1', categoryName: 'Total Goals Range' },
  { id: 'TG23', ad: 'Total Goals 2-3', categoryName: 'Total Goals Range' },
  { id: 'TG46', ad: 'Total Goals 4-6', categoryName: 'Total Goals Range' },
]

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
    const rateLimit = await checkRateLimit(supabase, clientIP, fixtureId, 'claude-predictions', DAILY_MATCH_LIMIT)

    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP ${clientIP}`)
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: lang === 'en'
            ? 'Daily prediction limit reached (3 different matches/day)'
            : 'Günlük tahmin limitinize ulaştınız (3 farklı maç/gün)',
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
      .from('match_predictions')
      .select('prediction, expires_at')
      .eq('fixture_id', fixtureId)
      .eq('language', lang)
      .single()

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`Cache hit for predictions fixture ${fixtureId} (${lang})`)
      return new Response(JSON.stringify(cached.prediction), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining)
        },
      })
    }

    console.log(`Cache miss for predictions fixture ${fixtureId} (${lang}), calling Claude API`)

    // 2. Cache'de yoksa veya expire olmuşsa Claude API çağır
    const prompt = lang === 'en'
      ? generateBettingPromptEN(matchData)
      : generateBettingPromptTR(matchData)

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
    let predictions
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0])
        // Tahminleri zenginleştir
        predictions = enrichPredictions(predictions, lang)
      } else {
        predictions = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      predictions = getDefaultPredictions(lang)
    }

    // 3. Cache'e kaydet (24 saat TTL) - language dahil
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const matchDate = matchData.date || new Date().toISOString().split('T')[0]

    await supabase.from('match_predictions').upsert({
      fixture_id: fixtureId,
      language: lang,
      prediction: predictions,
      match_date: matchDate,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'fixture_id,language',
    })

    console.log(`Predictions saved to cache for fixture ${fixtureId} (${lang})`)

    return new Response(JSON.stringify(predictions), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimit.remaining)
      },
    })
  } catch (error) {
    console.error('Claude Predictions Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Generate betting predictions prompt - TURKISH
 */
function generateBettingPromptTR(matchData: any): string {
  const {
    home, away, league, date, time,
    homeForm, awayForm, h2h, homeTeamStats, awayTeamStats,
  } = matchData

  const homeName = home?.name || home || 'Ev Sahibi'
  const awayName = away?.name || away || 'Deplasman'
  const leagueName = league?.name || league || 'Bilinmeyen Lig'

  const bettingTypesStr = BETTING_TYPES_TR.map(t => `• ${t.id}: ${t.ad} (${t.categoryName})`).join('\n')

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
${bettingTypesStr}

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

SADECE JSON yanıt ver. Başka açıklama ekleme.`
}

/**
 * Generate betting predictions prompt - ENGLISH
 */
function generateBettingPromptEN(matchData: any): string {
  const {
    home, away, league, date, time,
    homeForm, awayForm, h2h, homeTeamStats, awayTeamStats,
  } = matchData

  const homeName = home?.name || home || 'Home Team'
  const awayName = away?.name || away || 'Away Team'
  const leagueName = league?.name || league || 'Unknown League'

  const bettingTypesStr = BETTING_TYPES_EN.map(t => `• ${t.id}: ${t.ad} (${t.categoryName})`).join('\n')

  return `As a professional football betting analyst, generate BETTING PREDICTIONS for the following match.

═══════════════════════════════════════════════════════════════════
                          MATCH INFO
═══════════════════════════════════════════════════════════════════
• Home Team: ${homeName}
• Away Team: ${awayName}
• League: ${leagueName}
• Date: ${date || 'N/A'}
• Time: ${time || 'N/A'}

═══════════════════════════════════════════════════════════════════
                         FORM DATA
═══════════════════════════════════════════════════════════════════
• Home Team Recent Form: ${homeForm || 'Unknown'}
• Away Team Recent Form: ${awayForm || 'Unknown'}
${homeTeamStats ? `• Home Team Goal Avg: ${homeTeamStats.avgGoalsScored || 'N/A'}` : ''}
${awayTeamStats ? `• Away Team Goal Avg: ${awayTeamStats.avgGoalsScored || 'N/A'}` : ''}

═══════════════════════════════════════════════════════════════════
                      HEAD TO HEAD (H2H)
═══════════════════════════════════════════════════════════════════
${h2h ? `
• Total Meetings: ${h2h.total || h2h.length || 0}
• ${homeName} Wins: ${h2h.homeWins || 0}
• Draws: ${h2h.draws || 0}
• ${awayName} Wins: ${h2h.awayWins || 0}
` : 'H2H data not available'}

═══════════════════════════════════════════════════════════════════
                    AVAILABLE BET TYPES
═══════════════════════════════════════════════════════════════════
${bettingTypesStr}

═══════════════════════════════════════════════════════════════════
                           TASK
═══════════════════════════════════════════════════════════════════

Select the 5-7 MOST SUITABLE bet types from the list above for this match.
Determine confidence rate and risk level for each prediction.

IMPORTANT RULES:
1. Only select from the bet types listed above
2. Confidence must be between 0-100
3. Risk: "low", "medium", "high" or "very_high"
4. Write a short logical reason for each prediction

JSON FORMAT:
{
  "predictions": [
    {
      "betType": "MS1",
      "betName": "Match Result - Home",
      "category": "match_result",
      "selection": "Home Win",
      "confidence": 72,
      "risk": "medium",
      "reasoning": "Home team won 4 out of last 5 matches"
    }
  ],
  "topPick": {
    "betType": "O2.5",
    "betName": "Over 2.5",
    "confidence": 75,
    "reasoning": "Most reliable prediction"
  },
  "summary": "Match summary (max 80 words)",
  "riskWarning": "Special risk warning for this match (if any)"
}

Respond ONLY with JSON. Do not add any other explanation.`
}

/**
 * Enrich predictions with additional metadata - Language aware
 */
function enrichPredictions(predictions: any, lang: string): any {
  if (!predictions.predictions) return predictions

  const riskLevelsTR: Record<string, { color: string, label: string }> = {
    'dusuk': { color: '#4CAF50', label: 'Düşük Risk' },
    'orta': { color: '#FF9800', label: 'Orta Risk' },
    'yuksek': { color: '#f44336', label: 'Yüksek Risk' },
    'cok_yuksek': { color: '#9C27B0', label: 'Çok Yüksek Risk' },
  }

  const riskLevelsEN: Record<string, { color: string, label: string }> = {
    'low': { color: '#4CAF50', label: 'Low Risk' },
    'medium': { color: '#FF9800', label: 'Medium Risk' },
    'high': { color: '#f44336', label: 'High Risk' },
    'very_high': { color: '#9C27B0', label: 'Very High Risk' },
  }

  const riskLevels = lang === 'en' ? riskLevelsEN : riskLevelsTR
  const defaultRisk = lang === 'en' ? riskLevelsEN['medium'] : riskLevelsTR['orta']

  predictions.predictions = predictions.predictions.map((p: any) => ({
    ...p,
    riskInfo: riskLevels[p.risk] || defaultRisk,
  }))

  return predictions
}

/**
 * Get default predictions when API fails - Language aware
 */
function getDefaultPredictions(lang: string): any {
  if (lang === 'en') {
    return {
      predictions: [],
      topPick: null,
      summary: 'Prediction could not be generated. Please try again later.',
      riskWarning: 'Data unavailable',
    }
  }

  return {
    predictions: [],
    topPick: null,
    summary: 'Tahmin üretilemedi. Lütfen daha sonra tekrar deneyin.',
    riskWarning: 'Veri alınamadı',
  }
}
