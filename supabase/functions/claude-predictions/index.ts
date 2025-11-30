// Claude Predictions Edge Function
// Bahis tahminleri için Claude AI çağrıları
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

// Popüler bahis türleri
const BETTING_TYPES = [
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
      .from('match_predictions')
      .select('prediction, expires_at')
      .eq('fixture_id', fixtureId)
      .single()

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`Cache hit for predictions fixture ${fixtureId}`)
      return new Response(JSON.stringify(cached.prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Cache miss for predictions fixture ${fixtureId}, calling Claude API`)

    // 2. Cache'de yoksa veya expire olmuşsa Claude API çağır
    const prompt = generateBettingPrompt(matchData)

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
        predictions = enrichPredictions(predictions)
      } else {
        predictions = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      predictions = getDefaultPredictions()
    }

    // 3. Cache'e kaydet (24 saat TTL)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const matchDate = matchData.date || new Date().toISOString().split('T')[0]

    await supabase.from('match_predictions').upsert({
      fixture_id: fixtureId,
      prediction: predictions,
      match_date: matchDate,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'fixture_id',
    })

    console.log(`Predictions saved to cache for fixture ${fixtureId}`)

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
 * Generate betting predictions prompt
 */
function generateBettingPrompt(matchData: any): string {
  const {
    home, away, league, date, time,
    homeForm, awayForm, h2h, homeTeamStats, awayTeamStats,
  } = matchData

  const homeName = home?.name || home || 'Ev Sahibi'
  const awayName = away?.name || away || 'Deplasman'
  const leagueName = league?.name || league || 'Bilinmeyen Lig'

  const bettingTypesStr = BETTING_TYPES.map(t => `• ${t.id}: ${t.ad} (${t.categoryName})`).join('\n')

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
 * Enrich predictions with additional metadata
 */
function enrichPredictions(predictions: any): any {
  if (!predictions.predictions) return predictions

  const riskLevels: Record<string, { color: string, label: string }> = {
    'dusuk': { color: '#4CAF50', label: 'Düşük Risk' },
    'orta': { color: '#FF9800', label: 'Orta Risk' },
    'yuksek': { color: '#f44336', label: 'Yüksek Risk' },
    'cok_yuksek': { color: '#9C27B0', label: 'Çok Yüksek Risk' },
  }

  predictions.predictions = predictions.predictions.map((p: any) => ({
    ...p,
    riskInfo: riskLevels[p.risk] || riskLevels['orta'],
  }))

  return predictions
}

/**
 * Get default predictions when API fails
 */
function getDefaultPredictions(): any {
  return {
    predictions: [],
    topPick: null,
    summary: 'Tahmin üretilemedi. Lütfen daha sonra tekrar deneyin.',
    riskWarning: 'Veri alınamadı',
  }
}
