// Leaderboard API — the only server-side piece of the app.
//
// Zero npm dependencies on purpose: node:http + node:sqlite ship with Node 24,
// so there is nothing to install, audit, or accidentally commit.
//
//   GET    /api/health
//   GET    /api/leaderboard?board=individual|group[&month=YYYY-MM]
//   POST   /api/scores          { id, board, name, score, correct, total, difficulty, wordSet }
//   DELETE /api/scores/:id      header X-Admin-Token: $ADMIN_TOKEN
//
// The monthly reset is a WHERE clause, not a job: every score is stamped with
// its month and the board only reads the current one. Old months stay in the
// table so a "last month's champion" view stays possible.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { isBlocked } from './blocklist.js'

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
  return name.length >= 2 && name.length <= 24 ? name : null
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

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
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
  send(res, 200, { board, month, entries: topQuery.all(board, month) })
}

async function postScore(req, res) {
  if (rateLimited(clientIp(req))) return send(res, 429, { error: 'Too many scores. Please try again later.' })

  const body = await readJson(req)
  const { id, board, score, correct, total, difficulty, wordSet } = body ?? {}
  const name = cleanName(body?.name)

  if (typeof id !== 'string' || !/^[a-z0-9]{8,40}$/.test(id)) return send(res, 400, { error: 'Bad id' })
  if (!BOARDS.includes(board)) return send(res, 400, { error: 'Unknown board' })
  if (!name) return send(res, 400, { error: 'Name must be 2 to 24 characters' })
  if (isBlocked(name)) return send(res, 400, { error: 'Please choose a different name' })
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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    const { pathname } = url

    if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { ok: true })
    if (req.method === 'GET' && pathname === '/api/leaderboard') return getLeaderboard(url, res)
    if (req.method === 'POST' && pathname === '/api/scores') return await postScore(req, res)
    const del = pathname.match(/^\/api\/scores\/([a-z0-9]{8,40})$/)
    if (req.method === 'DELETE' && del) return removeScore(req, res, del[1])

    send(res, 404, { error: 'Not found' })
  } catch (err) {
    if (!err.status) console.error(err)
    if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Server error' })
  }
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
