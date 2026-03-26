import { useGame } from '../../context/GameContext.jsx'
import Button from '../shared/Button.jsx'
import Confetti from '../Confetti/Confetti.jsx'
import styles from './TeamResults.module.css'

const RANK_EMOJIS = ['🥇', '🥈', '🥉']
const RANK_CLASSES = ['first', 'second', 'third']

export default function TeamResults() {
  const { state, dispatch } = useGame()
  const { teamStates, roundsPerTeam } = state

  const ranked = [...teamStates].sort((a, b) => b.score - a.score)
  const winner = ranked[0]
  const hasTie = ranked.length > 1 && ranked[0].score === ranked[1].score

  return (
    <>
      <Confetti count={150} />

      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={`${styles.emoji} ${styles.trophyAnim}`}>
              {hasTie ? '🤝' : '🏆'}
            </div>
            <h1 className={`${styles.title} ${styles.winnerPop}`}>
              {hasTie ? "It's a Tie!" : `${winner.name} Wins!`}
            </h1>
            <p className={styles.subtitle}>Final Leaderboard · {roundsPerTeam} rounds each</p>
          </div>

          <div className={styles.leaderboard}>
            {ranked.map((team, i) => {
              const rankClass = RANK_CLASSES[i] ?? ''
              const emoji = RANK_EMOJIS[i] ?? `${i + 1}.`
              const correctCount = team.roundResults.filter((r) => r.correct).length
              const isFirst = i === 0
              return (
                <div
                  key={team.teamId}
                  className={`${styles.teamRow} ${styles[rankClass]} ${isFirst && !hasTie ? styles.winnerRow : ''}`}
                  style={{ animationDelay: `${0.15 + i * 0.1}s` }}
                >
                  <span className={`${styles.rank} ${isFirst && !hasTie ? styles.rankSpin : ''}`}>
                    {emoji}
                  </span>
                  <div className={styles.colorBand} style={{ backgroundColor: team.color }} />
                  <div className={styles.teamInfo}>
                    <p className={styles.teamName}>{team.name}</p>
                    <p className={styles.teamSub}>
                      {correctCount}/{roundsPerTeam} correct &nbsp;·&nbsp; 🔥{team.bestStreak} streak
                    </p>
                  </div>
                  <span className={`${styles.teamScore} ${isFirst && !hasTie ? styles.winnerScore : ''}`}>
                    {team.score.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>

          {hasTie && (
            <p className={styles.tieNote}>Multiple teams tied — well played by everyone!</p>
          )}

          <div className={styles.divider} />

          <div className={styles.actions}>
            <Button full size="lg" onClick={() => dispatch({ type: 'REPLAY_TEAMS' })}>
              Play Again (Same Teams)
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
