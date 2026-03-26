import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useTimer } from '../../hooks/useTimer.js'
import ScrambledWord from '../ScrambledWord/ScrambledWord.jsx'
import AnswerInput from '../AnswerInput/AnswerInput.jsx'
import Timer from '../Timer/Timer.jsx'
import ScoreDisplay from '../ScoreDisplay/ScoreDisplay.jsx'
import HintPanel from '../HintPanel/HintPanel.jsx'
import RoundFeedback from '../RoundFeedback/RoundFeedback.jsx'
import styles from './GameBoard.module.css'

const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export default function GameBoard() {
  const { state, dispatch } = useGame()
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
    <div className={styles.wrapper}>
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
              <span className={styles.roundLabel}>Round</span>
              <span className={styles.roundNumber}>{displayRound} / {displayTotal}</span>
            </div>
            {paused && <span className={styles.pausedBadge}>⏸ Paused</span>}
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
              <span className={`${styles.badge} ${styles.easy}`} style={{ background: 'rgba(74,111,165,0.1)', color: 'var(--color-primary)' }}>
                {state.category === 'all' ? 'All Books' : state.category === 'OT' ? 'Old Testament' : 'New Testament'}
              </span>
            </div>
            {streak >= 2 && (
              <div>
                <p className={styles.sideLabel}>Streak</p>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
                  🔥 {streak}
                </span>
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
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            {!paused && (
              <button
                className={styles.skipBtn}
                onClick={() => dispatch({ type: 'SKIP_BOOK' })}
                disabled={!!visibleResult}
                title="Skip this book — counts as wrong answer"
              >
                ⏭ Skip
              </button>
            )}
            <button
              className={styles.stopBtn}
              onClick={() => dispatch({ type: 'RESTART' })}
              title={mode === 'teams' ? 'End tournament and return to menu' : 'Stop and return to menu'}
            >
              ⏹ {mode === 'teams' ? 'End Tournament' : 'Stop Game'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
