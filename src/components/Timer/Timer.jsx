import { useGame } from '../../context/GameContext.jsx'
import styles from './Timer.module.css'

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function Timer() {
  const { state } = useGame()
  const { timeRemaining, maxTime } = state

  const progress = Math.max(0, timeRemaining / maxTime)
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const urgent = timeRemaining <= 10

  return (
    <div className={styles.wrapper}>
      <div className={styles.ring}>
        <svg className={styles.svg} viewBox="0 0 64 64">
          <circle className={styles.trackCircle} cx="32" cy="32" r={RADIUS} />
          <circle
            className={`${styles.progressCircle} ${urgent ? styles.urgent : ''}`}
            cx="32"
            cy="32"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className={`${styles.number} ${urgent ? styles.urgent : ''}`}>
          {timeRemaining}
        </span>
      </div>
      <span className={styles.label}>seconds</span>
    </div>
  )
}
