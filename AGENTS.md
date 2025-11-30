# Repository Guidelines

## Project Structure & Module Organization
- `App.js` bootstraps the Expo app, SafeAreaProvider, and global layout; `index.js` is the bare entry for Metro.
- `src/screens/` holds UI flows (`HomeScreen.js`, `MatchAnalysisScreen.js`); keep new screens here with one component per file.
- `src/services/` centralizes data access (`footballApi.js`, `pollingService.js`, `cacheService.js`, `profileService.js`, `claudeAi.js`) and is the right place for API wrappers and caching.
- `src/theme/colors.js` defines the color palette; prefer importing tokens instead of inlining hex values.
- `assets/` stores images and static media; `docs/` and the AI markdown files document agents and prompts.
- Configuration lives in `.env` (API keys, base URLs) and `app.json`; keep secrets out of source control.

## Build, Test, and Development Commands
- `npm start` (or `npx expo start`): run the Expo dev server; press `a`/`i`/`w` in the CLI for Android/iOS/Web targets.
- `npm run android` / `npm run ios` / `npm run web`: start the dev server and launch the selected platform directly.
- `npx expo start --clear`: clear Metro cache when bundling issues arise.
- `npx expo export --platform web` (if needed): produce a static web build.

## Coding Style & Naming Conventions
- JavaScript with React hooks and functional components; prefer 2-space indentation, semicolons, and trailing commas.
- Components in `PascalCase`, functions/variables in `camelCase`, constants in `SCREAMING_SNAKE_CASE`.
- Keep side effects inside `useEffect`/`useCallback`; colocate styles via `StyleSheet.create` and source colors from `src/theme/colors.js`.
- Services should stay pure (no UI imports); reuse `cacheService` helpers for request caching and rate-limit protection.

## Testing Guidelines
- No automated test suite is present yet. When adding tests, use Jest with `@testing-library/react-native`; place specs as `__tests__/*.test.js` or alongside modules as `*.test.js`.
- Favor testing data transforms (services) and interactive UI flows; mock network calls around `footballApi.js`.
- Before opening a PR, run the target platform via Expo to validate navigation, loading states, and AsyncStorage behavior.

## Commit & Pull Request Guidelines
- Follow Conventional Commits as seen in history (`feat: ...`, `fix: ...`, `chore: ...`); keep scopes short and lowercased.
- PRs should include: concise summary, linked issue/Task ID, screenshots or screen recordings for UI changes, and clear test notes (e.g., “Ran `npm start` on web + Android simulator”).
- Prefer small, reviewable PRs; describe any new env variables or migration steps in the description.

## Security & Configuration Tips
- Required env vars: `API_FOOTBALL_KEY` and optionally `API_FOOTBALL_URL`; load via `@env` (react-native-dotenv). Do not commit `.env` or log secrets.
- Treat AsyncStorage data as user-sensitive; avoid storing tokens in plaintext and clear caches via `cacheService` when revoking access.
- If adding new endpoints, respect the existing rate-limit guard in `footballApi.js` and reuse shared headers to keep keys centralized.
