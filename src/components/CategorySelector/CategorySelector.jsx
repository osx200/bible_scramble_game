import { useGame } from '../../context/GameContext.jsx'
import styles from './CategorySelector.module.css'

const OPTIONS = [
  { value: 'all', label: 'All Books' },
  { value: 'OT',  label: 'Old Testament' },
  { value: 'NT',  label: 'New Testament' },
]

export default function CategorySelector() {
  const { state, dispatch } = useGame()

  return (
    <div className={styles.section}>
      <p className={styles.label}>Category</p>
      <div className={styles.group}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.option} ${state.category === opt.value ? styles.active : ''}`}
            onClick={() => dispatch({ type: 'SET_CATEGORY', payload: opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
