// Live multiplayer rooms. The server is the single source of truth: it owns
// the rounds (with their answers), the timers, the judging and the scores.
// Browsers only send actions; every change is answered with a fresh,
// per-viewer snapshot that never contains an answer before its reveal.
//
// Room lifecycle: lobby → playing → finished   (or closed / abandoned / expired)
// Round phases:   open → (review, quiz only) → revealed
import { presetBase } from '../../src/data/presetNames.js'
import { createHash, randomBytes } from 'node:crypto'
import { getMode } from './modes/index.js'
import { pointsFor, racePoints } from './modes/scoring.js'
import { newRoomCode } from './codes.js'
import { MP_MAX_PLAYERS } from './settings.js'

const HOST_GRACE_MS = Number(process.env.MP_HOST_GRACE_MS) || 2 * 60 * 1000
const ABANDON_MS = Number(process.env.MP_ABANDON_MS) || 15 * 60 * 1000
const LOBBY_TTL_MS = 3 * 60 * 60 * 1000
const KEEP_FINISHED_MS = 30 * 60 * 1000
const AUTO_ADVANCE_MS = 7000
const RACE_ADVANCE_MS = 4000 // race rounds move on quickly once someone has it
const RETRY_COOLDOWN_MS = 1000 // between one player's guesses in a race round
const TEAM_COLORS = ['#23409A', '#B0302B', '#2A7449', '#8A5A12', '#6B3E8A', '#1D7A86']

export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex')
export const newToken = () => randomBytes(24).toString('base64url')
const newId = () => randomBytes(6).toString('base64url')

const rooms = new Map()
let db = null // prepared statements, set by initRooms()

export function initRooms(statements) {
  db = statements
  // Live rooms only exist in memory: anything SQLite still thinks is running
  // died with the previous process. (No cross-restart recovery is claimed.)
  db.interruptAll.run(Date.now())
  setInterval(sweep, 30 * 1000).unref()
}

export const getRoom = (code) => rooms.get(code) ?? null

export function createRoom({ hostName, settings, payload }) {
  const code = newRoomCode((c) => rooms.has(c) || Boolean(db.findSession.get(c)))
  const token = newToken()
  const room = new Room({ code, hostName, settings, payload, hostTokenHash: hashToken(token) })
  rooms.set(code, room)
  db.insertSession.run(code, hostName, settings.mode, JSON.stringify(settings), 'lobby', Date.now())
  if (settings.hostPlays) room.addPlayer({ name: hostName, tokenHash: room.hostTokenHash, isHost: true })
  return { room, token }
}

class Room {
  constructor({ code, hostName, settings, payload, hostTokenHash }) {
    this.code = code
    this.hostName = hostName
    this.settings = settings
    this.payload = payload // builder content: memory only
    this.mode = getMode(settings.mode)
    this.hostTokenHash = hostTokenHash
    this.hostPlayerId = null
    this.status = 'lobby'
    this.createdAt = Date.now()
    this.endedAt = null
    this.lastConnectionAt = Date.now()
    this.players = new Map() // id → player
    this.kickedNames = new Set()
    this.conns = new Set()
    this.rounds = []
    this.index = -1
    this.round = null
    this.timer = null
    this.hostGraceTimer = null
    this.version = 0
  }

  // ── Identity ────────────────────────────────────────────────
  isHost(conn) {
    if (conn.playerId && conn.playerId === this.hostPlayerId) return true
    return Boolean(this.hostTokenHash) && conn.tokenHash === this.hostTokenHash
  }

  /** token → { role, playerId } or null. A kicked player's token stops working. */
  authenticate(tokenHash) {
    if (this.hostTokenHash && tokenHash === this.hostTokenHash) {
      return { role: 'host', playerId: this.settings.hostPlays ? this.hostPlayerId : null }
    }
    for (const p of this.players.values()) {
      if (p.tokenHash === tokenHash) return { role: p.id === this.hostPlayerId ? 'host' : 'player', playerId: p.id }
    }
    return null
  }

  get participants() {
    return [...this.players.values()]
  }

  connectedCount(playerId) {
    let n = 0
    for (const c of this.conns) if (c.playerId === playerId) n++
    return n
  }

