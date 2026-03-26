import StarBurst from '../StarBurst/StarBurst.jsx'
import styles from './RoundFeedback.module.css'

export default function RoundFeedback({ result }) {
  if (!result) return null
  const { correct, pointsEarned, bookName } = result

  return (
    <div className={styles.overlay}>
      <div className={`${styles.card} ${correct ? styles.correct : styles.wrong}`}>
        {correct && <StarBurst />}
        <span className={`${styles.icon} ${correct ? styles.iconBounce : ''}`}>
          {correct ? '✅' : '❌'}
        </span>
        <p className={styles.message}>{correct ? 'Correct!' : 'Not quite!'}</p>
        {correct ? (
          <p className={styles.points}>+{pointsEarned} pts</p>
        ) : (
          <p className={styles.answer}>
            The answer was: <strong>{bookName}</strong>
          </p>
        )}
      </div>
    </div>
  )
}
