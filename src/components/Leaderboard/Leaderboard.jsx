import { useEffect, useState } from 'react'
import { BOARDS, fetchLeaderboard, monthLabel, resetLabel } from '../../utils/leaderboardApi.js'
import { WORD_SETS } from '../../data/wordSets.js'
import styles from './Leaderboard.module.css'

const RANKS = ['🥇', '🥈', '🥉', '4', '5']
const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const TOP_N = 5

/**
 * This month's Top Players / Top Groups. Embedded inside other screens'
 * cards (Menu, GameOver, TeamResults) rather than being a page of its own.
 *
 * highlightNames — names to mark as "you" (case-insensitive)
 * refreshKey     — change it to refetch, e.g. once a just-submitted score lands
 */
export default function Leaderboard({ defaultBoard = 'individual', highlightNames = [], refreshKey = 0 }) {
  const [board, setBoard] = useState(defaultBoard)
  const [data, setData] = useState(null) // null = loading
  const highlights = highlightNames.map((n) => n.toLowerCase())

  useEffect(() => {
    let cancelled = false
    setData(null)
    fetchLeaderboard(board).then((res) => {
      if (!cancelled) setData(res)
    })
    return () => {
      cancelled = true
    }
  }, [board, refreshKey])

  return (
    <section className={styles.board} aria-label="Monthly leaderboard">
      <div className={styles.tabs} role="tablist">
        {Object.values(BOARDS).map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={board === b.id}
            className={`${styles.tab} ${board === b.id ? styles.tabActive : ''}`}
            onClick={() => setBoard(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {data?.ok && (
        <p className={styles.period}>
          {monthLabel(data.month)} <span className={styles.dot}>·</span> resets {resetLabel(data.month)}
        </p>
      )}

      {data === null ? (
        <ol className={styles.list} aria-busy="true">
          {Array.from({ length: TOP_N }, (_, i) => (
            <li key={i} className={`${styles.row} ${styles.skeleton}`} style={{ '--i': i }} />
          ))}
        </ol>
      ) : !data.ok ? (
        <p className={styles.message}>
          Leaderboard unavailable right now. Please try again in a little while.
        </p>
      ) : data.entries.length === 0 ? (
        <p className={styles.message}>
          No scores yet this month. Be the first!
        </p>
      ) : (
        <ol className={styles.list}>
          {data.entries.map((e, i) => {
            const mine = highlights.includes(e.name.toLowerCase())
            return (
              <li
                key={e.id}
                className={`${styles.row} ${i < 3 ? styles[`podium${i + 1}`] : ''} ${mine ? styles.mine : ''}`}
                style={{ '--i': i }}
              >
                <span className={`${styles.rank} ${i >= 3 ? styles.rankPlain : ''}`}>{RANKS[i]}</span>
                <span className={styles.who}>
                  <span className={styles.name}>
                    {e.name}
                    {mine && <span className={styles.youTag}>You</span>}
                  </span>
                  <span className={styles.meta}>
                    {e.correct}/{e.total} correct · {DIFFICULTY_LABEL[e.difficulty]} ·{' '}
                    {WORD_SETS[e.wordSet]?.label ?? e.wordSet}
                  </span>
                </span>
                <span className={styles.score}>{e.score}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
