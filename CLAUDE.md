# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build into dist/
npm run preview    # Preview production build locally

# Deploy (on EC2 after git pull)
docker compose down && docker compose up -d --build
```

No linter or test runner is configured.

## Architecture

### Top-level routing
There is no react-router-dom. Navigation is purely state-driven. `App.jsx` has two levels:

1. **`AppModeContext`** (outermost) — `appMode` string switches between the three independent modes:
   - `'scramble'` → renders `<GameProvider><GameRouter /></GameProvider>`
   - `'quiz'` → renders `<QuizApp />`
   - `'moderator'` → renders `<ModeratorApp />`

2. **`GameRouter`** (inside `GameProvider`) — switches on `state.phase` from `GameContext`:
   `menu → team-register → team-transition → playing → team-results / gameOver`

### Scramble game state machine (`src/context/GameContext.jsx`)
Single `useReducer` with all game state. Key patterns:
- `resolveNextRound()` is the central helper — called by `SUBMIT_ANSWER`, `TIME_UP`, and `SKIP_BOOK`. It computes new score/streak and decides next phase.
- **Teams deferred transition**: In teams mode, `resolveNextRound` intentionally keeps `phase: 'playing'` and sets `timeRemaining: -1` (freezes timer). It stores the real next state in `_pendingTeamNext`. When `RoundFeedback` dismisses 1.5s later, it dispatches `CLEAR_LAST_RESULT`, which reads `_pendingTeamNext` and applies the actual phase change (`team-transition` or `team-results`). This ensures the feedback overlay is always visible before the screen changes.
- `RESTART` preserves `difficulty`, `category`, `customTime`, and `mode` from the current state.

### Quiz mode (`src/components/QuizApp/`)
Self-contained with local `useState`. `QuizApp` manages `quizPhase` (`'builder'` | `'player'`) and the `questions` array. No shared context with the scramble game.

### Moderator mode (`src/components/ModeratorApp/`)
Self-contained with local `useState`. `ModeratorApp` manages `phase` (`'setup'` | `'play'`), calls `selectBooks` + `scrambleName` directly. `ModeratorPlay` owns its own timer via `useEffect`/`setInterval`. The `ReactionOverlay` component is fixed-position with `pointer-events: none` so controls remain usable while it plays.

### Styling conventions
- CSS Modules for every component (`ComponentName.module.css` co-located with `ComponentName.jsx`)
- All design tokens in `src/styles/variables.css` — always use `var(--token-name)`, never hardcode colors or spacing
- Dark mode via `[data-theme="dark"]` selector on `document.documentElement`; preference persisted in `localStorage`
- Font: **Poppins** for everything (`--font-main` and `--font-display` both resolve to Poppins)
- Mobile breakpoint: `@media (max-width: 700px)`. On mobile, full-page forms use `border-radius: 0`, `width: 100%`, `min-height: 100dvh` (not `100vh`) to fill the screen edge-to-edge

### Utilities
- `src/utils/scramble.js` — `scrambleName(bookName)` preserves numeric prefixes (`1`, `2`, `3`), scrambles each word independently via Fisher-Yates, re-tries up to 10× to avoid returning the original. Output is lowercase; CSS applies `text-transform: uppercase`.
- `src/utils/scoring.js` — `calculatePoints()` and `DIFFICULTY_CONFIG` (easy/medium/hard timers, base points)
- `src/utils/bookFilter.js` — `selectBooks({ difficulty, category, count })` filters and shuffles from `src/data/bibleBooks.js`
- `src/hooks/useVoiceInput.js` — Web Speech API wrapper. Creates a **fresh** `SpeechRecognition` instance on every `start()` call (required by Chrome). 5-second timeout detects Brave's silent failure (Brave lacks Google's Speech API key). Voice input only works in Chrome/Edge over HTTPS.

### ID generation
Do not use `crypto.randomUUID()` anywhere — the app may be accessed over plain HTTP. Use the project's `uid()` pattern instead:
```js
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
```

## Deployment
- Docker multi-stage build: Node 20 Alpine builds, nginx 1.27 Alpine serves from `/usr/share/nginx/html`
- `docker-compose.yml` binds `127.0.0.1:8080:80` — container is localhost-only; host nginx reverse-proxies and terminates HTTPS
- HTTPS via DuckDNS subdomain + Certbot Let's Encrypt on the EC2 host nginx
- AWS Security Group requires ports 80 and 443 open for Certbot and HTTPS traffic
