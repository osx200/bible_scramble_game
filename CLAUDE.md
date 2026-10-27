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

1. **`AppModeContext`** (outermost) — `appMode` string switches between the four independent modes:
   - `'scramble'` → renders `<GameProvider><GameRouter /></GameProvider>` (the default)
   - `'quiz'` → renders `<QuizApp />`
   - `'moderator'` → renders `<ModeratorApp />`
   - `'recall'` → renders `<RecallApp />` — this is the final `else` in `AppContent`, so any unrecognised `appMode` lands here

2. **`GameRouter`** (inside `GameProvider`) — switches on `state.phase` from `GameContext`:
   `menu → team-register → team-transition → playing → team-results / gameOver`

`Menu.jsx` owns both the app-mode tile grid and the scramble setup screens via a local `selected` state: `null` (tile grid) → `'scramble'` (word-set chooser) → `'setup'` (difficulty/category/timer, then START_GAME).

### Scramble game state machine (`src/context/GameContext.jsx`)
Single `useReducer` with all game state. Key patterns:
- **Word sets**: `state.wordSet` (`'books' | 'prophets'`) picks which list the game draws from — the two sub-games under the Word Unscramble tile. Everything else (solo/teams, difficulty, timer, hints, voice, scoring) is shared. The state keys `books` / `currentBook` / `result.book` / `lastResult.bookName` predate prophets and hold entries from whichever set is active. **Any new settings field must be carried forward explicitly in both `START_GAME` and `RESTART`** — both spread `...initialState`, so an omitted field silently resets.
- `resolveNextRound()` is the central helper — called by `SUBMIT_ANSWER`, `TIME_UP`, and `SKIP_BOOK`. It computes new score/streak and decides next phase.
- **Teams deferred transition**: In teams mode, `resolveNextRound` intentionally keeps `phase: 'playing'` and sets `timeRemaining: -1` (freezes timer). It stores the real next state in `_pendingTeamNext`. When `RoundFeedback` dismisses 1.5s later, it dispatches `CLEAR_LAST_RESULT`, which reads `_pendingTeamNext` and applies the actual phase change (`team-transition` or `team-results`). This ensures the feedback overlay is always visible before the screen changes.
- `RESTART` preserves `difficulty`, `category`, `customTime`, and `mode` from the current state.

### Recall mode (`src/components/RecallApp/`)
Self-contained with local `useState`. `RecallApp` owns `phase` (`'setup'` | `'play'` | `'results'`) plus `config` and `results`; `RecallPlay` runs its own `setInterval` countdown and keeps a `namedSetRef` in sync with the named-books `Set` so the timer-expiry effect sees fresh data. No shared context with the scramble game.
- **Data source is `src/data/canonicalBooks.js`, not `bibleBooks.js`** — `CANONICAL_BOOKS` is the real 66-book canon (39 OT / 27 NT), while `bibleBooks.js` has 69 scramble-game entries and is missing Jeremiah. Never use `bibleBooks` for Recall.
- `matchBookName(input)` (same file) resolves freeform typed input to a canonical name via an alias map, normalising Roman-numeral prefixes first (`"iii john"` → `3 John`). Returns `null` for anything unrecognised — that's what drives the "Not a Bible book" shake.
- Setup filters by `testament` (`'all' | 'ot' | 'nt'`) and a fixed timer list (60/120/180/300s); results score by `Set` size against `config.targetBooks`.

### Quiz mode (`src/components/QuizApp/`)
Self-contained with local `useState`. `QuizApp` manages `quizPhase` (`'builder'` | `'player'`) and the `questions` array. No shared context with the scramble game.

