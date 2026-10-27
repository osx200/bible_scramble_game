import { useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useReactionTrigger } from '../../context/ReactionContext.jsx'
import { WINNER_REACTION } from '../../data/reactions.js'
import Button from '../shared/Button.jsx'
import Confetti from '../Confetti/Confetti.jsx'
import EndScreenLeaderboard from '../Leaderboard/EndScreenLeaderboard.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'
import useLeaderboardSubmit from '../../hooks/useLeaderboardSubmit.js'
import styles from './GameOver.module.css'
import Stage from '../Stage/Stage.jsx'

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
  const { score, bestStreak, roundResults, difficulty, wordSet } = state
  const { profile } = usePlayer()

  const correctCount = roundResults.filter((r) => r.correct).length
  const total = roundResults.length

  // Solo games file under the player's own board — a group playing solo
  // lands on Top Groups
  const submission = useLeaderboardSubmit(() =>
    total > 0
      ? [{ board: profile.kind, name: profile.name, score, correct: correctCount, total, difficulty, wordSet }]
      : [],
  )
  const rating = getRating(correctCount, total)
  const celebrate = correctCount / total >= 0.8
  // Solo has no opponent, so a perfect score is the win — the same bar the
  // rating already uses for its 🏆
  const perfect = total > 0 && correctCount === total

  const { triggerReaction } = useReactionTrigger()
  useEffect(() => {
    if (perfect) triggerReaction(WINNER_REACTION)
  }, [perfect, triggerReaction])

  return (
    <>
      <Confetti count={celebrate ? 130 : 0} active={celebrate} />
    <Stage art="dove">
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={`${styles.emoji} ${celebrate ? styles.trophyAnim : ''}`}>{rating.emoji}</div>
          <h1 className={`${styles.title} ${celebrate ? styles.winnerPop : ''}`}>Game Over!</h1>
          <p className={styles.subtitle}>
            {rating.text} {correctCount > 0 ? 'Well done' : 'Thanks for playing'},{' '}
            <strong className={styles.playerName}>{profile.name}</strong>!
          </p>
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
              <span className={styles.resultBook}>{r.book.pair ?? r.book.name}</span>
              {r.timeUsed !== undefined && (
                <span className={styles.resultTime}>{r.timeUsed}s</span>
              )}
              <span className={`${styles.resultPts} ${r.correct ? '' : styles.zero}`}>
                {r.correct ? `+${r.pointsEarned}` : r.pointsEarned}
              </span>
            </div>
          ))}
        </div>

        <EndScreenLeaderboard
          submission={submission}
          solo
          defaultBoard={profile.kind}
          highlightNames={[profile.name]}
        />

        <div className={styles.actions}>
          <Button full size="lg" onClick={() => dispatch({ type: 'START_GAME' })}>
            Play Again
          </Button>
          <Button full variant="ghost" onClick={() => dispatch({ type: 'RESTART' })}>
            Back to Menu
          </Button>
        </div>
      </div>
    </Stage>
    </>
  )
}
