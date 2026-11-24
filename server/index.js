// The app's server: the monthly leaderboard API and remote multiplayer.
//
// The leaderboard uses Node built-ins only (node:http + node:sqlite).
// Multiplayer (./multiplayer/) adds two packages, installed inside the Docker
// image: `ws` for the WebSocket endpoint and `qrcode` for invite QR codes.
//
//   Multiplayer: /api/mp/… (HTTP) and /api/mp/ws (WebSocket) — see multiplayer/http.js
//
//   GET    /api/health
//   GET    /api/leaderboard?board=individual|group[&month=YYYY-MM]
//   POST   /api/scores          { id, board, name, score, correct, total, difficulty, wordSet }
//   DELETE /api/scores/:id      header X-Admin-Token: $ADMIN_TOKEN
//   POST   /api/hit             { event, detail }  anonymous daily counters (see Analytics)
//   GET    /api/stats?days=30   header X-Admin-Token: $ADMIN_TOKEN
//
// The monthly reset is a WHERE clause, not a job: every score is stamped with
// its month and the board only reads the current one. Old months stay in the
// table so a "last month's champion" view stays possible.

import http from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { isBlocked } from './blocklist.js'
import { toInitials } from '../src/utils/initials.js'
import { parsePresetName, PRESET_NAME_MAX } from '../src/data/presetNames.js'
import { initRooms } from './multiplayer/rooms.js'
import { handleMultiplayerHttp } from './multiplayer/http.js'
import { attachMultiplayerSockets } from './multiplayer/socket.js'
import { validateSettings } from './multiplayer/settings.js'

const PORT = Number(process.env.PORT) || 3001
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(HERE, 'data', 'leaderboard.db')
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
// Decides when "midnight on the 1st" happens. Read through Intl rather than
// the process clock, so it works on Alpine without tzdata installed.
const BOARD_TZ = process.env.BOARD_TZ || process.env.TZ || 'UTC'

// Mirrors src/utils/scoring.js — the server recomputes every score from
// correct/total, so a hand-edited POST can't claim points it didn't earn.
const POINTS_CORRECT = 20
const POINTS_INCORRECT = -2
const MAX_ROUNDS = 10

const BOARDS = ['individual', 'group']
const DIFFICULTIES = { easy: 1, medium: 2, hard: 3 } // value = tie-break rank
const WORD_SETS = ['books', 'prophets', 'couples', 'grandmix'] // keep in step with src/data/wordSets.js
const TOP_N = 5

const MAX_BODY = 2048
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_POSTS = 30

// ── Database ───────────────────────────────────────────────

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
const db = new DatabaseSync(DB_PATH)
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS scores (
    id          TEXT PRIMARY KEY,
    board       TEXT NOT NULL,
    name        TEXT NOT NULL,
    name_key    TEXT NOT NULL,
    score       INTEGER NOT NULL,
    correct     INTEGER NOT NULL,
    total       INTEGER NOT NULL,
    difficulty  TEXT NOT NULL,
    diff_rank   INTEGER NOT NULL,
    word_set    TEXT NOT NULL,
    month       TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS scores_board_month ON scores (board, month);
`)

// One row per name — each player's best — so one keen player can't hold all
// five places. Ties go to the harder difficulty, then to whoever got there first.
const topQuery = db.prepare(`
  SELECT id, name, score, correct, total, difficulty, word_set AS wordSet, created_at AS createdAt
  FROM (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY name_key
      ORDER BY score DESC, diff_rank DESC, created_at ASC
    ) AS rn
    FROM scores
    WHERE board = ? AND month = ?
  )
  WHERE rn = 1
  ORDER BY score DESC, diff_rank DESC, created_at ASC
  LIMIT ${TOP_N}
