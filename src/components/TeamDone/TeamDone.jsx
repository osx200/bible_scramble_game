import { useGame } from '../../context/GameContext.jsx'
import Button from '../shared/Button.jsx'
import styles from './TeamDone.module.css'

export default function TeamDone() {
  const { state, dispatch } = useGame()
  const { teams, currentTeamIndex, score, bestStreak, roundResults } = state

  const currentTeam = teams[currentTeamIndex]
  const nextTeam = teams[currentTeamIndex + 1]
  const correctCount = roundResults.filter((r) => r.correct).length

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.colorBar} style={{ backgroundColor: currentTeam.color }} />

        <div className={styles.header}>
          <h1 className={styles.teamName} style={{ color: currentTeam.color }}>
            {currentTeam.name} — Done!
          </h1>
          <p className={styles.subtitle}>Great effort! Here are your results.</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{score.toLocaleString()}</div>
            <div className={styles.statLabel}>Score</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{correctCount}/{roundResults.length}</div>
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
            <div key={i} className={`${styles.resultRow} ${r.correct ? styles.correct : styles.wrong}`}>
              <span className={styles.resultIcon}>{r.correct ? '✅' : '❌'}</span>
              <span className={styles.resultBook}>{r.book.name}</span>
              <span className={`${styles.resultPts} ${r.pointsEarned === 0 ? styles.zero : ''}`}>
                {r.correct ? `+${r.pointsEarned}` : '—'}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {nextTeam && (
          <div className={styles.nextInfo}>
            <p className={styles.nextLabel}>Up next:</p>
            <p className={styles.nextTeam} style={{ color: nextTeam.color }}>{nextTeam.name}</p>
          </div>
        )}

        <Button
          full
          size="lg"
          onClick={() => dispatch({ type: 'NEXT_TEAM' })}
          style={{ backgroundColor: nextTeam?.color ?? 'var(--color-primary)' }}
        >
          Hand Off to {nextTeam ? nextTeam.name : 'Next Team'} →
        </Button>
      </div>
    </div>
  )
}
