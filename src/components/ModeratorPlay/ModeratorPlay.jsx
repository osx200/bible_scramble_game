import { useState, useEffect, useRef } from 'react'
import styles from './ModeratorPlay.module.css'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}

export default function ModeratorPlay({ config, onBack }) {
  const { words, timerDuration } = config
  const total = words.length

  const [index,         setIndex]         = useState(0)
  const [showAnswer,    setShowAnswer]    = useState(false)
  const [running,       setRunning]       = useState(false)
  const [maxTime,       setMaxTime]       = useState(timerDuration)
  const [timeRemaining, setTimeRemaining] = useState(timerDuration)
  const intervalRef = useRef(null)

  const word    = words[index]
  const timeUp  = timeRemaining === 0
  const atStart = timeRemaining === maxTime && !running

  // ── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  // ── Controls ───────────────────────────────────────────────
  function handleStart() {
    if (timeUp) setTimeRemaining(maxTime)
    setRunning(true)
  }

  function handleStop() {
    setRunning(false)
    setTimeRemaining(maxTime)
  }

  function adjustTime(delta) {
    if (running) return
    const next = Math.max(10, Math.min(300, maxTime + delta))
    setMaxTime(next)
    setTimeRemaining(next)
  }

  // ── Navigation ─────────────────────────────────────────────
  function goTo(nextIndex) {
    clearInterval(intervalRef.current)
    setIndex(nextIndex)
    setShowAnswer(false)
    setRunning(false)
    setTimeRemaining(maxTime)
  }

  // ── Progress bar fill ──────────────────────────────────────
  const timerPct  = maxTime > 0 ? (timeRemaining / maxTime) * 100 : 100
  const timerLow  = timeRemaining <= 10 && timeRemaining > 0
  const timerDone = timeUp

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={onBack} type="button">← Setup</button>
          <span className={styles.progress}>
            Word <strong>{index + 1}</strong> / {total}
          </span>
          <div className={styles.spacer} />
        </div>

        {/* ── Scrambled word tile ── */}
        <div className={styles.scrambledTile}>
          <span className={styles.scrambledText}>{word.scrambled}</span>
        </div>

        {/* ── Answer + Timer row ── */}
        <div className={styles.midRow}>

          {/* Answer block */}
          <div className={styles.answerBlock}>
            <span className={styles.answerLabel}>CORRECT ANSWER</span>
            <div className={`${styles.answerTile} ${showAnswer ? styles.answerShown : styles.answerHidden}`}>
              {showAnswer ? word.name : <span className={styles.answerPlaceholder}>—</span>}
            </div>
          </div>

          {/* Timer block */}
          <div className={styles.timerBlock}>
            <button
              className={styles.timerAdj}
              onClick={() => adjustTime(-15)}
              disabled={running}
              type="button"
              title="−15s"
            >−</button>

            <div className={`${styles.timerTile} ${timerLow ? styles.timerLow : ''} ${timerDone ? styles.timerDone : ''}`}>
              <span className={styles.timerText}>{formatTime(timeRemaining)}</span>
              <div className={styles.timerBarTrack}>
                <div
                  className={styles.timerBarFill}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
            </div>

            <button
              className={styles.timerAdj}
              onClick={() => adjustTime(15)}
              disabled={running}
              type="button"
              title="+15s"
            >+</button>
          </div>

        </div>

        {/* ── Action buttons ── */}
        <div className={styles.controls}>
          <button
            className={`${styles.ctrlBtn} ${styles.btnReveal}`}
            onClick={() => setShowAnswer(true)}
            disabled={showAnswer}
            type="button"
          >
            SHOW<br />ANSWER
          </button>

          <button
            className={`${styles.ctrlBtn} ${styles.btnStart}`}
            onClick={handleStart}
            disabled={running}
            type="button"
          >
            START
          </button>

          <button
            className={`${styles.ctrlBtn} ${styles.btnStop}`}
            onClick={handleStop}
            disabled={atStart}
            type="button"
          >
            STOP
          </button>
        </div>

        {/* ── Navigation ── */}
        <div className={styles.navigation}>
          <button
            className={styles.navBtn}
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            type="button"
          >← Prev</button>

          <div className={styles.dots}>
            {words.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                onClick={() => goTo(i)}
                title={`Word ${i + 1}`}
              />
            ))}
          </div>

          <button
            className={styles.navBtn}
            onClick={() => goTo(index + 1)}
            disabled={index === total - 1}
            type="button"
          >Next →</button>
        </div>

      </div>
    </div>
  )
}