`)
const insertScore = db.prepare(`
  INSERT OR IGNORE INTO scores
    (id, board, name, name_key, score, correct, total, difficulty, diff_rank, word_set, month, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const deleteScore = db.prepare('DELETE FROM scores WHERE id = ?')

// ── Multiplayer session records ────────────────────────────
// Live rooms are in memory (multiplayer/rooms.js); SQLite only keeps what
// outlives them: who hosted, the settings (never custom Builder content),
// the status and the final standings. Player tokens are stored as SHA-256.
db.exec(`
  CREATE TABLE IF NOT EXISTS mp_sessions (
    code        TEXT PRIMARY KEY,
    host_name   TEXT NOT NULL,
    mode        TEXT NOT NULL,
    settings    TEXT NOT NULL,
    status      TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    standings   TEXT
  );
  CREATE TABLE IF NOT EXISTS mp_players (
    session_code TEXT NOT NULL,
    player_id    TEXT NOT NULL,
    name         TEXT NOT NULL,
    token_hash   TEXT NOT NULL,
    team_id      TEXT,
    joined_at    INTEGER NOT NULL,
    final_score  INTEGER,
    PRIMARY KEY (session_code, player_id)
  );
`)
const mpStatement = db.prepare('SELECT status FROM mp_sessions WHERE code = ?')
initRooms({
  insertSession: db.prepare('INSERT INTO mp_sessions (code, host_name, mode, settings, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  findSession: mpStatement,
  setStatus: db.prepare('UPDATE mp_sessions SET status = ?, ended_at = ? WHERE code = ?'),
  setSettings: db.prepare('UPDATE mp_sessions SET settings = ? WHERE code = ?'),
  finishSession: db.prepare('UPDATE mp_sessions SET status = ?, ended_at = ?, standings = ? WHERE code = ?'),
  interruptAll: db.prepare("UPDATE mp_sessions SET status = 'interrupted', ended_at = ? WHERE status IN ('lobby', 'playing')"),
  insertPlayer: db.prepare('INSERT INTO mp_players (session_code, player_id, name, token_hash, team_id, joined_at) VALUES (?, ?, ?, ?, ?, ?)'),
  setPlayerScore: db.prepare('UPDATE mp_players SET final_score = ? WHERE session_code = ? AND player_id = ?'),
})
const mpStatusOf = (code) => mpStatement.get(code)?.status ?? null

// ── Helpers ────────────────────────────────────────────────

const monthFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOARD_TZ,
  year: 'numeric',
  month: '2-digit',
})

function currentMonth() {
  return monthFormat.format(new Date()).slice(0, 7) // "2026-10"
}

function cleanName(raw) {
  if (typeof raw !== 'string') return null
  // Strip control characters and collapse runs of whitespace
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
  return name.length >= 2 && name.length <= PRESET_NAME_MAX ? name : null
}

function nameKey(name) {
  return name.toLowerCase()
}

function isInt(n, min, max) {
  return Number.isInteger(n) && n >= min && n <= max
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(JSON.stringify(body))
}

