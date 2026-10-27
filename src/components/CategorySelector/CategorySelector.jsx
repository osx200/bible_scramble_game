import { useGame, useWordSet } from '../../context/GameContext.jsx'
import styles from './CategorySelector.module.css'

export default function CategorySelector() {
  const { state, dispatch } = useGame()
  const wordSet = useWordSet()

  // Couples is too small to split by testament
  if (wordSet.categoryFilter === false) return null

  const OPTIONS = [
    { value: 'all', label: wordSet.allLabel },
    { value: 'OT',  label: wordSet.categories.OT },
    { value: 'NT',  label: wordSet.categories.NT },
  ]

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
