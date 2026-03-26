import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import styles from './ScoreDisplay.module.css'

export default function ScoreDisplay() {
  const { state } = useGame()
  const { score, streak } = state
  const prevScore = useRef(score)
  const [bumping, setBumping] = useState(false)

  useEffect(() => {
    if (score !== prevScore.current) {
      setBumping(true)
      const t = setTimeout(() => setBumping(false), 450)
      prevScore.current = score
      return () => clearTimeout(t)
    }
  }, [score])

  return (
    <div className={styles.wrapper}>
      <div className={styles.block}>
        <span className={`${styles.value} ${bumping ? styles.bump : ''}`}>
          {score.toLocaleString()}
        </span>
        <span className={styles.label}>Score</span>
      </div>

      {streak >= 2 && (
        <>
          <div className={styles.divider} />
          <div className={styles.block}>
            <span className={`${styles.value} ${styles.streak}`}>
              <span className={styles.streakIcon}>🔥</span>
              {streak}
            </span>
            <span className={styles.label}>Streak</span>
          </div>
        </>
      )}
    </div>
  )
}
