# Play With Others (remote multiplayer)

A host creates a game, shares a link, room code or QR code, and people anywhere join on
their own phone or computer. Everyone plays the **same server-run game in real time**:
same question, same timer, server-calculated scores.

## Hosting a game

1. Menu → **Play With Others** → **Create a game**.
2. Choose:
   - the game (Bible Books, Prophets & Disciples, Biblical Couples or Grand Mix)
   - difficulty and category
   - rounds (5/10/15/20) and seconds per round
   - when players see whether they were right (after each round, or straight away)
   - **when someone gets it right**: *Wait for the timer* (default) or *First correct answer wins*
     (a race round; see Scoring)
   - speed bonus on/off (hidden for race rounds)
   - your role: **Host on the big screen** (presenter, doesn't play) or **Host and play**
   - how many players are needed to start
   - everyone for themselves or **teams** (2 to 6)
3. **Create game** shows the lobby:
   - a big **room code** (e.g. `JERICHO2096`), the **invitation link**
     (`https://<your-site>/join/JERICHO2096`) and a **QR code**
   - Copy link, Copy code and Share… (the phone's share sheet, where available)
4. Players appear in the lobby as they join. The host can **Remove** someone or **Close room**.
5. **Start game** (enabled once enough players have joined).
6. During play the host panel has:
   - **Pause** / **Resume**, **Close round now**, **Skip question**
   - **Next question** (rounds also advance by themselves 7 s after the reveal; **Hold here** stops that)
   - **End game**, **Restart**
7. Final results show the rankings and celebrate the winner. **Play again with everyone**
   returns all players to the lobby with scores reset.

**Hosting your own content:** in the **Quiz & Scramble Builder**, each tab has **Host online**.
It opens Create Game with those questions or words. They are sent to the game server's memory
for that one game only (the builder's session-only rule still holds: nothing is saved).

## Joining a game

- Open the invitation link or scan the QR code, **or** Menu → Play With Others → **Join a game**
  and type the code. Codes aren't case-sensitive.
- The join screen shows the game, host, number of players, difficulty and status. Enter your
  name (pre-filled from your profile), pick a team if the game has teams, and press **Join Game**.
- You can join a game that is already running; you play from the current round.
- Refreshing the page or losing signal is fine: you come back as the same player with your score.

## How it works

```
Browser ──HTTPS──> host nginx ──> container nginx ──> game server (Node, one process)
   │  POST /api/mp/rooms              create  (rate-limited)       ├─ leaderboard API (unchanged)
   │  GET  /api/mp/rooms/:code        lobby info                    └─ multiplayer
   │  POST /api/mp/rooms/:code/join   join → player token                ├─ rooms.js   live rooms (memory)
   │  GET  /api/mp/qr/:code           invite QR (SVG)                    ├─ socket.js  WebSocket /api/mp/ws (ws)
   └──WSS── /api/mp/ws ─────────────────────────────────────────────────┘ ├─ modes/     game rules per mode
                                                                          └─ SQLite     session records only
```

- **Server-authoritative.**
  - The server picks the words (the same `selectWords`/`scrambleName` code and word lists as
    the single-device game, imported from `src/`), owns the round timer, judges answers and
    calculates every score.
  - Browsers only send actions (`answer`, and host commands).
  - The server answers every change with a fresh **per-viewer snapshot**, which never contains
    an answer before its reveal.
- **Scoring** (same rule as the single-device game, `src/utils/scoring.js`): +20 correct,
  −2 wrong or no answer. Optional speed bonus of up to +10, measured from the *server's*
  receipt time. Team score = the sum of its members. Multiplayer scores never go to the
  monthly leaderboard.
- **Race rounds** (`settings.firstCorrect`): the first correct answer to *reach the server*
  wins the round and ends it at once; the next question follows 4 s after the reveal
  (`RACE_ADVANCE_MS`, against 7 s normally).
  - Wrong guesses may be retried, 1 s apart at most (`RETRY_COOLDOWN_MS`). Each wrong guess
    costs −2, counted once as it is judged (a host rejection when the player moves on).
  - Winner: +20 (minus their own wrong guesses). Anyone who never answered: 0 when someone
    won (the round was cut short), −2 when the timer ran out on everyone. A second correct
    answer (e.g. a pending quiz answer the host accepts later) scores 0 as `late`; the
    earliest correct answer wins, by server time.
  - The server forces `speedBonus: false` and `reveal: 'instant'` (players must see a wrong
    verdict to try again). `snapshot.round.mine` adds `wrongs` and `canRetry`; `reveal`
    adds `winner`; results add `wrongs` and `first`. Room info carries `firstCorrect` so the
    join screen can say so.
- **Quiz rounds** (Builder questions): answers are free text.
  - Exact or near matches (small typos) are marked correct automatically.
  - Anything else goes to a **review** step, where the host clicks Accept or Wrong before the
    reveal.
  - The host can only decide those unclear answers, never change other scores.
- **Game modes are pluggable** (`server/multiplayer/modes/`): each mode supplies `prepare`,
  `publicRound`, `judge`, `reveal`. Adding Bible Trivia or the Christmas games means adding
  a mode file, not new multiplayer infrastructure.

### Protocol (WebSocket JSON)

| Direction | Messages |
|---|---|
| client → server | `resume {code, token}` (first message), `answer {text}`, `set_team {teamId}` |
| host only | `start`, `pause`, `resume_game`, `skip`, `reveal`, `next`, `end`, `restart`, `close`, `kick {playerId}`, `accept {playerId, accept}`, `update_settings {settings}` |
| server → client | `snapshot` (full state for that viewer), `notice` (joined / left / paused / host changed), `error`, `closed` (room over or player removed) |

Every client action carries an `actionId`; a repeated id is acknowledged but never applied twice.

### Connection reliability

- Server pings every 25 s; a socket missing two pings is dropped.
- The browser reconnects automatically (1, 2, 4, 8, then every 10 s), and again as soon as
  a phone brings the tab back to the foreground. A "Reconnecting…" overlay shows meanwhile.
- Reconnecting re-sends the player's token, so the server restores the **same player**
  (never a duplicate) with score and answers intact. Countdowns follow the server clock.
- **Host disconnects:** the game pauses. If the host is back within **2 minutes**, they carry
  on. Otherwise host control passes to the connected player who joined first (everyone is
  told); if nobody is connected the room is left to the abandonment rule below.

## Security

- **Room codes** are a Bible word + 4 random digits (~900k combinations), generated with
  `crypto.randomInt`. Failed code lookups are limited to 20 per 10 minutes per IP.
- **Player tokens** are 192-bit random values. Only their SHA-256 is stored. Every socket must
  present one; the token alone decides host vs player, so a player can't act as host.
  Browsers keep the token in sessionStorage, with a copy per room in localStorage for
  refreshes. Storage only remembers it; the server verifies it.
- **Rate limits** per IP:
  - creating rooms: 5 per 10 min
  - joining: 30 per 10 min
  - WebSocket: 20 messages/s per socket, and a socket sustaining 3× that is closed
- **Validation:**
  - every HTTP body and WebSocket message is type- and length-checked against a whitelist
  - names are preset nicknames only (`src/data/presetNames.js`): solo names, or group
    names when the host plays as a group (`hostKind: 'group'`) or the joiner's profile is a
    group (`asGroup: true`). Team names must be group presets too
  - a name already in the room is made unique by the server instead of refused: "Joyful
    Lion 2" for solo names, "Team Joy Blue" for groups; the join response returns the
    assigned `name`. A kicked name blocks its base ("Joyful Lion"), so "… 2" can't rejoin
  - rooms are capped at `MP_MAX_PLAYERS` (default 50)
- **Origin check:** browsers may only open the game socket from this site.
- **No answer leaks:** answers and scripture references are only in snapshots after the
  reveal. A host who is also playing doesn't see other players' answers until the round
  closes.
- **Minimal data:**
  - SQLite keeps the host name, settings (without Builder content), status, timestamps,
    final standings, player names, token hashes and final scores
  - no IP addresses, no gameplay logs, no custom questions

## Session lifecycle

| Situation | What happens |
|---|---|
| Game finishes | Results stay viewable for 30 min; the record stays `finished` in SQLite |
| Host closes the room | Everyone sees "The host closed this game"; status `closed` |
| Nobody connected for 15 min | Room closed as `abandoned` |
| Lobby never started within 3 h | Room closed as `expired` |
| Player removed by host | Their screen shows "removed"; that nickname (with or without a number/colour) can't rejoin the room |
| **Server restart** | Live rooms are **lost** (they live in memory). On start-up, rooms still marked running are set to `interrupted`, and anyone opening the old link sees "That game ended when the server restarted." There is **no recovery across restarts**. |

## Deployment

- **Same command as before:** `docker compose down && docker compose up -d --build`. The game
  server image is now built from the repo root (`server/Dockerfile` +
  `server/Dockerfile.dockerignore`) and installs `ws` and `qrcode` inside the image.
- **Container nginx** (`nginx.conf`, `nginx.lan.conf`) has a WebSocket location for
  `/api/mp/ws` and a 300 KB body limit for `/api/mp/rooms` (Builder uploads). The existing
  `/api/` route is unchanged.
- **Host nginx: one manual step.** Add the `location = /api/mp/ws { … }` block from
  [`oracle-vm-hardening.md` §6a](oracle-vm-hardening.md#6a-reverse-proxy) and reload nginx.
  Without it, `wss://` fails in production. Check: `curl -i https://<domain>/api/mp/ws` → `426`.
- Optional env: `MP_MAX_PLAYERS` (room size, default 50).
- **Local development:** `npm install --prefix server` once, then `npm run api` and
  `npm run dev`. Vite proxies `/api` including WebSockets.

## Test results (2026-11-01)

**Protocol suite:** 30 checks with real HTTP + WebSocket clients against a throwaway
server, all passing. The same suite also passes against the Docker image layout,
recreated locally.
- create
- lookup (case-insensitive)
- two players join with distinct tokens
- duplicate name rejected; invalid code rejected
- QR served
- host vs player authorisation; a player can't start or kick; an unknown token can't enter
- everyone gets the same scramble; no snapshot contains the answer before the reveal
- duplicate answer rejected
- server scoring ignores forged `score`/`verdict` fields
- reveal and ranked standings
- reconnect restores the same player and score
- answers rejected while paused
- end; finished room can't be joined
- host leaves → auto-pause → host transfer after the grace period → new host resumes
- quiz: auto-correct, pending, a player can't accept, host accepts, reference revealed
- close notifies everyone; closed room can't be rejoined
- after a server restart: finished rooms report `finished`, running rooms report
  `interrupted`

**Three independent browsers** (separate headless Chrome profiles: a host at 1440×900, two
players at 390×844, through the Vite dev server), all passing:
- the host creates a room; the address bar becomes `/join/CODE`; the QR image loads
- players join through the invitation link
- both appear in the host lobby
- all three see the same scramble each round
- a player refreshes mid-game and rejoins as the same player with their score
- standings update (40 after two correct)
- End game → "Ama wins!" on host and player screens

**Not verified here:**
- `docker compose up --build` (Docker Desktop wasn't running)
- production WSS through the host nginx, which needs the manual step above
- real phones on different networks

## Done and not done

**Done:**
- rooms, invite link, code, QR and native share
- lobby with live join/leave notices; kick; close; min-player start rule
- real-time Word Unscramble (all four word sets, including Couples prompts) and Builder
  custom words
- Builder quizzes with host review
- teams
- instant or after-round results
- speed bonus
- race rounds: wrong guess shown at once and retried, cooldown, first correct ends the round,
  winner +20 / wrong −2 / silent 0, timer run-out falls back to normal rules
- host controls (pause, resume, skip, close round, next, end, restart)
- live standings with score changes, ties and team totals
- winner celebration
- reconnection and host transfer
- voice answers on players' devices
- session records in SQLite; documented lifecycle

**Not yet** (the architecture is ready; these need their own game content and design):
- **Bible Trivia** (multiple choice): the app has no multiple-choice question bank yet.
- **Christmas Bible games** (Christmas Trivia, Scripture or Tradition, Who Am I?, Finish the
  Verse, Story Sequence): these games don't exist yet.
- **Book Recall** and **Moderator View** are not multiplayer. Recall is a solo memory race;
  Moderator View's host-led reveal is covered by the multiplayer host dashboard.
- **Editing settings in the lobby** is supported by the server (`update_settings`) but has no
  UI yet; the host sets everything on Create Game.
- **Restart recovery:** live games don't survive a server restart (see the lifecycle above).
- **Remote reactions:** the 🎉 reactions still only show on the device that sends them.