  get hostConnected() {
    for (const c of this.conns) if (this.isHost(c)) return true
    return false
  }

  // ── Joining ─────────────────────────────────────────────────
  canJoin() {
    if (this.status === 'lobby' || this.status === 'playing') return null
    return this.status
  }

  /** The existing player with this name (case-insensitive), if any */
  nameTaken(name) {
    const key = name.toLowerCase()
    return this.participants.find((p) => p.name.toLowerCase() === key)?.name ?? null
  }

  addPlayer({ name, tokenHash, teamId = null, isHost = false }) {
    const id = newId()
    const player = {
      id, name, tokenHash, teamId: this.validTeam(teamId) ? teamId : null,
      joinedAt: Date.now(), score: 0, correct: 0, streak: 0, bestStreak: 0, lastDelta: 0,
    }
    this.players.set(id, player)
    if (isHost) this.hostPlayerId = id
    db.insertPlayer.run(this.code, id, name, tokenHash, player.teamId, player.joinedAt)
    return player
  }

  validTeam(teamId) {
    return Boolean(this.settings.teams?.some((t) => t.id === teamId))
  }

  get full() {
    return this.players.size >= MP_MAX_PLAYERS
  }

  // ── Connections ─────────────────────────────────────────────
  attach(conn) {
    this.conns.add(conn)
    this.lastConnectionAt = Date.now()
    if (this.isHost(conn)) clearTimeout(this.hostGraceTimer)
    const p = conn.playerId && this.players.get(conn.playerId)
    if (p && this.connectedCount(p.id) === 1 && conn.reconnecting) this.notice(`${p.name} reconnected`)
    this.broadcast()
  }

  detach(conn) {
    if (!this.conns.delete(conn)) return
    this.lastConnectionAt = Date.now()
    const p = conn.playerId && this.players.get(conn.playerId)
    if (p && this.connectedCount(p.id) === 0 && this.status !== 'closed') this.notice(`${p.name} lost connection`, 'warn')
    if (this.isHost(conn) && !this.hostConnected && (this.status === 'playing' || this.status === 'lobby')) {
      this.onHostAway()
    }
    // A player dropping might be the last one the round was waiting for
    if (this.round?.phase === 'open') this.maybeCloseEarly()
    this.broadcast()
  }

  onHostAway() {
    if (this.status === 'playing' && !this.round?.paused) this.pause(true)
    clearTimeout(this.hostGraceTimer)
    this.hostGraceTimer = setTimeout(() => this.transferHost(), HOST_GRACE_MS)
  }