function readJson(req, maxBytes = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

// Best-effort only: X-Forwarded-For can be forged, and if the proxy in front
// doesn't set it every player shares one bucket. Good enough to stop a script
// hammering the board; not a security boundary.
const postsByIp = new Map()

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function rateLimited(ip) {
  const now = Date.now()
  const recent = (postsByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX_POSTS) {
    postsByIp.set(ip, recent)
    return true
  }
  recent.push(now)
  postsByIp.set(ip, recent)
  return false
}

// Drop idle buckets so the map can't grow without bound
setInterval(() => {
  const now = Date.now()
  for (const [ip, times] of postsByIp) {
    if (!times.some((t) => now - t < RATE_WINDOW_MS)) postsByIp.delete(ip)
  }
}, RATE_WINDOW_MS).unref()

// ── Routes ─────────────────────────────────────────────────

function getLeaderboard(url, res) {
  const board = url.searchParams.get('board')
  if (!BOARDS.includes(board)) return send(res, 400, { error: 'Unknown board' })
  const monthParam = url.searchParams.get('month')
  if (monthParam && !/^\d{4}-\d{2}$/.test(monthParam)) return send(res, 400, { error: 'Bad month' })
  const month = monthParam || currentMonth()
  let entries = topQuery.all(board, month)
  // Privacy: names are preset nicknames now. Rows saved before that may hold
  // typed names, so on the individual board those still go out as initials
  if (board === 'individual') {
    entries = entries.map((e) => (parsePresetName(e.name, 'individual') ? e : { ...e, name: toInitials(e.name) }))
  }
  send(res, 200, { board, month, entries })
}

async function postScore(req, res) {
  if (rateLimited(clientIp(req))) return send(res, 429, { error: 'Too many scores. Please try again later.' })

  const body = await readJson(req)
  const { id, board, score, correct, total, difficulty, wordSet } = body ?? {}
  // Preset nicknames only (src/data/presetNames.js): solo names on the
  // individual board, group / team names on the group board
  const name = parsePresetName(cleanName(body?.name) ?? '', board === 'group' ? 'group' : 'individual')?.name ?? null

  if (typeof id !== 'string' || !/^[a-z0-9]{8,40}$/.test(id)) return send(res, 400, { error: 'Bad id' })
  if (!BOARDS.includes(board)) return send(res, 400, { error: 'Unknown board' })
  if (!name) return send(res, 400, { error: 'Pick a nickname from the list first' })
  if (!(difficulty in DIFFICULTIES)) return send(res, 400, { error: 'Unknown difficulty' })
  if (!WORD_SETS.includes(wordSet)) return send(res, 400, { error: 'Unknown word set' })
  if (!isInt(total, 1, MAX_ROUNDS) || !isInt(correct, 0, total)) {
    return send(res, 400, { error: 'Bad round counts' })
  }
  if (score !== correct * POINTS_CORRECT + (total - correct) * POINTS_INCORRECT) {
    return send(res, 400, { error: 'Score does not match rounds' })
  }

  const month = currentMonth()
  // Zero or negative totals are legal games but never belong on a top-5
  if (score <= 0) return send(res, 200, { month, rank: null })

  insertScore.run(
    id, board, name, nameKey(name), score, correct, total,
    difficulty, DIFFICULTIES[difficulty], wordSet, month, Date.now(),
  )

  // A rank only when the row on the board IS this game — a lower score from a
  // player who already placed shouldn't be announced as a new placing
  const top = topQuery.all(board, month)
  const index = top.findIndex((e) => e.id === id)
  send(res, 200, { month, rank: index === -1 ? null : index + 1 })
}

function removeScore(req, res, id) {
  if (!ADMIN_TOKEN) return send(res, 403, { error: 'Admin delete is disabled' })
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) return send(res, 403, { error: 'Forbidden' })
  const { changes } = deleteScore.run(id)
  send(res, changes ? 200 : 404, changes ? { deleted: id } : { error: 'Not found' })
}

// ── Analytics ──────────────────────────────────────────────
// Privacy-friendly by construction: no cookies, nothing stored per person.
// Each hit bumps a daily counter (day, event, detail). Unique visitors are
// counted with a hash of (daily random salt + IP + browser) held only in
// memory: the salt is never written down and is replaced every day, so the
// hashes can't be linked across days or turned back into an IP. Only the
// count reaches SQLite. Browsers sending Do Not Track / Global Privacy
// Control are not counted (the client skips them too).

db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_daily (
    day    TEXT NOT NULL,
    event  TEXT NOT NULL,
    detail TEXT NOT NULL,
    count  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, event, detail)
  );
  CREATE TABLE IF NOT EXISTS analytics_visitors (
    day      TEXT PRIMARY KEY,
    visitors INTEGER NOT NULL DEFAULT 0
  );
`)

const APP_MODES = ['scramble', 'multiplayer', 'recall', 'moderator', 'quiz']
const FINISHED_GAMES = [
  ...WORD_SETS.flatMap((w) => [`solo:${w}`, `teams:${w}`]),
  'recall', 'quiz', 'multiplayer',
]
// event → allowed details ('' = none). Anything else is ignored.
const ANALYTICS_EVENTS = {
  visit: new Set(['']),
  mode_open: new Set(APP_MODES),
  game_finish: new Set(FINISHED_GAMES),
  share: new Set(FINISHED_GAMES),
  tv_mode: new Set(['']),
}

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: BOARD_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const today = () => dayFormat.format(new Date()) // "2026-11-23"

const bumpEvent = db.prepare(`
  INSERT INTO analytics_daily (day, event, detail, count) VALUES (?, ?, ?, 1)
  ON CONFLICT (day, event, detail) DO UPDATE SET count = count + 1
