import { useGame } from '../../context/GameContext.jsx'
import styles from './Timer.module.css'

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function Timer() {
  const { state } = useGame()
  const { timeRemaining, maxTime } = state

  const progress = Math.max(0, timeRemaining / maxTime)
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  // Two-stage escalation, driven by remaining fraction (not a fixed second
  // count) so it scales sensibly across easy/medium/hard timers.
  const urgent = progress <= 0.22 || timeRemaining <= 6
  const warning = !urgent && (progress <= 0.5 || timeRemaining <= 15)
  const stage = urgent ? styles.urgent : warning ? styles.warning : ''

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.ring} ${urgent ? styles.ringUrgent : ''}`}>
        <svg className={styles.svg} viewBox="0 0 64 64">
          <circle className={styles.trackCircle} cx="32" cy="32" r={RADIUS} />
          <circle
            className={`${styles.progressCircle} ${stage}`}
            cx="32"
            cy="32"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className={`${styles.number} ${stage}`}>
          {timeRemaining}
        </span>
      </div>
      <span className={`${styles.label} ${stage}`}>
        {urgent ? "Hurry!" : 'seconds'}
      </span>
    </div>
  )
}
