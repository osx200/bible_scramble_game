# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run api        # Leaderboard API on :3001 (Vite proxies /api to it); DB in server/data/
npm run build      # Production build into dist/
npm run preview    # Preview production build locally

# Deploy (on EC2 after git pull)
docker compose down && docker compose up -d --build
```

No linter or test runner is configured.

## Architecture

### Top-level routing
There is no react-router-dom. Navigation is purely state-driven. `App.jsx` has two levels, behind a gate:

0. **`PlayerContext`** (outermost provider) — until a player profile exists (or while `editing` is true, from Menu's "Change" chip), `AppContent` renders `<Welcome />` instead of any mode. Switching to the Welcome page unmounts `GameProvider`, so scramble settings reset — it's only reachable from the home tile grid.

1. **`AppModeContext`** (inside `PlayerProvider`) — `appMode` string switches between the four independent modes:
   - `'scramble'` → renders `<GameProvider><GameRouter /></GameProvider>` (the default)
   - `'quiz'` → renders `<QuizApp />`
   - `'moderator'` → renders `<ModeratorApp />`
   - `'recall'` → renders `<RecallApp />` — this is the final `else` in `AppContent`, so any unrecognised `appMode` lands here

2. **`GameRouter`** (inside `GameProvider`) — switches on `state.phase` from `GameContext`:
   `menu → team-register → team-transition → playing → team-results / gameOver`

`Menu.jsx` owns both the app-mode tile grid and the scramble setup screens via a local `selected` state: `null` (tile grid) → `'scramble'` (word-set chooser) → `'setup'` (difficulty/category/timer, then START_GAME). `'leaderboard'` (full-width button under the grid) and `'about'` (the "About · Suggestions" link) are extra views off the home grid.

### Player profile (`src/context/PlayerContext.jsx`)
`usePlayer()` → `{ profile, setProfile, editing, startEditing, cancelEditing }`. `profile` is `{ name, kind: 'individual' | 'group' }`, saved in `localStorage` key `player` (every access in try/catch). `cleanPlayerName()` applies the same normalisation as the server; names are 2–24 chars. **The app has no product name of its own** — never hardcode one. Titles are built with `brandName(profile)` ("Kwame's" / "James'" for individuals, the plain name for groups) as "{brand} Bible Games" (Menu, tab title via an effect in `PlayerProvider`) and "{brand} Quiz Builder"; `index.html` only carries the neutral fallback "Bible Games". The name also appears on the solo GameBoard header, GameOver, RecallResults and the QuizPlayer summary, and prefills the first team in TeamRegister for a group profile.

### Welcome / About content (`src/components/Welcome/WelcomeIntro.jsx`)
`WelcomeIntro` (purpose + Hebrews 10:24–25 KJV) and `WelcomeFooter` (suggestions email `CONTACT_EMAIL` + disclaimer) are shared by the first-visit Welcome page and Menu's About view. The "Change" screen shows only the name form. Scripture is quoted from the KJV (public domain) — keep the disclaimer's translation credit in sync if the verse changes.

### Leaderboard
Two shared monthly boards, **Top Players** (`individual`) and **Top Groups** (`group`), top 5 each, fed by Word Unscramble only (Recall scores on a different scale).
- `server/index.js` — the only backend. Node built-ins only (`node:http` + `node:sqlite`), **no npm dependencies**. The monthly reset is just `WHERE month = currentMonth` (month computed in `BOARD_TZ`, default UTC); old months stay in the table. One row per name (best score, case-insensitive); ties go to harder difficulty, then earliest. POST recomputes the score from `correct`/`total` with the constants mirrored from `scoring.js` — **change both if scoring changes**. Also: name blocklist (`server/blocklist.js`), per-IP rate limit on the first `X-Forwarded-For` hop, idempotent client-generated ids.
- `src/utils/leaderboardApi.js` — fetch wrapper that never throws (`{ ok: false }` on any failure), plus `BOARDS` and month labels.
- `src/hooks/useLeaderboardSubmit.js` — end screens call this once; ids are fixed in a `useState` initializer so StrictMode's double effect can't duplicate a row.
- Solo games (`GameOver`) post to the profile's board; team games (`TeamResults`) post every team to `group` under the team name.
- `src/components/Leaderboard/` — `Leaderboard` (tabs + list, embeddable) and `EndScreenLeaderboard` (rank banner + expandable board for end screens).

### Scramble game state machine (`src/context/GameContext.jsx`)
Single `useReducer` with all game state. Key patterns:
- **Word sets**: `state.wordSet` (`'books' | 'prophets' | 'couples' | 'grandmix'`) picks which list the game draws from — the four sub-games under the Word Unscramble tile. Everything else (solo/teams, difficulty, timer, hints, voice, scoring) is shared. The state keys `books` / `currentBook` / `result.book` / `lastResult.bookName` predate prophets and hold entries from whichever set is active. **Any new settings field must be carried forward explicitly in both `START_GAME` and `RESTART`** — both spread `...initialState`, so an omitted field silently resets.
- `resolveNextRound()` is the central helper — called by `SUBMIT_ANSWER`, `TIME_UP`, and `SKIP_BOOK`. It computes new score/streak and decides next phase.
- **Teams deferred transition**: In teams mode, `resolveNextRound` intentionally keeps `phase: 'playing'` and sets `timeRemaining: -1` (freezes timer). It stores the real next state in `_pendingTeamNext`. When `RoundFeedback` dismisses 1.5s later, it dispatches `CLEAR_LAST_RESULT`, which reads `_pendingTeamNext` and applies the actual phase change (`team-transition` or `team-results`). This ensures the feedback overlay is always visible before the screen changes.
- `RESTART` preserves `difficulty`, `category`, `customTime`, and `mode` from the current state.

### Recall mode (`src/components/RecallApp/`)
Self-contained with local `useState`. `RecallApp` owns `phase` (`'setup'` | `'play'` | `'results'`) plus `config` and `results`; `RecallPlay` runs its own `setInterval` countdown and keeps a `namedSetRef` in sync with the named-books `Set` so the timer-expiry effect sees fresh data. No shared context with the scramble game.
- **Data source is `src/data/canonicalBooks.js`, not `bibleBooks.js`** — `CANONICAL_BOOKS` is the real 66-book canon (39 OT / 27 NT), while `bibleBooks.js` has 69 scramble-game entries and is missing Jeremiah. Never use `bibleBooks` for Recall.
- `matchBookName(input)` (same file) resolves freeform typed input to a canonical name via an alias map, normalising Roman-numeral prefixes first (`"iii john"` → `3 John`). Returns `null` for anything unrecognised — that's what drives the "Not a Bible book" shake.
- Setup filters by `testament` (`'all' | 'ot' | 'nt'`) and a fixed timer list (60/120/180/300s); results score by `Set` size against `config.targetBooks`.
- **Hands-free voice**: the mic button runs `useVoiceInput({ continuous: true })` for the whole round (one tap; stops on time-up, Finish Early or a second tap). Each spoken phrase goes through `extractSpokenBooks()` (`src/utils/voiceMatch.js`), which can return several books ("Genesis Exodus Leviticus"). Typed and spoken books share one `addBooks()` that checks category and duplicates against `namedSetRef` (not state) so a multi-book phrase can't race its own updates.

### Quiz & Scramble Builder (`src/components/QuizApp/`, `src/components/QuizBuilder/`)
`appMode` is still `'quiz'`. `QuizApp` owns `phase` (`'builder' | 'quiz' | 'scramble'`), the builder `tab`, and the session's `questions` and `words` in plain `useState`. **Session-only by design (the user's rule): never persist builder content to localStorage or the server.** Leaving to the menu unmounts `QuizApp`, which is what discards it; the Back button confirms first when there's content.
- `'quiz'` → `QuizPlayer`; `'scramble'` → the moderator's `ModeratorPlay` (host-led reveal, timer, reactions) with `backLabel="← Builder"`. Custom words carry an optional `clue`, shown by ModeratorPlay's "Show clue" button (built-in sets have none).
- Neither player posts to the leaderboard, so custom content can never reach it.
- `BulkUpload.jsx` — Excel/CSV upload panel shared by both tabs (Add to list / Replace, per-row skip reasons).
- `src/utils/sheetImport.js` — zero-dependency `.xlsx` + `.csv` reader: hand-walked zip + `DecompressionStream('deflate-raw')` + `DOMParser`. Keeps blank rows in place so errors cite real Excel row numbers.
- `src/utils/builderImport.js` — rows → words/questions with validation; header names are case-insensitive and order-free. Keep them in step with the template.
- `scripts/make-template.mjs` — regenerates `public/templates/bible-games-template.xlsx` (Instructions / Scramble / Quiz sheets). Re-run after changing columns and commit the output.

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
- Look: **"Lapis & Ink"**. Cool stone ground, blue-black ink text, **one accent: lapis** (`--color-accent*` are lapis variants, not a second hue; success/danger are the only other colours, for state only). Dark mode is "night ink". House rules from the design-taste-frontend skill: flat fills (`--gradient-*` are single colours on purpose), no coloured glows, no emoji as UI icons (celebration/result emoji like 🏆 ✅ are fine), no em/en dashes in visible text, left-aligned headings, eyebrows only on the home masthead and Welcome. The previous "Hymnal" cream/brass palette was retired because it is the generic AI premium palette
- **Full-screen layout: `src/components/Stage/`.** Every screen renders inside `<Stage art="key">`: a full-height Doré engraving (left) beside the content, collapsing to an art band on top under 900px. `<Stage>` with no `art` is the full-width in-game layout (GameBoard, ModeratorPlay, QuizPlayer, RecallPlay) that fills the viewport height. Stage neutralises each screen's old `.card` box via `.content > div` (so don't fight it with max-width/background on a screen's top-level card), applies one shared h1 scale, and has `artOverlay` for text set over the art (the Welcome verse)
- **Artwork: `src/data/art.js` + `public/art/*.webp`.** Gustave Doré, 1866 English Bible, public domain (Wikimedia Commons "Doré's English Bible"). Stored greyscale (~1150px tall, WebP q52, ~300 KB) and tinted lapis in CSS (`mix-blend-mode: screen` over `--art-tint`), dimmed in dark mode. `focus` sets object-position per plate; `WORD_SET_ART` maps each Word Unscramble set to its plate
- Fonts: **Satoshi** for body text (`--font-main`), **Cabinet Grotesk** for headings and big numbers (`--font-display`). Both **self-hosted** in `public/fonts/` (Fontshare, ITF Free Font License, commercial use OK), declared in `global.css` and preloaded in `index.html`; no Google Fonts request. Weights available: Cabinet 700/800, Satoshi 400/500/700. Never use `font-weight: 900`
- Hover effects that move or tint an element go inside `@media (hover: hover)`, otherwise they stick after a tap on phones
- Mobile breakpoint: `@media (max-width: 700px)`. On mobile, full-page forms use `border-radius: 0`, `width: 100%`, `min-height: 100dvh` (not `100vh`) to fill the screen edge-to-edge

### Utilities
- `src/utils/scramble.js` — `scrambleName(bookName)` preserves numeric prefixes (`1`, `2`, `3`), scrambles each word independently via Fisher-Yates, re-tries up to 10× to avoid returning the original. Output is lowercase; CSS applies `text-transform: uppercase`.
- `src/utils/scoring.js` — flat scoring: `pointsFor(correct)` returns `POINTS_CORRECT` (20) or `POINTS_INCORRECT` (-2). Wrong answer, timeout, and skip all cost the same, hints are free, and the running total may go negative. `DIFFICULTY_CONFIG` now only sets timers and round counts — difficulty and streak affect pacing and stats, never points.
- `src/utils/wordFilter.js` — `selectWords({ wordSet, difficulty, category, count })` filters and shuffles from the chosen word set. Difficulty is cumulative (hard includes 1+2+3); category matches `testament` case-insensitively. `src/utils/bookFilter.js` is now just a `selectBooks` wrapper pinned to `wordSet: 'books'` (used by `ModeratorApp`).
- `src/data/wordSets.js` — the word-set registry (`books`, `prophets` = Prophets & Disciples, `couples`, `grandmix`): data list plus all the copy that changes with it (`noun`, `label`, `subtitle`, `allLabel`, `categories`, `typingHint`, voice prefixes/fuzzy budget, `includesBooks`). Components read it via `useWordSet()` from `GameContext` — never hardcode "book", "prophet" or "Old Testament" in a component. `categories` labels the OT/NT axis per set (CategorySelector, the GameBoard badge and the testament hint all read it). **Composed sets**: `combine()` concatenates lists, de-dupes by name and renumbers ids — Prophets & Disciples is `bibleProphets` + `bibleDisciples` (Philip is on both), and **Grand Mix has no data file**: it's Books + Prophets & Disciples + Couples (Amos/Joel/Jonah are books *and* prophets; couples are keyed by the pair, so the book Ruth and "Boaz & Ruth" both stay). Because the mix holds both entry shapes, `selectWords` and the voice vocabulary check each entry for `spouses` rather than relying on the set's `pairs` flag. The `prophets` id is kept for the renamed set because it's stored on leaderboard rows. Optional registry flags: `pairs: true` and `categoryFilter: false` (both Couples, see below). **Adding a set also means adding its id to `WORD_SETS` in `server/index.js`**, or the leaderboard rejects its scores.
- `src/data/bibleCouples.js` — 36 `{ spouses: [a, b] }` pairs. `selectWords` turns each drawn pair into a normal entry via `orientPair()`: a random spouse becomes `name` (the answer, scrambled as usual) and the other `partner`, plus `partnerFirst` and `pair` ("Moses & Zipporah", which RoundFeedback / GameOver show instead of the bare answer). `ScrambledWord` renders the "MOSES & ______" prompt when `currentBook.partner` is set. People with several spouses appear in several pairs — the tiles disambiguate. `categoryFilter: false` hides CategorySelector and makes `selectWords` ignore a stale category; there are too few NT couples to split.
- `src/data/bibleDisciples.js` — the Twelve + Matthias + Paul, merged into the `prophets` set.
- `src/data/canonicalBooks.js` — the 66-book canon + `matchBookName()` alias matcher, owned by Recall mode (see above). Kept deliberately separate from `bibleBooks.js`.
- `src/data/bibleProphets.js` — 49 prophets, same entry shape as `bibleBooks.js`. Keep every (category × difficulty) pool at 10+ entries or team mode repeats names: `START_TEAM_TURN` falls back to `books[0]` when the pool runs short. (Prophets & Disciples, Couples and Grand Mix meet this; Books' OT/NT easy pools are 9/8.)
- `src/hooks/useVoiceInput.js` — Web Speech API wrapper. Creates a **fresh** `SpeechRecognition` instance on every `start()` call (required by Chrome). Awaits `getUserMedia` first so the engine never starts behind an open permission prompt, and reports `supported: false` with `unsupportedReason: 'insecure-context'` off HTTPS/localhost. Never time-limits the player's speech — the only watchdog fires when the engine reports no start at all (Brave lacks Google's Speech API key), surfacing `'service-unavailable'`. `onResult` receives the engine's ranked alternatives as a `string[]`. **`continuous: true`** (Book Recall) keeps listening until `stop()`: `onResult` fires once per finished phrase, `no-speech` is ignored, and when the engine ends itself (silence / its own time limit) a fresh instance is launched; more than 5 restarts in 4s is treated as a dead engine. Single mode (Word Unscramble) still has the 25s hard stop.
- `extractSpokenBooks(transcripts)` (`voiceMatch.js`) — Book Recall's multi-book parser: scans word windows longest-first (so "first John" beats "John"), exact canonical matches only (no fuzzy guesses inside a running list), and converts only unambiguous number words (`one/first/1st…`, not `to/too/won`, which `resolveSpokenAnswer` accepts for a single answer). Picks whichever alternative yields the most books.
- `src/utils/voiceMatch.js` — `resolveSpokenAnswer(transcripts, wordSetId)` turns those alternatives into a name from that word set (vocabulary cached per set; only sets with `numberedNames` convert number words and only `includesBooks` sets use `matchBookName`; prophets/couples/grand mix use a tighter fuzzy budget, since names like Micah/Micaiah are one or two edits apart): tries the whole phrase first (so a name that starts with a filler word isn't cut short), then strips punctuation and filler ("the book of"), converts spoken numbers ("first Samuel" → `1 Samuel`), matches against `bibleBooks` + `canonicalBooks` aliases, then falls back to a Levenshtein match. Fuzzy hits never cross a number prefix (`1 Samuel` ≠ `2 Samuel`) and are returned with `exact: false` so callers can confirm instead of auto-submitting.

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
- Two compose services: `bible-scramble` (nginx + built SPA) and `api` (`server/`, its own Dockerfile and build context). The container nginx proxies `/api/` to `api:3001` via Docker DNS with a variable upstream, so the site still boots if the API is down. The host nginx on EC2 needs no change, but should pass `X-Forwarded-For`, or every player shares one rate-limit bucket
- Scores live in the named volume `leaderboard-data` — survives `docker compose down`/rebuilds; `down -v` deletes it
- Admin delete: put `ADMIN_TOKEN=...` in a `.env` next to `docker-compose.yml` on EC2, then find the entry's `id` with `curl https://<host>/api/leaderboard?board=group` and run `curl -X DELETE -H "X-Admin-Token: $ADMIN_TOKEN" https://<host>/api/scores/<id>`. Unset token = deletes disabled
- Docker multi-stage build: Node 24 Alpine builds, nginx 1.27 Alpine serves from `/usr/share/nginx/html`; a `HEALTHCHECK` wgets `/` so `docker compose ps` reports health
- `nginx.conf` gotchas: `Permissions-Policy` must keep `microphone=(self)` or voice input is blocked in production; `index.html` is served `no-cache` via `expires -1` (**not** `add_header` — an `add_header` in a location block cancels every inherited header, including the security ones)
- `docker-compose.yml` binds `127.0.0.1:8080:80` — container is localhost-only; host nginx reverse-proxies and terminates HTTPS
- HTTPS via DuckDNS subdomain + Certbot Let's Encrypt on the EC2 host nginx
- AWS Security Group requires ports 80 and 443 open for Certbot and HTTPS traffic
