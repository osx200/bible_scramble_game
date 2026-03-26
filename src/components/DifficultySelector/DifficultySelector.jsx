import { useGame } from '../../context/GameContext.jsx'
import styles from './DifficultySelector.module.css'

const OPTIONS = [
  { value: 'easy',   label: 'Easy',   colorClass: 'easy',   desc: '45s · Hints on' },
  { value: 'medium', label: 'Medium', colorClass: 'medium', desc: '30s · Some hints' },
  { value: 'hard',   label: 'Hard',   colorClass: 'hard',   desc: '20s · No hints' },
]

export default function DifficultySelector() {
  const { state, dispatch } = useGame()

  return (
    <div className={styles.section}>
      <p className={styles.label}>Difficulty</p>
      <div className={styles.group}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.option} ${state.difficulty === opt.value ? styles.active : ''}`}
            onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: opt.value })}
          >
            <span className={`${styles.dot} ${state.difficulty !== opt.value ? styles[opt.colorClass] : ''}`} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
