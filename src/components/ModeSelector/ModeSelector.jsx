import { useGame } from '../../context/GameContext.jsx'
import styles from './ModeSelector.module.css'

export default function ModeSelector() {
  const { state, dispatch } = useGame()
  const { mode } = state

  return (
    <div className={styles.section}>
      <p className={styles.label}>Game Mode</p>
      <div className={styles.group}>
        <button
          className={`${styles.option} ${mode === 'solo' ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_MODE', payload: 'solo' })}
        >
          Solo
        </button>
        <button
          className={`${styles.option} ${mode === 'teams' ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_MODE', payload: 'teams' })}
        >
          Teams
        </button>
      </div>
    </div>
  )
}
