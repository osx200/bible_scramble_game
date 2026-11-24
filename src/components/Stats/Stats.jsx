import { useState } from 'react'
import Stage from '../Stage/Stage.jsx'
import Button from '../shared/Button.jsx'
import { WORD_SETS } from '../../data/wordSets.js'
import styles from './Stats.module.css'

const TOKEN_KEY = 'statsToken'
const MODE_LABELS = {
  scramble: 'Word Unscramble', multiplayer: 'Play With Others', recall: 'Book Recall',
  moderator: 'Moderator View', quiz: 'Quiz & Scramble Builder',
}

function readToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' }
}

/** 'solo:books' → 'Solo · Books of the Bible', 'recall' → 'Book Recall' */
function gameLabel(key) {
  const [kind, set] = key.split(':')
  if (!set) return MODE_LABELS[kind] ?? (kind === 'quiz' ? 'Quiz' : kind)
  return `${kind === 'teams' ? 'Teams' : 'Solo'} · ${WORD_SETS[set]?.label ?? set}`
}

/** Sorted [label, count] totals for one event */
function totals(events, event, label) {
  const sums = new Map()
  for (const e of events) {
    if (e.event !== event) continue
    const key = label(e.detail)
    sums.set(key, (sums.get(key) ?? 0) + e.count)
  }
  return [...sums].sort((a, b) => b[1] - a[1])
}

function BarList({ title, rows, empty = 'Nothing yet' }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {rows.length === 0 ? <p className={styles.empty}>{empty}</p> : (
        <ul className={styles.bars}>
          {rows.map(([label, n]) => (
            <li key={label}>
              <span className={styles.barLabel}>{label}</span>
              <span className={styles.barTrack}>
                <span className={styles.bar} style={{ transform: `scaleX(${n / max})` }} />
              </span>
              <span className={styles.barValue}>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * /stats: the owner's view of the anonymous visit counters (GET /api/stats,
 * needs the server's ADMIN_TOKEN). The token is kept for this tab only.
 */
export default function Stats() {
  const [token, setToken] = useState(readToken)
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load(e) {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/stats?days=${days}`, { headers: { 'X-Admin-Token': token } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`)
      try { sessionStorage.setItem(TOKEN_KEY, token) } catch { /* fine */ }
      setData(body)
    } catch (err) {
      setData(null)
      setError(err.message === 'Failed to fetch' ? 'Server unavailable' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const visits = data ? new Map(data.events.filter((e) => e.event === 'visit').map((e) => [e.day, e.count])) : null
  const visitorDays = data ? data.visitors.slice().reverse() : []
  const totalVisitors = visitorDays.reduce((n, d) => n + d.visitors, 0)
  const totalVisits = visits ? [...visits.values()].reduce((n, c) => n + c, 0) : 0
  const maxVisitors = Math.max(1, ...visitorDays.map((d) => d.visitors))

  return (
    <Stage art="jonathan">
      <div className={styles.card}>
        <h1>Visit counts</h1>
        <p className={styles.lead}>
          Anonymous daily totals. No cookies or IP addresses are stored; see the Privacy page.
        </p>

        <form className={styles.form} onSubmit={load}>
          <label className={styles.label} htmlFor="stats-token">Admin token</label>
          <input
            id="stats-token"
            type="password"
            className={styles.input}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="current-password"
          />
          <label className={styles.label} htmlFor="stats-days">Days</label>
          <select id="stats-days" className={styles.input} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 30, 90, 365].map((n) => <option key={n} value={n}>Last {n} days</option>)}
          </select>
          <Button type="submit" disabled={busy || !token}>{busy ? 'Loading…' : 'Show'}</Button>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </form>

        {data && (
          <>
            <dl className={styles.totals}>
              <div><dt>Visitors</dt><dd>{totalVisitors}</dd></div>
              <div><dt>Visits</dt><dd>{totalVisits}</dd></div>
              <div><dt>Games finished</dt><dd>{data.events.filter((e) => e.event === 'game_finish').reduce((n, e) => n + e.count, 0)}</dd></div>
              <div><dt>Shares</dt><dd>{data.events.filter((e) => e.event === 'share').reduce((n, e) => n + e.count, 0)}</dd></div>
            </dl>

            <section className={styles.section}>
              <h2>By day</h2>
              {visitorDays.length === 0 ? <p className={styles.empty}>No visits yet</p> : (
                <table className={styles.table}>
                  <thead><tr><th>Day</th><th>Visitors</th><th>Visits</th></tr></thead>
                  <tbody>
                    {visitorDays.map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>
                          <span className={styles.cellBar}>
                            <span className={styles.bar} style={{ transform: `scaleX(${d.visitors / maxVisitors})` }} />
                          </span>
                          {d.visitors}
                        </td>
                        <td>{visits.get(d.day) ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <BarList title="Games opened" rows={totals(data.events, 'mode_open', (d) => MODE_LABELS[d] ?? d)} />
            <BarList title="Games finished" rows={totals(data.events, 'game_finish', gameLabel)} />
            <BarList title="Scores shared" rows={totals(data.events, 'share', gameLabel)} />
            <BarList title="TV mode used" rows={totals(data.events, 'tv_mode', () => 'Moderator View')} />
          </>
        )}

        <a className={styles.home} href="/">Back to the games</a>
      </div>
    </Stage>
  )
}
