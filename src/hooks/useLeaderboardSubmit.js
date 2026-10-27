import { useEffect, useRef, useState } from 'react'
import { submitScore, uid } from '../utils/leaderboardApi.js'

/**
 * Posts an end-of-game screen's scores to the leaderboard exactly once.
 *
 * `buildEntries()` runs on first render only and returns
 * `[{ board, name, score, correct, total, difficulty, wordSet }]`. Each entry
 * gets a stable id there, so StrictMode's double effect (or any retry) is a
 * no-op on the server rather than a duplicate row.
 *
 * → { status: 'pending' | 'done', results: [{ name, board, rank }], refreshKey }
 *   `rank` is 1–5 when that game made this month's board, otherwise null.
 *   `refreshKey` bumps once everything has landed, for <Leaderboard>.
 */
export default function useLeaderboardSubmit(buildEntries) {
  const [entries] = useState(() => buildEntries().map((e) => ({ ...e, id: uid() })))
  const [state, setState] = useState({ status: entries.length ? 'pending' : 'done', results: [], refreshKey: 0 })
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current || entries.length === 0) return
    sent.current = true
    Promise.all(entries.map(submitScore)).then((responses) => {
      setState({
        status: 'done',
        results: responses.map((r, i) => ({
          name: entries[i].name,
          board: entries[i].board,
          rank: r.ok ? r.rank ?? null : null,
        })),
        refreshKey: 1,
      })
    })
  }, [entries])

  return state
}
