// The WebSocket endpoint (/api/mp/ws), via the `ws` library. Each socket must
// open with `resume { code, token }`; the token (checked by hash) decides
// whether it speaks for the host, a player, or nobody.
import { WebSocketServer } from 'ws'
import { getRoom, hashToken } from './rooms.js'
import { normaliseRoomCode } from './codes.js'
import { parseMessage, HOST_ONLY, PLAYER_ONLY } from './protocol.js'

const WS_PATH = '/api/mp/ws'
const HEARTBEAT_MS = 25 * 1000
const RESUME_TIMEOUT_MS = 10 * 1000
const MSGS_PER_SECOND = 20

export function attachMultiplayerSockets(server, { validateSettings, statusOf }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 })

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (pathname !== WS_PATH) return socket.destroy()
    // Browsers always send Origin: only this site may open a game socket
    const origin = req.headers.origin
    if (origin) {
      let ok = false
      try { ok = new URL(origin).host === req.headers.host } catch {}
      if (!ok) {
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
        return socket.destroy()
      }
    }
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws))
  })

  function onConnection(ws) {
    const conn = {
      ws,
      room: null,
      playerId: null,
      tokenHash: null,
      reconnecting: false,
      recent: [],
      actionIds: [],
      send(obj) {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj))
      },
      close() {
        try { ws.close(1000) } catch {}
      },
    }

    const resumeTimer = setTimeout(() => { if (!conn.room) conn.close() }, RESUME_TIMEOUT_MS)
    ws.on('pong', () => { ws.missedPongs = 0 })
    ws.on('close', () => {
      clearTimeout(resumeTimer)
      conn.room?.detach(conn)
    })
    ws.on('error', () => {})

    // An exception thrown inside a socket listener is uncaught and would stop
    // the whole process, ending every live game: contain it to this message
    ws.on('message', (raw) => {
      try {
        onMessage(raw)
      } catch (err) {
        console.error('multiplayer message failed:', err)
        conn.send({ type: 'error', message: 'Something went wrong with that action. Please try again.' })
      }
    })

    function onMessage(raw) {
      // Flood control: drop bursts, hang up on sustained abuse
      const now = Date.now()
      conn.recent = conn.recent.filter((t) => now - t < 1000)
      conn.recent.push(now)
      if (conn.recent.length > MSGS_PER_SECOND * 3) return conn.close()
      if (conn.recent.length > MSGS_PER_SECOND) return conn.send({ type: 'error', message: 'Slow down a little.' })

      const msg = parseMessage(raw)
      if (!msg) return conn.send({ type: 'error', message: 'Unrecognised message.' })

      if (!conn.room) {
        if (msg.type !== 'resume') return conn.send({ type: 'error', message: 'Join a room first.' })
        return handleResume(conn, msg, resumeTimer)
      }

      // Retried actions (same actionId) are acknowledged, never applied twice
      if (msg.actionId) {
        if (conn.actionIds.includes(msg.actionId)) return conn.send(conn.room.snapshotFor(conn))
        conn.actionIds = [...conn.actionIds.slice(-49), msg.actionId]
      }
      handleAction(conn, msg)
    }
  }

  function handleResume(conn, msg, resumeTimer) {
    const code = normaliseRoomCode(msg.code)
    const room = code && getRoom(code)
    if (!room || !['lobby', 'playing', 'finished'].includes(room.status)) {
      const status = room?.status ?? (code ? statusOf(code) : null)
      conn.send({ type: 'closed', reason: status ?? 'not-found', message: closedMessage(status) })
      return conn.close()
    }
    const tokenHash = hashToken(msg.token)
    const auth = room.authenticate(tokenHash)
    if (!auth) {
      conn.send({ type: 'closed', reason: 'unauthorized', message: 'This device is not part of that game. Join with the room code instead.' })
      return conn.close()
    }
    clearTimeout(resumeTimer)
    conn.room = room
    conn.tokenHash = tokenHash
    conn.playerId = auth.playerId
    conn.reconnecting = msg.reconnect === true
    room.attach(conn)
  }

  function handleAction(conn, msg) {
    const room = conn.room
    if (HOST_ONLY.has(msg.type) && !room.isHost(conn)) {
      return conn.send({ type: 'error', message: 'Only the host can do that.', action: msg.type })
    }
    if (PLAYER_ONLY.has(msg.type) && !conn.playerId) {
      return conn.send({ type: 'error', message: 'Only players can do that.', action: msg.type })
    }
    let error = null
    switch (msg.type) {
      case 'answer': error = room.answer(conn.playerId, msg.texts ?? msg.text); break
      case 'set_team': error = room.setTeam(conn.playerId, msg.teamId); break
      case 'start': error = room.start(); break
      case 'pause': error = room.pause(); break
      case 'resume_game': error = room.resume(); break
      case 'skip': error = room.skip(); break
      // During an open round this closes it — via review when a quiz answer needs the host
      case 'reveal': error = room.round?.phase === 'open' ? (room.closeRound(), null) : room.revealRound(); break
      case 'next': error = room.next(); break
      case 'end': error = room.status === 'playing' ? room.finish() : 'The game is not running'; break
      case 'restart': error = room.restart(); break
      case 'close': error = room.close(); break
      case 'kick': error = room.kick(msg.playerId); break
      case 'accept': error = room.decide(msg.playerId, msg.accept); break
      case 'update_settings': {
        const result = validateSettings({ ...msg.settings, mode: room.settings.mode, wordSet: msg.settings.wordSet ?? room.settings.wordSet })
        error = result.error ?? room.updateSettings(result.settings)
        break
      }
      case 'resume': error = 'Already joined'; break
    }
    if (error) conn.send({ type: 'error', message: error, action: msg.type })
  }

  // Heartbeat: a socket that misses two pings in a row is treated as gone
  // (its close handler then detaches it from the room)
  setInterval(() => {
    for (const ws of wss.clients) {
      ws.missedPongs = (ws.missedPongs ?? 0) + 1
      if (ws.missedPongs > 2) { ws.terminate(); continue }
      try { ws.ping() } catch {}
    }
  }, HEARTBEAT_MS).unref()

  return wss
}

export function closedMessage(status) {
  switch (status) {
    case 'finished': return 'That game has already finished.'
    case 'closed': return 'The host closed that game.'
    case 'expired': return 'That invitation has expired.'
    case 'abandoned': return 'That game was closed because everyone left.'
    case 'interrupted': return 'That game ended when the server restarted. Ask the host to start a new one.'
    default: return 'No game found with that code. Check it and try again.'
  }
}