### Reactions
Celebration reactions (🎉 🏆 ✋ …) are available on every screen, fired manually or automatically.
- `src/context/ReactionContext.jsx` — `ReactionProvider` wraps the app in `App.jsx`, holds the single `<ReactionOverlay>` and the reaction state. **Two contexts on purpose**: `useReactionTrigger()` returns a stable `{ triggerReaction, triggerRandomReaction }` so firing a reaction doesn't re-render views that only trigger; `useActiveReaction()` is for the pickers' active-state highlight.
- `src/hooks/useReactions.js` — the state + auto-clear timer behind the provider. The `key` on each trigger restarts the animation; `hold` (seconds on screen, default 3) is passed through to the overlay as `--hold`, and the clear timer tracks it.
- `src/data/reactions.js` — `REACTION_CONFIG` (type → emoji/label/tint/confetti), `REACTIONS` (picker order), `randomReactionType(prev)` (never repeats the previous one), `WINNER_REACTION`. A `reserved: true` entry stays in the picker but is excluded from the random pool.
- **Automatic, per correct answer**: `GameBoard` fires `triggerRandomReaction({ hold: 1.1 })` — short so it clears with the 1.5s `RoundFeedback` instead of covering the next round. `QuizPlayer` does the same (`hold: 1.6`) when a question is marked correct. Recall mode is deliberately excluded: correct answers there come every few seconds.
- **Winner (🏆) is reserved for end-of-game wins** and never appears at random. Fired by `TeamResults` (a clear winner; a tie keeps the screen's 🤝 instead), `GameOver` (a perfect solo score — the same bar its 🏆 rating uses), and `QuizPlayer`'s summary (≥80%, matching its 🏆). Each end screen also renders its own `<Confetti>`, so a win stacks that with the overlay's.
- **Manual**: `src/components/Reactions/` is a floating collapsible picker rendered in `App.jsx` for every mode **except** moderator, which has its own inline panel in `ModeratorPlay`.
- z-index ladder: ThemeToggle 100 → Reactions picker 150 → ReactionOverlay 200 → Confetti 999. The overlay is `pointer-events: none` so play continues underneath.

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
- `src/utils/scoring.js` — flat scoring: `pointsFor(correct)` returns `POINTS_CORRECT` (20) or `POINTS_INCORRECT` (-2). Wrong answer, timeout, and skip all cost the same, hints are free, and the running total may go negative. `DIFFICULTY_CONFIG` now only sets timers and round counts — difficulty and streak affect pacing and stats, never points.
- `src/utils/wordFilter.js` — `selectWords({ wordSet, difficulty, category, count })` filters and shuffles from the chosen word set. Difficulty is cumulative (hard includes 1+2+3); category matches `testament` case-insensitively. `src/utils/bookFilter.js` is now just a `selectBooks` wrapper pinned to `wordSet: 'books'` (used by `ModeratorApp`).
- `src/data/wordSets.js` — the word-set registry (`books`, `prophets`): data list plus all the copy that changes with it (`noun`, `label`, `subtitle`, `allLabel`, `typingHint`, voice prefixes/fuzzy budget). Components read it via `useWordSet()` from `GameContext` — never hardcode "book" or "prophet" in a component.
- `src/data/canonicalBooks.js` — the 66-book canon + `matchBookName()` alias matcher, owned by Recall mode (see above). Kept deliberately separate from `bibleBooks.js`.
- `src/data/bibleProphets.js` — 49 prophets, same entry shape as `bibleBooks.js`. Keep every (category × difficulty) pool at 10+ entries or team mode repeats names: `START_TEAM_TURN` falls back to `books[0]` when the pool runs short.
- `src/hooks/useVoiceInput.js` — Web Speech API wrapper. Creates a **fresh** `SpeechRecognition` instance on every `start()` call (required by Chrome). Awaits `getUserMedia` first so the engine never starts behind an open permission prompt, and reports `supported: false` with `unsupportedReason: 'insecure-context'` off HTTPS/localhost. Never time-limits the player's speech — the only watchdog fires when the engine reports no start at all (Brave lacks Google's Speech API key), surfacing `'service-unavailable'`. `onResult` receives the engine's ranked alternatives as a `string[]`.
- `src/utils/voiceMatch.js` — `resolveSpokenAnswer(transcripts, wordSetId)` turns those alternatives into a name from that word set (vocabulary cached per set; prophets skip the number-word and `matchBookName` handling and use a tighter fuzzy budget, since names like Micah/Micaiah are one or two edits apart): strips punctuation and filler ("the book of"), converts spoken numbers ("first Samuel" → `1 Samuel`), matches against `bibleBooks` + `canonicalBooks` aliases, then falls back to a Levenshtein match. Fuzzy hits never cross a number prefix (`1 Samuel` ≠ `2 Samuel`) and are returned with `exact: false` so callers can confirm instead of auto-submitting.

### ID generation
Do not use `crypto.randomUUID()` anywhere — the app may be accessed over plain HTTP. Use the project's `uid()` pattern instead:
```js
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
```

### Repo quirks
- `.gitignore` only excludes `.agents/` and `certs/` — **`node_modules/` and `dist/` are both committed**. A `npm install` or `npm run build` therefore shows up as a large diff; don't mistake it for someone else's changes, and don't commit a rebuild unless that's the intent. `.dockerignore` excludes both, so the image always builds from source.
- `src/components/TeamDone/` is not imported anywhere — dead code left from an earlier team flow.

## Playing on the home network (local only)
```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d --build
```
Publishes 80 (redirects) and 443 on all interfaces and serves HTTPS with an mkcert certificate from `certs/` (gitignored, never baked into the image — `.dockerignore` excludes it). HTTPS is not decoration here: browsers only expose the microphone on a secure origin, so voice input is dead over `http://192.168.x.x`.

Each device installs the local CA once from `http://<lan-ip>/rootCA.pem` — deliberately served over plain HTTP, since a phone can't trust the HTTPS endpoint until it has that file. Regenerate certs after an IP change:
`mkcert -cert-file certs/lan-cert.pem -key-file certs/lan-key.pem <new-ip> localhost 127.0.0.1`

Windows needs inbound firewall rules for TCP 80/443 on the **Private** profile — Docker Desktop only creates Public-profile rules, which don't apply on a home Wi-Fi.

## Deployment
- Docker multi-stage build: Node 24 Alpine builds, nginx 1.27 Alpine serves from `/usr/share/nginx/html`; a `HEALTHCHECK` wgets `/` so `docker compose ps` reports health
- `nginx.conf` gotchas: `Permissions-Policy` must keep `microphone=(self)` or voice input is blocked in production; `index.html` is served `no-cache` via `expires -1` (**not** `add_header` — an `add_header` in a location block cancels every inherited header, including the security ones)
- `docker-compose.yml` binds `127.0.0.1:8080:80` — container is localhost-only; host nginx reverse-proxies and terminates HTTPS
- HTTPS via DuckDNS subdomain + Certbot Let's Encrypt on the EC2 host nginx
- AWS Security Group requires ports 80 and 443 open for Certbot and HTTPS traffic
