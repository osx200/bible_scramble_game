import { useAppMode } from '../../context/AppModeContext.jsx'
import Button from '../shared/Button.jsx'
import styles from './RecallResults.module.css'

function getMessage(score, total) {
  const pct = total > 0 ? score / total : 0
  if (score === total) return { text: 'Perfect Score!',       emoji: '🏆' }
  if (pct >= 0.9)      return { text: 'Outstanding!',         emoji: '🌟' }
  if (pct >= 0.75)     return { text: 'Excellent Work!',      emoji: '🎉' }
  if (pct >= 0.5)      return { text: 'Great Effort!',        emoji: '👏' }
  if (pct >= 0.25)     return { text: 'Keep Practicing!',     emoji: '📖' }
  return                      { text: 'Every Book Learned Counts!', emoji: '🌱' }
}

export default function RecallResults({ namedBooks, targetBooks, onPlayAgain }) {
  const { setAppMode } = useAppMode()
  const namedSet = new Set(namedBooks)
  const score    = namedSet.size
  const total    = targetBooks.length
  const pct      = total > 0 ? Math.round((score / total) * 100) : 0
  const msg      = getMessage(score, total)

  const otBooks = targetBooks.filter(b => b.testament === 'OT')
  const ntBooks = targetBooks.filter(b => b.testament === 'NT')

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* ── Score header ── */}
        <div className={styles.scoreHeader}>
          <div className={styles.scoreEmoji}>{msg.emoji}</div>
          <div className={styles.scoreNum}>
            {score}<span className={styles.scoreTotal}> / {total}</span>
          </div>
          <div className={styles.scorePct}>{pct}% recalled</div>
          <div className={styles.scoreMsg}>{msg.text}</div>
        </div>

        {/* ── OT / NT sections ── */}
        <div className={styles.sections}>
          {otBooks.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Old Testament
                <span className={styles.sectionCount}>
                  {otBooks.filter(b => namedSet.has(b.name)).length}/{otBooks.length}
                </span>
              </h2>
              <div className={styles.bookList}>
                {otBooks.map(b => (
                  <div
                    key={b.name}
                    className={`${styles.bookItem} ${namedSet.has(b.name) ? styles.bookNamed : styles.bookMissed}`}
                  >
                    <span className={styles.bookIcon}>{namedSet.has(b.name) ? '✓' : '✗'}</span>
                    <span className={styles.bookName}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ntBooks.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                New Testament
                <span className={styles.sectionCount}>
                  {ntBooks.filter(b => namedSet.has(b.name)).length}/{ntBooks.length}
                </span>
              </h2>
              <div className={styles.bookList}>
                {ntBooks.map(b => (
                  <div
                    key={b.name}
                    className={`${styles.bookItem} ${namedSet.has(b.name) ? styles.bookNamed : styles.bookMissed}`}
                  >
                    <span className={styles.bookIcon}>{namedSet.has(b.name) ? '✓' : '✗'}</span>
                    <span className={styles.bookName}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className={styles.actions}>
          <Button full size="lg" onClick={onPlayAgain}>Play Again</Button>
          <button className={styles.menuBtn} type="button" onClick={() => setAppMode('scramble')}>
            ← Back to Menu
          </button>
        </div>

      </div>
    </div>
  )
}
