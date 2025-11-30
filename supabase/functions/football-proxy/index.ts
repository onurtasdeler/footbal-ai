// Football API Proxy Edge Function
// Tüm Football API çağrılarını güvenli şekilde proxy'ler
// API Key sunucu tarafında saklanır, client'a asla gönderilmez

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY')!
const BASE_URL = 'https://v3.football.api-sports.io'

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
    const { endpoint, params } = await req.json()

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Query string oluştur
    const queryString = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : ''

    const url = `${BASE_URL}/${endpoint}${queryString}`

    console.log(`Football API Request: ${url}`)

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Football API Error: ${response.status} - ${errorText}`)
      return new Response(
        JSON.stringify({ error: 'Football API error', status: response.status }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Football Proxy Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