`)
const bumpVisitors = db.prepare(`
  INSERT INTO analytics_visitors (day, visitors) VALUES (?, 1)
  ON CONFLICT (day) DO UPDATE SET visitors = visitors + 1
`)
const statsEvents = db.prepare('SELECT day, event, detail, count FROM analytics_daily WHERE day >= ? ORDER BY day')
const statsVisitors = db.prepare('SELECT day, visitors FROM analytics_visitors WHERE day >= ? ORDER BY day')

const MAX_DAILY_VISITORS = 200_000 // memory bound for the in-memory set
let visitorDay = ''
let visitorSalt = null
let visitorsSeen = new Set()

function countVisitor(req) {
  const day = today()
  if (day !== visitorDay) {
    visitorDay = day
    visitorSalt = randomBytes(32)
    visitorsSeen = new Set()
  }
  if (visitorsSeen.size >= MAX_DAILY_VISITORS) return
  const hash = createHash('sha256')
    .update(visitorSalt).update(clientIp(req)).update(String(req.headers['user-agent'] || ''))
    .digest('base64')
  if (visitorsSeen.has(hash)) return
  visitorsSeen.add(hash)
  bumpVisitors.run(day)
}

const hitsByIp = new Map()
const HIT_MAX = 120 // per IP per RATE_WINDOW_MS

function hitLimited(ip) {
  const now = Date.now()
  const recent = (hitsByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  const over = recent.length >= HIT_MAX
  if (!over) recent.push(now)
  hitsByIp.set(ip, recent)
  return over
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, times] of hitsByIp) {
    if (!times.some((t) => now - t < RATE_WINDOW_MS)) hitsByIp.delete(ip)
  }
}, RATE_WINDOW_MS).unref()

async function postHit(req, res) {
  const body = await readJson(req, 512)
  const optedOut = req.headers['sec-gpc'] === '1' || req.headers.dnt === '1'
  const event = typeof body?.event === 'string' ? body.event : ''
  const detail = typeof body?.detail === 'string' ? body.detail : ''
  const allowed = ANALYTICS_EVENTS[event]?.has(detail)
  if (!optedOut && allowed && !hitLimited(clientIp(req))) {
    const day = today()
    bumpEvent.run(day, event, detail)
    if (event === 'visit') countVisitor(req)
  }
  // Same answer either way: nothing to learn from the response
  res.writeHead(204, { 'Cache-Control': 'no-store' })
  res.end()
}

function getStats(req, url, res) {
  if (!ADMIN_TOKEN) return send(res, 403, { error: 'Stats are disabled (no ADMIN_TOKEN set)' })
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) return send(res, 403, { error: 'Wrong admin token' })
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 366)
  const since = dayFormat.format(new Date(Date.now() - (days - 1) * 86_400_000))
  send(res, 200, { since, today: today(), visitors: statsVisitors.all(since), events: statsEvents.all(since) })
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    const { pathname } = url

    if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { ok: true })
    if (req.method === 'GET' && pathname === '/api/leaderboard') return getLeaderboard(url, res)
    if (req.method === 'POST' && pathname === '/api/scores') return await postScore(req, res)
    const del = pathname.match(/^\/api\/scores\/([a-z0-9]{8,40})$/)
    if (req.method === 'DELETE' && del) return removeScore(req, res, del[1])
    if (req.method === 'POST' && pathname === '/api/hit') return await postHit(req, res)
    if (req.method === 'GET' && pathname === '/api/stats') return getStats(req, url, res)

    if (await handleMultiplayerHttp(req, res, url, { send, readJson, clientIp, cleanName, isBlocked, statusOf: mpStatusOf })) return

    send(res, 404, { error: 'Not found' })
  } catch (err) {
    if (!err.status) console.error(err)
    if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Server error' })
  }
})

attachMultiplayerSockets(server, {
  validateSettings: (settings) => validateSettings(settings, { cleanName, isBlocked }),
  statusOf: mpStatusOf,
})

server.listen(PORT, () => {
  console.log(`Leaderboard API on :${PORT} · db ${DB_PATH} · board month ${currentMonth()} (${BOARD_TZ})`)
})

function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
