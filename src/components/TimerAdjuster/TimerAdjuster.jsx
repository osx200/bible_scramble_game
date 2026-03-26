import { useGame } from '../../context/GameContext.jsx'
import { DIFFICULTY_CONFIG } from '../../utils/scoring.js'
import styles from './TimerAdjuster.module.css'

const MIN = 5
const MAX = 120

export default function TimerAdjuster() {
  const { state, dispatch } = useGame()
  const { difficulty, customTime } = state

  const defaultTime = DIFFICULTY_CONFIG[difficulty].maxTime
  const currentTime = customTime ?? defaultTime
  const isCustom = customTime !== null && customTime !== defaultTime

  const progress = ((currentTime - MIN) / (MAX - MIN)) * 100

  function set(val) {
    const clamped = Math.min(MAX, Math.max(MIN, val))
    // If user returns to the default, clear the override
    dispatch({ type: 'SET_CUSTOM_TIME', payload: clamped === defaultTime ? null : clamped })
  }

  function handleSlider(e) {
    set(Number(e.target.value))
  }

  function reset() {
    dispatch({ type: 'SET_CUSTOM_TIME', payload: null })
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.label}>Seconds per Round</span>
        <div className={styles.valueDisplay}>
          <span className={styles.seconds}>{currentTime}</span>
          <span className={styles.unit}>sec</span>
        </div>
      </div>

      <div className={styles.sliderRow}>
        <button
          className={styles.stepBtn}
          onClick={() => set(currentTime - 5)}
          disabled={currentTime <= MIN}
          aria-label="Decrease timer"
        >
          −
        </button>

        <input
          type="range"
          className={styles.slider}
          min={MIN}
          max={MAX}
          step={5}
          value={currentTime}
          onChange={handleSlider}
          style={{ '--progress': `${progress}%` }}
          aria-label="Timer seconds"
        />

        <button
          className={styles.stepBtn}
          onClick={() => set(currentTime + 5)}
          disabled={currentTime >= MAX}
          aria-label="Increase timer"
        >
          +
        </button>
      </div>

      <div className={styles.rangeLabels}>
        <span className={styles.rangeLabel}>{MIN}s</span>
        <span className={styles.rangeLabel}>{MAX}s</span>
      </div>

      <p className={styles.default}>
        {isCustom ? (
          <>
            Default for {difficulty}: {defaultTime}s
            <button className={styles.resetBtn} onClick={reset}>reset</button>
          </>
        ) : (
          <>Using {difficulty} default ({defaultTime}s)</>
        )}
      </p>
    </div>
  )
}
