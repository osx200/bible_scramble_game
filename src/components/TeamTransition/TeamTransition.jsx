import { useGame } from '../../context/GameContext.jsx'
import Button from '../shared/Button.jsx'
import styles from './TeamTransition.module.css'

export default function TeamTransition() {
  const { state, dispatch } = useGame()
  const { teams, teamStates, currentTeamIndex, roundsPerTeam, lastRoundResult } = state

  const currentTeamState = teamStates[currentTeamIndex]
  const currentTeam = teams[currentTeamIndex]
  const isFirstTurn = teamStates.every((ts) => ts.roundsPlayed === 0)

  // Sort a copy by score for the leaderboard, keep original indices
  const leaderboard = teamStates
    .map((ts, i) => ({ ...ts, originalIndex: i }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.colorBar} style={{ backgroundColor: currentTeam.color }} />

        {/* Last round result badge */}
        {lastRoundResult && (
          <div
            className={`${styles.lastResult} ${lastRoundResult.correct ? styles.correct : styles.wrong}`}
          >
            <span className={styles.lastResultTeam} style={{ color: lastRoundResult.teamColor }}>
              {lastRoundResult.teamName}
            </span>
            {lastRoundResult.correct ? (
              <span>✅ got <strong>{lastRoundResult.bookName}</strong> +{lastRoundResult.pointsEarned} pts</span>
            ) : (
              <span>❌ missed <strong>{lastRoundResult.bookName}</strong></span>
            )}
          </div>
        )}

        <p className={styles.teamNum}>
          Round {currentTeamState.roundsPlayed + 1} / {roundsPerTeam} &nbsp;·&nbsp;
          Team {currentTeamIndex + 1} of {teams.length}
        </p>
        <h1 className={styles.teamName} style={{ color: currentTeam.color }}>
          {currentTeam.name}
        </h1>
        <p className={styles.ready}>
          {isFirstTurn ? "Pass the device — it's your turn! 🎯" : 'Your turn! 🎯'}
        </p>

        {/* Live leaderboard */}
        <div className={styles.scoreBoard}>
          <p className={styles.scoreBoardTitle}>Live Standings</p>
          {leaderboard.map((ts, rank) => {
            const isActive = ts.originalIndex === currentTeamIndex
            const progressPct = (ts.roundsPlayed / roundsPerTeam) * 100
            return (
              <div key={ts.teamId} className={`${styles.scoreRow} ${isActive ? styles.activeRow : ''}`}>
                <span className={styles.rankNum}>{rank + 1}</span>
                <span className={styles.scoreDot} style={{ backgroundColor: ts.color }} />
                <div className={styles.scoreInfo}>
                  <div className={styles.scoreNameRow}>
                    <span className={styles.scoreName}>{ts.name}</span>
                    <span className={styles.scoreValue}>{ts.score.toLocaleString()}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progressPct}%`, backgroundColor: ts.color }}
                    />
                  </div>
                  <span className={styles.roundsLabel}>{ts.roundsPlayed}/{roundsPerTeam} rounds</span>
                </div>
              </div>
            )
          })}
        </div>

        <Button
          full
          size="lg"
          style={{ backgroundColor: currentTeam.color, border: 'none' }}
          onClick={() => dispatch({ type: 'START_TEAM_TURN' })}
        >
          We're Ready — Start Round {currentTeamState.roundsPlayed + 1}!
        </Button>
      </div>
    </div>
  )
}
