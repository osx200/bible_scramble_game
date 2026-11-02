// HTTP side of multiplayer (under /api/mp/):
//   POST /api/mp/rooms                 create a room → { code, token, joinPath }
//   GET  /api/mp/rooms/:code           lobby info for the join screen
//   POST /api/mp/rooms/:code/join      { name, teamId? } → { token, playerId }
//   GET  /api/mp/qr/:code              invite QR code (SVG), live rooms only
// Everything after joining happens over the WebSocket (socket.js).
import QRCode from 'qrcode'
import { createRoom, getRoom, hashToken, newToken } from './rooms.js'
import { normaliseRoomCode } from './codes.js'
import { validateSettings, validatePayload } from './settings.js'
import { closedMessage } from './socket.js'
import { toInitials } from '../../src/utils/initials.js'

const WINDOW_MS = 10 * 60 * 1000
const MAX_CREATE_BODY = 256 * 1024 // a full Builder upload fits comfortably

// Per-IP sliding-window limits: { bucket → Map(ip → timestamps) }
const buckets = { create: new Map(), lookupFail: new Map(), join: new Map() }
const LIMITS = { create: 5, lookupFail: 20, join: 30 }

function limited(bucket, ip, record = true) {
  const map = buckets[bucket]
  const now = Date.now()
  const recent = (map.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= LIMITS[bucket]) { map.set(ip, recent); return true }
  if (record) recent.push(now)
  map.set(ip, recent)
  return false
}

function recordFailure(ip) {
  limited('lookupFail', ip, true)
}

setInterval(() => {
  const now = Date.now()
  for (const map of Object.values(buckets)) {
    for (const [ip, times] of map) if (!times.some((t) => now - t < WINDOW_MS)) map.delete(ip)
  }
}, WINDOW_MS).unref()

/**
 * Returns true when it handled the request.
 * helpers: { send, readJson, clientIp, cleanName, isBlocked, statusOf }
 */
export async function handleMultiplayerHttp(req, res, url, helpers) {
  const { send, readJson, clientIp, cleanName, isBlocked, statusOf } = helpers
  const { pathname } = url
  if (!pathname.startsWith('/api/mp/')) return false
  const ip = clientIp(req)

  // ── Create ──
  if (req.method === 'POST' && pathname === '/api/mp/rooms') {
    if (limited('create', ip)) { send(res, 429, { error: 'Too many games created. Please wait a few minutes.' }); return true }
    const body = await readJson(req, MAX_CREATE_BODY)
    // Privacy: individuals appear as initials; a group host keeps its name
    const hostName = cleanName(body?.hostKind === 'group' ? body?.hostName : toInitials(body?.hostName))
    if (!hostName) { send(res, 400, { error: 'Your name must be 2 to 24 characters' }); return true }
    if (isBlocked(hostName)) { send(res, 400, { error: 'Please choose a different name' }); return true }
    const v = validateSettings(body?.settings, { cleanName, isBlocked })
    if (v.error) { send(res, 400, { error: v.error }); return true }
    const p = validatePayload(v.settings, body?.payload)
    if (p.error) { send(res, 400, { error: p.error }); return true }
    const { room, token } = createRoom({ hostName, settings: v.settings, payload: p.payload })
    send(res, 201, { code: room.code, token, joinPath: `/join/${room.code}`, room: room.publicInfo() })
    return true
  }

  // A plain request to the socket path: proves the route reaches this server
  // (handy when checking the host nginx WebSocket block)
  if (pathname === '/api/mp/ws') {
    send(res, 426, { error: 'This address only accepts WebSocket connections.' })
    return true
  }

  // ── Lookup / join / QR ──
  const m = pathname.match(/^\/api\/mp\/(rooms|qr)\/([^/]+)(\/join)?$/)
  if (!m) { send(res, 404, { error: 'Not found' }); return true }
  const [, kind, rawCode, joinSuffix] = m

  if (limited('lookupFail', ip, false)) {
    send(res, 429, { error: 'Too many wrong codes. Please wait a few minutes.' })
    return true
  }
  const code = normaliseRoomCode(decodeURIComponent(rawCode))
  const room = code && getRoom(code)
  const joinable = room && ['lobby', 'playing'].includes(room.status)

  if (!joinable) {
    const status = room?.status ?? (code ? statusOf(code) : null)
    if (!status) recordFailure(ip) // only unknown codes count toward the guessing limit
    send(res, status ? 410 : 404, { error: closedMessage(status), status: status ?? 'not-found' })
    return true
  }

  if (kind === 'qr' && req.method === 'GET' && !joinSuffix) {
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
    const link = `${proto}://${req.headers.host}/join/${room.code}`
    const svg = await QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#12162A', light: '#FFFFFF' } })
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(svg)
    return true
  }

  if (kind === 'rooms' && req.method === 'GET' && !joinSuffix) {
    send(res, 200, { room: room.publicInfo() })
    return true
  }

  if (kind === 'rooms' && req.method === 'POST' && joinSuffix) {
    if (limited('join', ip)) { send(res, 429, { error: 'Too many join attempts. Please wait a few minutes.' }); return true }
    const body = await readJson(req, 2048)
    const name = cleanName(body?.asGroup === true ? body?.name : toInitials(body?.name))
    if (!name) { send(res, 400, { error: 'Your name must be 2 to 24 characters' }); return true }
    if (isBlocked(name)) { send(res, 400, { error: 'Please choose a different name' }); return true }
    if (room.kickedNames.has(name.toLowerCase())) { send(res, 403, { error: 'The host removed that name from this game.' }); return true }
    const taken = room.nameTaken(name)
    if (taken) {
      send(res, 409, { error: `Someone with the initials ${taken} is already in this game. Add a middle initial so you can be told apart.` })
      return true
    }
    if (room.full) { send(res, 409, { error: 'This game is full.' }); return true }
    const token = newToken()
    const player = room.addPlayer({ name, tokenHash: hashToken(token), teamId: typeof body?.teamId === 'string' ? body.teamId : null })
    room.notice(`${name} joined`)
    room.broadcast()
    send(res, 201, { token, playerId: player.id, code: room.code })
    return true
  }

  send(res, 405, { error: 'Method not allowed' })
  return true
}
