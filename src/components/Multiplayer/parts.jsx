import { useEffect, useState } from 'react'
import { useFlipList } from '../../hooks/useFlipList.js'
import styles from './Multiplayer.module.css'

/** Seconds left in the round, ticking locally but anchored to the server clock */
export function useCountdown(round, clockOffset) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!round || round.phase !== 'open' || round.paused) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [round])
  if (!round) return 0
  if (round.paused || round.phase !== 'open') return Math.ceil(round.remaining / 1000)
  return Math.max(Math.ceil((round.deadline - (now + clockOffset)) / 1000), 0)
}

export function Countdown({ seconds, total, paused }) {
  const pct = total ? Math.max(Math.min(seconds / total, 1), 0) * 100 : 0
  const low = seconds <= 5 && !paused
  return (
    <div className={`${styles.countdown} ${low ? styles.countdownLow : ''}`} aria-live="off">
      <span className={styles.countdownNum}>{paused ? 'II' : seconds}</span>
      <span className={styles.countdownLabel}>{paused ? 'paused' : 'seconds'}</span>
      <span className={styles.countdownBar}><span style={{ transform: `scaleX(${pct / 100})` }} /></span>
    </div>
  )
}

const VERDICT_LABEL = { correct: 'Correct', wrong: 'Wrong', none: 'No answer', skipped: 'Skipped', pending: 'Waiting for host', late: 'Right, but not first' }

/**
 * Live standings. `answeredIds` (open round) shows who has answered without
 * revealing what; `onKick` adds the host's remove button (lobby only).
 */
const defaultMeta = (p) => `${p.correct} correct${p.streak >= 2 ? ` · ${p.streak} in a row` : ''}`

export function Standings({ players, teams, youId, answeredIds, showDelta, onKick, compact = false, metaLabel = defaultMeta }) {
  // Rows glide to their new rank when the order changes (after a reveal)
  const playerOrder = players.map((p) => p.id).join(',')
  const teamOrder = teams ? teams.map((t) => t.id).join(',') : ''
  const playerListRef = useFlipList(playerOrder)
  const teamListRef = useFlipList(teamOrder)
  return (
    <div className={styles.standings}>
      {teams && (
        <ol className={styles.teamList} ref={teamListRef}>
          {teams.map((t, i) => (
            <li key={t.id} className={styles.teamRow} data-flip-key={t.id}>
              <span className={styles.teamSwatch} style={{ background: t.color }} aria-hidden="true" />
              <span className={styles.teamName}>{i === 0 && t.score > 0 ? 'Leading: ' : ''}{t.name}</span>
              <span className={styles.teamMembers}>{t.members} {t.members === 1 ? 'player' : 'players'}</span>
              <span className={styles.teamScore}>{t.score}</span>
            </li>
          ))}
        </ol>
      )}
      <ol className={styles.playerList} ref={playerListRef}>
        {players.map((p) => (
          <li key={p.id} data-flip-key={p.id} className={`${styles.playerRow} ${p.id === youId ? styles.playerYou : ''} ${compact ? styles.playerCompact : ''}`}>
            {!compact && <span className={styles.rank}>{p.rank}</span>}
            <span className={styles.playerName}>
              <span
                className={`${styles.presence} ${p.connected ? styles.presenceOn : ''}`}
                title={p.connected ? 'Connected' : 'Disconnected'}
                aria-label={p.connected ? 'connected' : 'disconnected'}
              />
              {p.name}
              {p.isHost && <span className={styles.tag}>Host</span>}
              {p.id === youId && <span className={styles.tag}>You</span>}
              {answeredIds?.includes(p.id) && <span className={`${styles.tag} ${styles.tagDone}`}>Answered</span>}
            </span>
            {!compact && <span className={styles.playerMeta}>{metaLabel(p)}</span>}
            {!compact && <span className={styles.playerScore}>
              {p.score}
              {showDelta && p.lastDelta !== 0 && (
                <span className={`${styles.delta} ${p.lastDelta > 0 ? styles.deltaUp : styles.deltaDown}`}>
                  {p.lastDelta > 0 ? `+${p.lastDelta}` : p.lastDelta}
                </span>
              )}
            </span>}
            {onKick && !p.isHost && (
              <button type="button" className={styles.kickBtn} onClick={() => onKick(p)} aria-label={`Remove ${p.name}`}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function verdictLabel(v) {
  return VERDICT_LABEL[v] ?? v
}

/** Short-lived notices ("Ama joined", "Game paused") */
export function useNotices() {
  const [notices, setNotices] = useState([])
  function push(n) {
    const id = Math.random().toString(36).slice(2)
    setNotices((list) => [...list.slice(-3), { ...n, id }])
    setTimeout(() => setNotices((list) => list.filter((x) => x.id !== id)), 3800)
  }
  return [notices, push]
}

export function Notices({ notices }) {
  return (
    <div className={styles.notices} aria-live="polite">
      {notices.map((n) => (
        <p key={n.id} className={`${styles.notice} ${n.tone === 'warn' ? styles.noticeWarn : ''}`}>{n.text}</p>
      ))}
    </div>
  )
}
