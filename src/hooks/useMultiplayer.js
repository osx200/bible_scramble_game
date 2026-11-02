import { useCallback, useEffect, useRef, useState } from 'react'
import { uid } from '../utils/multiplayerApi.js'

const BACKOFF = [1000, 2000, 4000, 8000, 10000]

function socketUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/api/mp/ws`
}

/**
 * The live connection to one multiplayer room.
 *
 * The server sends a complete per-viewer `snapshot` after every change, so
 * this hook only keeps the latest one — no event replay to get out of sync.
 * It reconnects with backoff after drops and re-sends `resume`, which the
 * server answers with the same player (never a duplicate) and current state.
 *
 * → { connection, snapshot, notices, lastError, closed, clockOffset, send }
 *   connection: 'connecting' | 'open' | 'reconnecting' | 'closed'
 *   clockOffset: serverTime - Date.now(), for countdowns that match the server
 */
export function useMultiplayer({ code, token, onNotice }) {
  const [connection, setConnection] = useState('connecting')
  const [snapshot, setSnapshot] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [closed, setClosed] = useState(null) // { reason, message } — terminal
  const [clockOffset, setClockOffset] = useState(0)

  const wsRef = useRef(null)
  const attemptRef = useRef(0)
  const retryTimerRef = useRef(null)
  const closedRef = useRef(false)
  const everOpenRef = useRef(false)
  const onNoticeRef = useRef(onNotice)
  useEffect(() => { onNoticeRef.current = onNotice })

  const connect = useCallback(() => {
    if (closedRef.current) return
    const ws = new WebSocket(socketUrl())
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'resume', code, token, reconnect: everOpenRef.current }))
    }

    ws.onmessage = (event) => {
      let msg
      try { msg = JSON.parse(event.data) } catch { return }
      if (msg.type === 'snapshot') {
        attemptRef.current = 0
        everOpenRef.current = true
        setClockOffset(msg.serverTime - Date.now())
        setSnapshot(msg)
        setConnection('open')
      } else if (msg.type === 'notice') {
        onNoticeRef.current?.(msg)
      } else if (msg.type === 'error') {
        setLastError({ message: msg.message, action: msg.action, at: Date.now() })
      } else if (msg.type === 'closed') {
        closedRef.current = true
        setClosed({ reason: msg.reason, message: msg.message })
        setConnection('closed')
      }
    }

    ws.onclose = () => {
      if (wsRef.current !== ws || closedRef.current) return
      setConnection('reconnecting')
      const delay = BACKOFF[Math.min(attemptRef.current, BACKOFF.length - 1)]
      attemptRef.current++
      retryTimerRef.current = setTimeout(connect, delay)
    }
  }, [code, token])

  useEffect(() => {
    closedRef.current = false
    connect()
    // Phones suspend sockets in the background: check again on return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState !== WebSocket.OPEN && !closedRef.current) {
        clearTimeout(retryTimerRef.current)
        attemptRef.current = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      closedRef.current = true
      document.removeEventListener('visibilitychange', onVisible)
      clearTimeout(retryTimerRef.current)
      const ws = wsRef.current
      wsRef.current = null
      try { ws?.close() } catch {}
    }
  }, [connect])

  /** Send an action. Each carries an actionId so a retry is never applied twice. */
  const send = useCallback((type, payload = {}) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError({ message: 'Not connected right now. Trying again…', action: type, at: Date.now() })
      return false
    }
    ws.send(JSON.stringify({ type, actionId: uid(), ...payload }))
    return true
  }, [])

  return { connection, snapshot, lastError, closed, clockOffset, send }
}
