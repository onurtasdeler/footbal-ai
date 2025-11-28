# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native mobile application (Expo SDK 54) for football match tracking, live scores, and AI-powered betting analysis. Integrates with API-Football v3 for data and Claude AI for match predictions.

## Development Commands

```bash
npm install          # Install dependencies
npm start            # Start Expo dev server (or: npx expo start)
npm run android      # Run on Android emulator/device
npm run ios          # Run on iOS simulator/device
npm run web          # Run in web browser
```

## Architecture

### Entry Points
- `index.js` - Expo root component registration
- `App.js` - Main application (~147KB, monolithic component with all UI screens)

### Services (`src/services/`)
- `footballApi.js` - API-Football v3 client with rate limiting (280 req/min safety margin)
- `claudeAi.js` - Claude Sonnet 4 integration for match analysis (Turkish language prompts)

### Key Dependencies
- `expo` ~54.0.25 (New Architecture enabled)
- `react` 19.1.0 / `react-native` 0.81.5
- `expo-localization` - Device locale detection for country-based league prioritization

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

## Documentation

- `docs/BETTING_ANALYSIS.md` - Betting analysis system technical docs (Turkish)
- `docs/UI_DESIGN_PROMPTS.md` - AI design prompts for all pages