  /** Host gone past the grace period: hand control to the longest-standing connected player */
  transferHost() {
    if (this.hostConnected || !['lobby', 'playing'].includes(this.status)) return
    const next = this.participants
      .filter((p) => this.connectedCount(p.id) > 0)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0]
    if (!next) return // nobody here: the abandon sweep will close it
    this.hostPlayerId = next.id
    this.hostTokenHash = null // the old host's presenter token loses control
    this.hostName = next.name
    this.notice(`${next.name} is now the host`)
    this.broadcast()
  }

  // ── Host actions ────────────────────────────────────────────
  start() {
    if (this.status !== 'lobby') return 'Game already started'
    if (this.players.size < this.settings.minPlayers) {
      return `Need at least ${this.settings.minPlayers} player${this.settings.minPlayers === 1 ? '' : 's'} to start`
    }
    this.rounds = this.mode.prepare(this.settings, this.payload)
    if (!this.rounds.length) return 'No rounds available for these settings'
    // Anyone without a team gets the smallest one
    if (this.settings.teams) {
      for (const p of this.participants) {
        if (!p.teamId) p.teamId = this.smallestTeam()
      }
    }
    for (const p of this.participants) Object.assign(p, { score: 0, correct: 0, streak: 0, bestStreak: 0, lastDelta: 0 })
    this.status = 'playing'
    this.index = -1
    db.setStatus.run('playing', null, this.code)
    this.notice('The game has started')
    this.openNextRound()
    return null
  }

  smallestTeam() {
    const counts = new Map(this.settings.teams.map((t) => [t.id, 0]))
    for (const p of this.participants) if (counts.has(p.teamId)) counts.set(p.teamId, counts.get(p.teamId) + 1)
    return [...counts.entries()].sort((a, b) => a[1] - b[1])[0][0]
  }

  openNextRound() {
    clearTimeout(this.timer)
    this.index++
    if (this.index >= this.rounds.length) return this.finish()
    const roundMs = this.settings.seconds * 1000
    this.round = {
      data: this.rounds[this.index],
      phase: 'open',
      startedAt: Date.now(),
      deadline: Date.now() + roundMs,
      roundMs,
      paused: false,
      pausedRemaining: 0,
      answers: new Map(), // playerId → { text, at, verdict }
      results: null,
      skipped: false,
    }
    this.timer = setTimeout(() => this.closeRound(), roundMs)
    this.broadcast()
  }

  pause(auto = false) {
    const r = this.round
    if (this.status !== 'playing' || !r || r.paused) return 'Nothing to pause'
    clearTimeout(this.timer)
    r.paused = true
    r.pausedRemaining = r.phase === 'open' ? Math.max(r.deadline - Date.now(), 1000) : 0
    this.notice(auto ? 'Paused: waiting for the host to reconnect' : 'Game paused', 'warn')
    this.broadcast()
    return null
  }

  resume() {
    const r = this.round
    if (!r?.paused) return 'Game is not paused'
    r.paused = false
    if (r.phase === 'open') {
      r.deadline = Date.now() + r.pausedRemaining
      this.timer = setTimeout(() => this.closeRound(), r.pausedRemaining)
    } else if (r.phase === 'revealed' && this.settings.autoAdvance) {
      this.timer = setTimeout(() => this.openNextRound(), this.advanceMs)
    }
    this.notice('Game resumed')
    this.broadcast()
    return null
  }

  get advanceMs() {
    return this.settings.firstCorrect ? RACE_ADVANCE_MS : AUTO_ADVANCE_MS
  }

  /** Close the round: quiz answers needing a decision go to review, everything else reveals */
  closeRound() {
    const r = this.round
    if (!r || r.phase !== 'open') return
    clearTimeout(this.timer)
    const pending = [...r.answers.values()].some((a) => a.verdict === 'pending')
    if (pending) {
      r.phase = 'review'
      this.broadcast()
    } else {
      this.revealRound()
    }
  }

  maybeCloseEarly() {
    const r = this.round
    if (!r || r.phase !== 'open' || r.paused) return
    if (this.settings.firstCorrect) {
      // Race: the first correct answer ends it. "Everyone answered" means
      // nothing when wrong guesses may be retried.
      if ([...r.answers.values()].some((a) => a.verdict === 'correct')) this.closeRound()
      return
    }
    const waiting = this.participants.some((p) => !r.answers.has(p.id) && this.connectedCount(p.id) > 0)
    if (!waiting && r.answers.size > 0) this.closeRound()
  }

  /** Host review (quiz): settle a 'pending' answer. Only pending ones — no arbitrary re-scoring. */
  decide(playerId, accept) {
    const a = this.round?.answers.get(playerId)
    if (!a || !['open', 'review'].includes(this.round.phase)) return 'Nothing to review'
    if (a.verdict !== 'pending' && a.decided !== true) return 'That answer was marked automatically'
    a.verdict = accept ? 'correct' : 'pending-rejected'
    a.decided = true
    this.maybeCloseEarly()
    this.broadcast()
    return null
  }

  revealRound() {
    const r = this.round
    if (!r || r.phase === 'revealed') return 'Nothing to reveal'
    clearTimeout(this.timer)
    r.phase = 'revealed'
    r.paused = false
    r.results = []
    r.winner = null
    if (this.settings.firstCorrect) {
      this.scoreRace(r)
      if (this.settings.autoAdvance) this.timer = setTimeout(() => this.openNextRound(), this.advanceMs)
      this.broadcast()
      return null
    }
    for (const p of this.participants) {
      const a = r.answers.get(p.id)
      let verdict = a ? a.verdict : 'none'
      if (verdict === 'pending' || verdict === 'pending-rejected') verdict = 'wrong'
      const points = r.skipped
        ? 0
        : pointsFor(verdict, { speedBonus: this.settings.speedBonus, answeredAt: a?.at, deadline: r.deadline, roundMs: r.roundMs })
      if (!r.skipped) {
        p.score += points
        if (verdict === 'correct') { p.correct++; p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak) } else p.streak = 0
      }
      p.lastDelta = points
      r.results.push({ playerId: p.id, name: p.name, verdict: r.skipped ? 'skipped' : verdict, points, text: a?.text ?? null })
    }
    if (this.settings.autoAdvance) this.timer = setTimeout(() => this.openNextRound(), this.advanceMs)
    this.broadcast()
    return null
  }

  /** Race scoring: the earliest correct answer wins (a host may accept an earlier pending one) */
  scoreRace(r) {
    const correct = [...r.answers.entries()].filter(([, a]) => a.verdict === 'correct').sort((x, y) => x[1].at - y[1].at)
    const winnerId = r.skipped ? null : correct[0]?.[0] ?? null
    if (winnerId) r.winner = { playerId: winnerId, name: this.players.get(winnerId)?.name }
    for (const p of this.participants) {
      const a = r.answers.get(p.id)
      // Plus the last guess if the host rejected it, or never got to it
      const wrongs = (a?.wrongs ?? 0) + (['pending', 'pending-rejected'].includes(a?.verdict) ? 1 : 0)
      const isWinner = p.id === winnerId
      const verdict = r.skipped ? 'skipped'
        : isWinner ? 'correct'
        : a?.verdict === 'correct' ? 'late'
        : a ? 'wrong' : 'none'
      const points = r.skipped ? 0 : racePoints({ isWinner, wrongs, answered: Boolean(a), hasWinner: Boolean(winnerId) })
      if (!r.skipped) {
        p.score += points
        if (isWinner) { p.correct++; p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak) } else p.streak = 0
      }
      p.lastDelta = points
      r.results.push({ playerId: p.id, name: p.name, verdict, points, wrongs, first: isWinner, text: a?.text ?? null })
    }
  }

  skip() {
    const r = this.round
    if (!r || r.phase === 'revealed') return 'Nothing to skip'
    r.skipped = true
    this.notice('Question skipped: no points this round')
    return this.revealRound()
  }

  next() {
    if (this.status !== 'playing') return 'Game is not running'
    if (this.round?.phase !== 'revealed') return 'Reveal the answer first'
    this.openNextRound()
    return null
  }

  finish() {
    clearTimeout(this.timer)
    this.status = 'finished'
    this.endedAt = Date.now()
    this.round = null
    const standings = this.standings()
    db.finishSession.run('finished', this.endedAt, JSON.stringify(standings.map(({ name, score, rank }) => ({ name, score, rank }))), this.code)
    for (const p of this.participants) db.setPlayerScore.run(p.score, this.code, p.id)
    this.notice('Game over')
    this.broadcast()
    return null
  }

  restart() {
    if (!['playing', 'finished'].includes(this.status)) return 'Nothing to restart'
    clearTimeout(this.timer)
    this.status = 'lobby'
    this.endedAt = null
    this.round = null
    this.rounds = []
    this.index = -1
    for (const p of this.participants) Object.assign(p, { score: 0, correct: 0, streak: 0, bestStreak: 0, lastDelta: 0 })
    db.setStatus.run('lobby', null, this.code)
    this.notice('Back to the lobby for a new game')
    this.broadcast()
    return null
  }

  kick(playerId) {
    const p = this.players.get(playerId)
    if (!p) return 'Player not found'
    if (p.id === this.hostPlayerId) return 'The host cannot be removed'
    this.players.delete(playerId)
    this.kickedNames.add(presetBase(p.name).toLowerCase())
    this.round?.answers.delete(playerId)
    for (const c of [...this.conns]) {
      if (c.playerId === playerId) {
        c.send({ type: 'closed', reason: 'kicked', message: 'The host removed you from this game.' })
        this.conns.delete(c)
        c.close()
      }
    }
    this.notice(`${p.name} was removed by the host`, 'warn')
    this.maybeCloseEarly()
    this.broadcast()
    return null
  }

  close(reason = 'closed', message = 'The host closed this game.') {
    clearTimeout(this.timer)
    clearTimeout(this.hostGraceTimer)
    if (['closed', 'abandoned', 'expired'].includes(this.status)) return null
    // A finished game keeps its recorded final standings; only the status changes
    if (this.status !== 'finished') this.endedAt = Date.now()
    this.status = reason
    db.setStatus.run(reason, this.endedAt, this.code)
    for (const c of [...this.conns]) {
      c.send({ type: 'closed', reason, message })
      c.close()
    }
    this.conns.clear()
    return null
  }

  updateSettings(next) {
    if (this.status !== 'lobby') return 'Settings can only change in the lobby'
    // Mode and custom content are fixed once the room exists
    this.settings = { ...next, mode: this.settings.mode, wordSet: this.settings.wordSet === 'custom' ? 'custom' : next.wordSet, hostPlays: this.settings.hostPlays }
    if (!this.settings.teams) for (const p of this.participants) p.teamId = null
    else for (const p of this.participants) if (!this.validTeam(p.teamId)) p.teamId = null
    db.setSettings.run(JSON.stringify(this.settings), this.code)
    this.notice('The host changed the settings')
    this.broadcast()
    return null
  }

  // ── Player actions ──────────────────────────────────────────
  answer(playerId, text) {
    const r = this.round
    if (this.status !== 'playing' || !r) return 'No round is running'
    if (r.phase !== 'open') return 'This round has closed'
    if (r.paused) return 'The game is paused'
    if (Date.now() > r.deadline) return 'Time is up'
    if (!this.players.has(playerId)) return 'You are not playing in this game'
    // Race rounds allow another guess after a wrong one; otherwise one answer each
    const prev = r.answers.get(playerId)
    if (prev && !this.settings.firstCorrect) return 'You have already answered this round'
    if (prev?.verdict === 'pending') return 'The host is still checking your answer'
    if (prev?.verdict === 'correct') return 'You already have it'
    if (prev && Date.now() - prev.at < RETRY_COOLDOWN_MS) return 'Wait a moment before guessing again'
    const clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 120)
    if (!clean) return 'Type an answer first'
    const verdict = this.mode.judge(r.data, clean)
    // Race penalties are counted once, as each guess is settled: a host
    // rejection when the player moves on, a wrong guess as it is judged
    const wrongs = (prev?.wrongs ?? 0) + (prev?.verdict === 'pending-rejected' ? 1 : 0) + (verdict === 'wrong' ? 1 : 0)
    r.answers.set(playerId, { text: clean, at: Date.now(), verdict, wrongs })
    this.maybeCloseEarly()
    this.broadcast()
    return null
  }

  setTeam(playerId, teamId) {
    if (this.status !== 'lobby') return 'Teams are fixed once the game starts'
    const p = this.players.get(playerId)
    if (!p || !this.validTeam(teamId)) return 'Unknown team'
    p.teamId = teamId
    this.broadcast()
    return null
  }

  // ── Views ───────────────────────────────────────────────────
  standings() {
    const sorted = this.participants.slice().sort((a, b) => b.score - a.score || b.correct - a.correct || a.joinedAt - b.joinedAt)
    let rank = 0
    let prev = null
    return sorted.map((p, i) => {
      if (prev === null || p.score !== prev) rank = i + 1 // ties share a rank (1, 1, 3)
      prev = p.score
      return {
        id: p.id, name: p.name, teamId: p.teamId, score: p.score, correct: p.correct,
        streak: p.streak, bestStreak: p.bestStreak, lastDelta: p.lastDelta, rank,
        connected: this.connectedCount(p.id) > 0, isHost: p.id === this.hostPlayerId,
      }
    })
  }

  teamStandings() {
    if (!this.settings.teams) return null
    const teams = this.settings.teams.map((t, i) => ({
      ...t,
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      score: this.participants.filter((p) => p.teamId === t.id).reduce((s, p) => s + p.score, 0),
      members: this.participants.filter((p) => p.teamId === t.id).length,
    }))
    return teams.sort((a, b) => b.score - a.score)
  }

  snapshotFor(conn) {
    const host = this.isHost(conn)
    const r = this.round
    const me = conn.playerId ? this.players.get(conn.playerId) : null
    let round = null

    if (r) {
      const mine = me ? r.answers.get(me.id) : null
      const showTexts = r.phase !== 'open' || (host && !me) // a playing host can't peek
      round = {
        index: this.index,
        total: this.rounds.length,
        phase: r.phase,
        paused: r.paused,
        deadline: r.deadline,
        remaining: r.paused ? r.pausedRemaining : Math.max(r.deadline - Date.now(), 0),
        roundMs: r.roundMs,
        prompt: this.mode.publicRound(r.data),
        answeredIds: [...r.answers.keys()],
        mine: mine
          ? {
              text: mine.text,
              // Own verdict before the reveal only in "instant" mode, never 'pending' detail for others
              verdict: r.phase === 'revealed' || this.settings.reveal === 'instant' ? mine.verdict : null,
              wrongs: mine.wrongs ?? 0,
              canRetry: Boolean(this.settings.firstCorrect) && r.phase === 'open' && ['wrong', 'pending-rejected'].includes(mine.verdict),
            }
          : null,
        reveal: r.phase === 'revealed' ? { ...this.mode.reveal(r.data), results: r.results, skipped: r.skipped, winner: r.winner ?? null } : null,
        responses: host && showTexts
          ? [...r.answers.entries()].map(([id, a]) => ({ playerId: id, name: this.players.get(id)?.name, text: a.text, verdict: a.verdict, decided: Boolean(a.decided), at: a.at }))
          : null,
      }
    }

    return {
      type: 'snapshot',
      version: ++this.version,
      serverTime: Date.now(),
      room: {
        code: this.code,
        status: this.status,
        hostName: this.hostName,
        hostConnected: this.hostConnected,
        settings: this.settings,
        modeLabel: this.mode.describe(this.settings),
        maxPlayers: MP_MAX_PLAYERS,
        playerCount: this.players.size,
      },
      you: { role: host ? 'host' : me ? 'player' : 'spectator', playerId: me?.id ?? null, name: me?.name ?? (host ? this.hostName : null), isHost: host },
      players: this.standings(),
      teams: this.teamStandings(),
      round,
    }
  }

  // ── Messaging ───────────────────────────────────────────────
  broadcast() {
    for (const c of this.conns) c.send(this.snapshotFor(c))
  }

  notice(text, tone = 'info') {
    for (const c of this.conns) c.send({ type: 'notice', text, tone, at: Date.now() })
  }

  publicInfo() {
    return {
      code: this.code,
      status: this.status,
      hostName: this.hostName,
      modeLabel: this.mode.describe(this.settings),
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      rounds: this.settings.mode === 'quiz' ? this.payload.questions.length : this.settings.rounds,
      seconds: this.settings.seconds,
      firstCorrect: this.settings.firstCorrect,
      teams: this.settings.teams,
      playerCount: this.players.size,
      maxPlayers: MP_MAX_PLAYERS,
    }
  }
}

/** Expire stale lobbies, close abandoned rooms, forget finished ones */
function sweep() {
  const now = Date.now()
  for (const [code, room] of rooms) {
    // Finished rooms stay 30 min so people can look at the results (and the
    // host can restart); closed ones a minute. SQLite keeps the status after.
    if (['finished', 'closed', 'abandoned', 'expired'].includes(room.status)) {
      const keep = room.status === 'finished' ? KEEP_FINISHED_MS : 60 * 1000
      if (now - room.endedAt > keep) {
        if (room.status === 'finished') room.close('closed', 'This game has ended.')
        rooms.delete(code)
      }
      continue
    }
    if (room.status === 'lobby' && now - room.createdAt > LOBBY_TTL_MS) {
      room.close('expired', 'This game expired before it started.')
    } else if (room.conns.size === 0 && now - room.lastConnectionAt > ABANDON_MS) {
      room.close('abandoned', 'Everyone left, so this game was closed.')
    }
  }
}
