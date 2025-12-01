// Sync Football Data Edge Function
// Cron job tarafından çağrılır, API-Football verilerini Supabase'e kaydeder
// Desteklenen sync tipleri: fixtures, standings, leagues, teams, injuries, all

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BASE_URL = 'https://v3.football.api-sports.io'

// Popular league IDs to sync standings for
const POPULAR_LEAGUES = [39, 140, 135, 78, 61, 203, 2, 3, 88, 94, 144, 197]
const CURRENT_SEASON = new Date().getFullYear()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// API-Football'dan veri çek
async function fetchFromAPI(endpoint: string, params: Record<string, string> = {}) {
  const queryString = Object.keys(params).length > 0
    ? '?' + new URLSearchParams(params).toString()
    : ''

  const url = `${BASE_URL}/${endpoint}${queryString}`
  console.log(`Fetching: ${url}`)

  const response = await fetch(url, {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  const data = await response.json()
  return data.response || []
}

// Supabase client oluştur
function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

// Sync log kaydet
async function logSync(supabase: any, syncType: string, status: string, recordsSynced: number, errorMessage?: string, durationMs?: number) {
  await supabase.from('sync_log').insert({
    sync_type: syncType,
    status,
    records_synced: recordsSynced,
    error_message: errorMessage,
    duration_ms: durationMs,
  })
}

// ============================================
// SYNC FUNCTIONS
// ============================================

// Fixtures sync (bugünün maçları)
async function syncFixtures(supabase: any): Promise<{ success: boolean; count: number; error?: string }> {
  const startTime = Date.now()
  try {
    const today = new Date().toISOString().split('T')[0]
    const timezone = 'Europe/Istanbul'

    const fixtures = await fetchFromAPI('fixtures', { date: today, timezone })

    const { error } = await supabase
      .from('fixtures_cache')
      .upsert({
        date: today,
        timezone,
        data: fixtures,
        fixture_count: fixtures.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date' })

    if (error) throw error

    await logSync(supabase, 'fixtures', 'success', fixtures.length, undefined, Date.now() - startTime)
    return { success: true, count: fixtures.length }
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    await logSync(supabase, 'fixtures', 'error', 0, errorMsg, Date.now() - startTime)
    return { success: false, count: 0, error: errorMsg }
  }
}

// Standings sync (popüler ligler için puan durumu)
async function syncStandings(supabase: any): Promise<{ success: boolean; count: number; error?: string }> {
  const startTime = Date.now()
  let totalSynced = 0
  const errors: string[] = []

  for (const leagueId of POPULAR_LEAGUES) {
    try {
      const standings = await fetchFromAPI('standings', {
        league: leagueId.toString(),
        season: CURRENT_SEASON.toString()
      })

      if (standings.length > 0) {
        const { error } = await supabase
          .from('standings_cache')
          .upsert({
            league_id: leagueId,
            season: CURRENT_SEASON,
            data: standings[0], // standings array'in ilk elemanı
            updated_at: new Date().toISOString(),
          }, { onConflict: 'league_id,season' })

        if (error) throw error
        totalSynced++
      }

      // Rate limit için bekle (300 req/min = 200ms arası)
      await new Promise(r => setTimeout(r, 250))
    } catch (error) {
      errors.push(`League ${leagueId}: ${error.message}`)
    }
  }

  const status = errors.length === 0 ? 'success' : (totalSynced > 0 ? 'partial' : 'error')
  await logSync(supabase, 'standings', status, totalSynced, errors.join('; ') || undefined, Date.now() - startTime)

  return {
    success: errors.length === 0,
    count: totalSynced,
    error: errors.length > 0 ? errors.join('; ') : undefined
  }
}

// Leagues sync (tüm ligler)
async function syncLeagues(supabase: any): Promise<{ success: boolean; count: number; error?: string }> {
  const startTime = Date.now()
  try {
    const leagues = await fetchFromAPI('leagues', { current: 'true' })

    // Her ligi ayrı kaydet (bulk upsert)
    const records = leagues.map((item: any) => ({
      league_id: item.league.id,
      data: item,
      season: CURRENT_SEASON,
      updated_at: new Date().toISOString(),
    }))

    // Batch upsert (1000'er kayıt)
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase
        .from('leagues_cache')
        .upsert(batch, { onConflict: 'league_id' })

      if (error) throw error
    }

    await logSync(supabase, 'leagues', 'success', records.length, undefined, Date.now() - startTime)
    return { success: true, count: records.length }
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    await logSync(supabase, 'leagues', 'error', 0, errorMsg, Date.now() - startTime)
    return { success: false, count: 0, error: errorMsg }
  }
}

// Teams sync (popüler liglerdeki takımlar)
async function syncTeams(supabase: any): Promise<{ success: boolean; count: number; error?: string }> {
  const startTime = Date.now()
  let totalSynced = 0
  const errors: string[] = []

  for (const leagueId of POPULAR_LEAGUES.slice(0, 6)) { // İlk 6 lig
    try {
      const teams = await fetchFromAPI('teams', {
        league: leagueId.toString(),
        season: CURRENT_SEASON.toString()
      })

      const records = teams.map((item: any) => ({
        team_id: item.team.id,
        data: item,
        updated_at: new Date().toISOString(),
      }))

      if (records.length > 0) {
        const { error } = await supabase
          .from('teams_cache')
          .upsert(records, { onConflict: 'team_id' })

        if (error) throw error
        totalSynced += records.length
      }

      await new Promise(r => setTimeout(r, 250))
    } catch (error) {
      errors.push(`League ${leagueId}: ${error.message}`)
    }
  }

  const status = errors.length === 0 ? 'success' : (totalSynced > 0 ? 'partial' : 'error')
  await logSync(supabase, 'teams', status, totalSynced, errors.join('; ') || undefined, Date.now() - startTime)

  return { success: errors.length === 0, count: totalSynced, error: errors.length > 0 ? errors.join('; ') : undefined }
}

// Injuries sync
async function syncInjuries(supabase: any): Promise<{ success: boolean; count: number; error?: string }> {
  const startTime = Date.now()
  let totalSynced = 0
  const errors: string[] = []

  for (const leagueId of POPULAR_LEAGUES.slice(0, 6)) {
    try {
      const injuries = await fetchFromAPI('injuries', {
        league: leagueId.toString(),
        season: CURRENT_SEASON.toString()
      })

      const { error } = await supabase
        .from('injuries_cache')
        .upsert({
          league_id: leagueId,
          season: CURRENT_SEASON,
          data: injuries,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'league_id,season' })

      if (error) throw error
      totalSynced++

      await new Promise(r => setTimeout(r, 250))
    } catch (error) {
      errors.push(`League ${leagueId}: ${error.message}`)
    }
  }

  const status = errors.length === 0 ? 'success' : (totalSynced > 0 ? 'partial' : 'error')
  await logSync(supabase, 'injuries', status, totalSynced, errors.join('; ') || undefined, Date.now() - startTime)

  return { success: errors.length === 0, count: totalSynced, error: errors.length > 0 ? errors.join('; ') : undefined }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type = 'fixtures' } = await req.json().catch(() => ({}))
    const supabase = getSupabaseClient()

    console.log(`Starting sync: ${type}`)

    let result: { success: boolean; count: number; error?: string }

    switch (type) {
      case 'fixtures':
        result = await syncFixtures(supabase)
        break
      case 'standings':
        result = await syncStandings(supabase)
        break
      case 'leagues':
        result = await syncLeagues(supabase)
        break
      case 'teams':
        result = await syncTeams(supabase)
        break
      case 'injuries':
        result = await syncInjuries(supabase)
        break
      case 'all':
        // Sırayla hepsini sync et
        const results = {
          fixtures: await syncFixtures(supabase),
          leagues: await syncLeagues(supabase),
          standings: await syncStandings(supabase),
          teams: await syncTeams(supabase),
          injuries: await syncInjuries(supabase),
        }
        result = {
          success: Object.values(results).every(r => r.success),
          count: Object.values(results).reduce((sum, r) => sum + r.count, 0),
        }
        return new Response(JSON.stringify({ type: 'all', results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      default:
        return new Response(
          JSON.stringify({ error: `Unknown sync type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log(`Sync completed: ${type} - ${result.count} records`)

    return new Response(JSON.stringify({ type, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
