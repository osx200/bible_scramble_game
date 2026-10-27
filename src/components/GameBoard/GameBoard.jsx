import { useEffect, useRef, useState } from 'react'
import { useGame, useWordSet } from '../../context/GameContext.jsx'
import { useReactionTrigger } from '../../context/ReactionContext.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { useTimer } from '../../hooks/useTimer.js'
import ScrambledWord from '../ScrambledWord/ScrambledWord.jsx'
import AnswerInput from '../AnswerInput/AnswerInput.jsx'
import Timer from '../Timer/Timer.jsx'
import ScoreDisplay from '../ScoreDisplay/ScoreDisplay.jsx'
import HintPanel from '../HintPanel/HintPanel.jsx'
import RoundFeedback from '../RoundFeedback/RoundFeedback.jsx'
import styles from './GameBoard.module.css'
import Stage from '../Stage/Stage.jsx'

const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export default function GameBoard() {
  const { state, dispatch } = useGame()
  const wordSet = useWordSet()
  const { triggerRandomReaction } = useReactionTrigger()
  const { profile } = usePlayer()
  const { roundNumber, totalRounds, difficulty, lastResult, score, streak, mode, teams, teamStates, currentTeamIndex, roundsPerTeam, paused } = state
  const currentTeam = mode === 'teams' ? teams[currentTeamIndex] : null
  // In teams mode, show this team's round counter (1-based) and total rounds per team
  const displayRound = mode === 'teams' ? roundNumber : roundNumber
  const displayTotal = mode === 'teams' ? roundsPerTeam : totalRounds

  useTimer()

  const [visibleResult, setVisibleResult] = useState(null)
  const feedbackTimer = useRef(null)

  useEffect(() => {
    if (lastResult) {
      setVisibleResult(lastResult)
      // Celebrate a correct answer with a random reaction. The hold is short
      // so it clears with the feedback overlay instead of covering the next round.
      if (lastResult.correct) triggerRandomReaction({ hold: 1.1 })
      clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => {
        setVisibleResult(null)
        dispatch({ type: 'CLEAR_LAST_RESULT' })
      }, 1500)
    }
    return () => clearTimeout(feedbackTimer.current)
  }, [lastResult])

  function handleSubmit(answer) {
    if (visibleResult || paused) return
    dispatch({ type: 'SUBMIT_ANSWER', payload: { answer } })
  }

  const progress = ((roundNumber - 1) / totalRounds) * 100

  return (
    <Stage>
      <div className={styles.card}>
        {visibleResult && <RoundFeedback result={visibleResult} />}

        {/* ── Team banner (teams mode only) ── */}
        {currentTeam && (
          <div className={styles.teamBanner} style={{ backgroundColor: currentTeam.color }}>
            <span className={styles.teamBannerLabel}>Playing:</span>
            <span className={styles.teamBannerName}>{currentTeam.name}</span>
            <span className={styles.teamBannerPos}>Team {currentTeamIndex + 1} of {teams.length}</span>
          </div>
        )}

        {/* ── Top strip: round counter + progress bar ── */}
        <div className={styles.topStrip}>
          <div className={styles.topBar}>
            <div className={styles.roundInfo}>
              <span className={styles.roundLabel}>
                {/* Teams mode has its own banner naming who's up */}
                {!currentTeam && <span className={styles.playerTag}>{profile.name}</span>}
                Round
              </span>
              <span className={styles.roundNumber}>{displayRound} / {displayTotal}</span>
            </div>
            {paused && <span className={styles.pausedBadge}>Paused</span>}
            <ScoreDisplay />
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${progress}%`,
                backgroundColor: currentTeam ? currentTeam.color : undefined,
              }}
            />
          </div>
        </div>

        {/* ── 3-column body ── */}
        <div className={styles.body}>

          {/* Left sidebar */}
          <div className={styles.leftSidebar}>
            <div>
              <p className={styles.sideLabel}>Difficulty</p>
              <span className={`${styles.badge} ${styles[difficulty]}`}>
                {DIFFICULTY_LABELS[difficulty]}
              </span>
            </div>
            <div>
              <p className={styles.sideLabel}>Category</p>
              <span className={`${styles.badge} ${styles.category}`}>
                {state.category === 'all' || wordSet.categoryFilter === false ? wordSet.allLabel : wordSet.categories[state.category]}
              </span>
            </div>
            {streak >= 2 && (
              <div>
                <p className={styles.sideLabel}>Streak</p>
                <span className={styles.streakValue}>🔥 {streak}</span>
              </div>
            )}
          </div>

          {/* Center: main game area */}
          <div className={styles.center}>
            <ScrambledWord animKey={roundNumber} />
            <div className={styles.divider} />
            <AnswerInput roundKey={roundNumber} onSubmit={handleSubmit} disabled={paused || !!visibleResult} />
          </div>

          {/* Right sidebar */}
          <div className={styles.rightSidebar}>
            <Timer />
            <HintPanel />
            <button
              className={`${styles.pauseBtn} ${paused ? styles.pauseBtnActive : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            {!paused && (
              <button
                className={styles.skipBtn}
                onClick={() => dispatch({ type: 'SKIP_BOOK' })}
                disabled={!!visibleResult}
                title={`Skip this ${wordSet.noun} - counts as wrong answer`}
              >
                Skip
              </button>
            )}
            <button
              className={styles.stopBtn}
              onClick={() => dispatch({ type: 'RESTART' })}
              title={mode === 'teams' ? 'End tournament and return to menu' : 'Stop and return to menu'}
            >
              {mode === 'teams' ? 'End Tournament' : 'Stop Game'}
            </button>
          </div>

        </div>
      </div>
    </Stage>
  )
}
