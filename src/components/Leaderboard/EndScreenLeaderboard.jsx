import { useState } from 'react'
import { BOARDS } from '../../utils/leaderboardApi.js'
import Leaderboard from './Leaderboard.jsx'
import styles from './EndScreenLeaderboard.module.css'

/**
 * The leaderboard strip on GameOver / TeamResults: announces any placing the
 * game just earned, and expands the full board in place on request.
 *
 * submission — the value returned by useLeaderboardSubmit()
 * solo       — word the banner for "you" rather than for named teams
 */
export default function EndScreenLeaderboard({ submission, solo = false, defaultBoard, highlightNames }) {
  const [open, setOpen] = useState(false)
  const placed = submission.results.filter((r) => r.rank)

  return (
    <div className={styles.wrap}>
      {submission.status === 'pending' && (
        <p className={`${styles.banner} ${styles.pending}`} role="status">
          Saving score to the leaderboard…
        </p>
      )}

      {placed.map((r) => (
        <p key={`${r.board}-${r.name}`} className={styles.banner} role="status">
          <span className={styles.bannerEmoji} aria-hidden="true">🎉</span>
          <span>
            {solo ? 'You’re ' : <strong>{r.name}</strong>}
            {solo ? '' : ' placed '}
            <strong className={styles.rank}>#{r.rank}</strong> on this month’s {BOARDS[r.board].label}!
          </span>
        </p>
      ))}

      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide leaderboard' : 'View leaderboard'}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.panel}>
          <Leaderboard
            defaultBoard={defaultBoard}
            highlightNames={highlightNames}
            refreshKey={submission.refreshKey}
          />
        </div>
      )}
    </div>
  )
}
