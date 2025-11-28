# GEMINI.md

This file provides context and guidance for Gemini when working on this project.

## Project Overview

**Name:** Footbal (Expo App)
**Goal:** Develop a comprehensive football data and betting analysis application using **API-Football v3**.
**Current Status:** Freshly initialized Expo project. `App.js` is currently the default boilerplate. The architecture and domain logic are well-documented but not yet implemented.

## Technical Stack

*   **Framework:** React Native (via Expo ~54.0.25)
*   **UI Library:** React Native Core Components (intended to use modern styling/UI libs as needed)
*   **Language:** JavaScript/TypeScript (Inferred from `CLAUDE.md` suggestions, though currently `.js` files exist. Prefer TypeScript for new files if consistent with user preference).
*   **Package Manager:** npm

## Architecture & Conventions

The project follows a specific architectural plan outlined in `CLAUDE.md`.

### Recommended Structure (Target)
The codebase should evolve to match this structure:
```
/src
  /api          # API client, endpoints, and rate limiting
  /models       # Types and interfaces
  /services     # Business logic (betting analysis, sync)
  /components   # Reusable UI components
  /screens      # Application screens
  /utils        # Helpers (formatters, constants)
  /navigation   # Navigation configuration
```

### Key Documents
*   **`CLAUDE.md`**: Contains the **Core Architecture**, **API-Football v3 Integration Details** (endpoints, rate limits), and **Caching Strategy**. Consult this frequently when implementing the backend logic.
*   **`docs/BETTING_ANALYSIS.md`**: Detailed specifications for the betting logic, including "Value Bet" formulas, data sources for specific bet types (1X2, Over/Under, etc.), and the data collection sequence.
*   **`docs/UI_DESIGN_PROMPTS.md`**: Contains UI/UX prompts and guidelines.

## Development Workflow

### Building & Running
*   **Start Development Server:** `npm start` (or `npx expo start`)
*   **Run on Android:** `npm run android`
*   **Run on iOS:** `npm run ios`
*   **Run on Web:** `npm run web`

### Implementation Guidelines
1.  **API Integration:** Follow the pattern in `CLAUDE.md`. Implement rate limiting and caching early to avoid hitting API limits.
2.  **Domain Logic:** Refer to `docs/BETTING_ANALYSIS.md` when building the analysis features.
3.  **UI:** Check `docs/UI_DESIGN_PROMPTS.md` for design direction.
4.  **Clean Code:** Prefer functional components and Hooks.

## Immediate Tasks (Inferred)
Since the project is in the "Hello World" state:
1.  Set up the folder structure (`src/api`, `src/components`, etc.).
2.  Install necessary dependencies (Navigation, Axios/Fetch wrapper, etc.).
3.  Implement the API client with the API Key configuration.
4.  Create the basic navigation flow.
