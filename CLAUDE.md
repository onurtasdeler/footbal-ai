# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native mobile application (Expo SDK 54) for football match tracking, live scores, and AI-powered betting analysis. Integrates with API-Football v3 for data and Claude AI for match predictions. Turkish/English bilingual UI with device locale detection.

## Development Commands

```bash
npm install          # Install dependencies
npm start            # Start Expo dev server (or: npx expo start)
npm run android      # Run on Android emulator/device
npm run ios          # Run on iOS simulator/device
npm run web          # Run in web browser

# EAS Build (production)
eas build --platform android --profile production
eas build --platform ios --profile production
```

**Environment Setup**: Create `.env` file with `API_FOOTBALL_KEY` and `API_FOOTBALL_URL`.

**Note**: RevenueCat subscription features don't work in Expo Go. Use development builds for testing IAP.

## Architecture

### Navigation Structure
Uses `@react-navigation` with lazy-loaded screens via React.lazy() and Suspense:

```
AppNavigator.js
├── SplashScreen → OnboardingScreen (first launch)
└── MainTabs (Bottom Tab Navigator)
    ├── HomeStack
    │   ├── HomeScreen.js - Today's fixtures, filtering, search
    │   └── MatchAnalysisScreen.js - AI betting analysis
    ├── LiveStack
    │   ├── LiveScreen.js - Real-time scores with polling
    │   └── LiveMatchDetailScreen.js - Live match details
    ├── PredictionsScreen.js - AI predictions list
    ├── ProfileScreen.js - Settings, stats, cache management
    └── PaywallScreen.js - Subscription purchase (modal)
```

### Services (`src/services/`)
- `footballApi.js` - API-Football v3 client with rate limiting (280 req/min) and cache-first strategy
- `claudeAi.js` - Claude Sonnet 4 integration for match analysis (Turkish language prompts)
- `cacheService.js` - AsyncStorage-based caching with tiered TTLs (30s-24h)
- `pollingService.js` - Smart polling with AppState awareness (speeds up at 85+ min)
- `revenueCatService.js` - RevenueCat SDK wrapper for subscriptions
- `reviewService.js` - App Store review prompting logic
- `supabaseService.js` - Supabase backend integration

### Context Providers
- `SubscriptionContext.js` - Global PRO subscription state via RevenueCat
  - `DEV_MODE_PRO_BYPASS` flag for testing PRO features in Expo Go

### i18n (`src/i18n/`)
- `tr.json` / `en.json` - Translation files
- Auto-detects device language via `expo-localization`
- Use `t('key.path')` function for translations

### Key Dependencies
- `expo` ~54.0.25, `react` 19.1.0, `react-native` 0.81.5
- `react-native-purchases` - RevenueCat SDK for subscriptions
- `@supabase/supabase-js` - Backend integration

### Caching Strategy
Tiered cache durations in `cacheService.js`:
- **Live data** (30-60s): `LIVE_FIXTURES`, `FIXTURE_STATS`, `FIXTURE_EVENTS`
- **Semi-static** (5-60min): `FIXTURE_LINEUPS`, `STANDINGS`, `HEAD_TO_HEAD`
- **Static** (1-24h): `LEAGUES`, `TEAM_INFO`, `TOP_SCORERS`
- **Finished matches**: 7-day cache (results don't change)

## API-Football v3 Integration

**Base URL**: `https://v3.football.api-sports.io`

### Implemented Endpoints
| Function | Endpoint | Purpose |
|----------|----------|---------|
| `getTodayFixtures` | `/fixtures?date=` | Today's matches |
| `getLiveFixtures` | `/fixtures?live=all` | Real-time scores |
| `getFixtureById` | `/fixtures?id=` | Single match details |
| `getFixtureStats` | `/fixtures/statistics` | Match statistics |
| `getFixtureEvents` | `/fixtures/events` | Goals, cards, subs |
| `getFixtureLineups` | `/fixtures/lineups` | Team lineups |
| `getHeadToHead` | `/fixtures/headtohead` | H2H history |
| `getPredictions` | `/predictions` | API predictions |
| `getStandings` | `/standings` | League tables |
| `getTeamInfo/Stats` | `/teams`, `/teams/statistics` | Team data |
| `getLeagues` | `/leagues` | Competition list |

### Fixture Status Codes
- **Not Started**: `NS`
- **In Progress**: `1H`, `HT`, `2H`, `ET`, `BT`, `P`
- **Finished**: `FT`, `AET`, `PEN`
- **Irregular**: `SUSP`, `INT`, `PST`, `CANC`, `ABD`, `AWD`, `WO`

### Rate Limiting
Pro plan: 300 req/min. Client implements safety margin at 280 requests with automatic wait.

## Claude AI Integration

Match analysis returns structured JSON:
```json
{
  "homeWinProb": 0-100,
  "drawProb": 0-100,
  "awayWinProb": 0-100,
  "confidence": 1-10,
  "expectedGoals": float,
  "bttsProb": 0-100,
  "over25Prob": 0-100,
  "winner": "ev/beraberlik/deplasman",
  "advice": "Turkish text",
  "factors": [{"text": "...", "positive": boolean}]
}
```

## UI Constants

Popular league IDs used for prioritization:
- 39: Premier League
- 140: La Liga
- 135: Serie A
- 78: Bundesliga
- 61: Ligue 1
- 203: Turkish Super Lig
- 2: Champions League
- 3: Europa League

### Smart Polling Intervals
Defined in `pollingService.js`:
- **Critical** (15s): Match minute 85+
- **Important** (20s): Match minute 75-84
- **Active** (30s): Normal live match
- **Halftime** (2min): Devre arası
- **Background**: 3x multiplier when app inactive

### AsyncStorage Keys
```javascript
// Profile & Settings
'@profile_user'           // User display name, membership date
'@profile_stats'          // Prediction stats (total, correct)
'@profile_appearance'     // Dark mode, language, odds format

// Cache
'@api_cache_*'            // API response cache (auto-managed)
'ai_analysis_*'           // Claude AI analysis cache (per fixture)

// User Data
'@user_widgets'           // Widget configuration
'@favorite_teams'         // Favorite team IDs
```

## RevenueCat Subscription

- Entitlement ID: `Goalwise Pro`
- Products: `weekly` / `monthly` (different IDs per platform)
- iOS: `weeekly`, `monthly`
- Android: `goalwise_weekly`, `goalwise_monthly`
- API keys configured in `app.json` → `extra.revenueCatApiKey*`

## Documentation

- `docs/PRD.md` - Product requirements and full feature list
- `docs/BETTING_ANALYSIS.md` - Betting analysis system technical docs (Turkish)
- `docs/UI_DESIGN_PROMPTS.md` - AI design prompts for all pages
