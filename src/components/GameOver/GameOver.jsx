import { useGame } from '../../context/GameContext.jsx'
import Button from '../shared/Button.jsx'
import Confetti from '../Confetti/Confetti.jsx'
import styles from './GameOver.module.css'

function getRating(correct, total) {
  const pct = correct / total
  if (pct === 1) return { emoji: '🏆', text: 'Perfect score!' }
  if (pct >= 0.8) return { emoji: '⭐', text: 'Excellent!' }
  if (pct >= 0.6) return { emoji: '👍', text: 'Well done!' }
  if (pct >= 0.4) return { emoji: '📖', text: 'Keep studying!' }
  return { emoji: '🙏', text: 'More practice needed.' }
}

export default function GameOver() {
  const { state, dispatch } = useGame()
  const { score, streak, bestStreak, roundResults, difficulty, category } = state

  const correctCount = roundResults.filter((r) => r.correct).length
  const total = roundResults.length
  const rating = getRating(correctCount, total)
  const celebrate = correctCount / total >= 0.8

  return (
    <>
      <Confetti count={celebrate ? 130 : 0} active={celebrate} />
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={`${styles.emoji} ${celebrate ? styles.trophyAnim : ''}`}>{rating.emoji}</div>
          <h1 className={`${styles.title} ${celebrate ? styles.winnerPop : ''}`}>Game Over!</h1>
          <p className={styles.subtitle}>{rating.text}</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{score.toLocaleString()}</div>
            <div className={styles.statLabel}>Score</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{correctCount}/{total}</div>
            <div className={styles.statLabel}>Correct</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>🔥{bestStreak}</div>
            <div className={styles.statLabel}>Best Streak</div>
          </div>
        </div>

        <p className={styles.resultsTitle}>Round Results</p>
        <div className={styles.results}>
          {roundResults.map((r, i) => (
            <div
              key={i}
              className={`${styles.resultRow} ${r.correct ? styles.correct : styles.wrong}`}
            >
              <span className={styles.resultIcon}>{r.correct ? '✅' : r.skipped ? '⏭' : '❌'}</span>
              <span className={styles.resultBook}>{r.book.name}</span>
              {r.timeUsed !== undefined && (
                <span className={styles.resultTime}>{r.timeUsed}s</span>
              )}
              <span className={`${styles.resultPts} ${r.pointsEarned === 0 ? styles.zero : ''}`}>
                {r.correct ? `+${r.pointsEarned}` : r.skipped ? 'skipped' : '—'}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Button full size="lg" onClick={() => dispatch({ type: 'START_GAME' })}>
            Play Again
          </Button>
          <Button full variant="ghost" onClick={() => dispatch({ type: 'RESTART' })}>
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}
