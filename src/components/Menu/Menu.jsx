import { useGame } from '../../context/GameContext.jsx'
import { useAppMode } from '../../context/AppModeContext.jsx'
import Button from '../shared/Button.jsx'
import ModeSelector from '../ModeSelector/ModeSelector.jsx'
import DifficultySelector from '../DifficultySelector/DifficultySelector.jsx'
import CategorySelector from '../CategorySelector/CategorySelector.jsx'
import TimerAdjuster from '../TimerAdjuster/TimerAdjuster.jsx'
import styles from './Menu.module.css'

export default function Menu() {
  const { state, dispatch } = useGame()
  const { setAppMode } = useAppMode()
  const { mode } = state

  function handleStart() {
    if (mode === 'teams') {
      dispatch({ type: 'GO_TEAM_REGISTER' })
    } else {
      dispatch({ type: 'START_GAME' })
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.emoji}>📖</div>
          <h1 className={styles.title}>MyRestStop Unscramble Game</h1>
          <p className={styles.subtitle}>
            Unscramble the names of the 66 books of the Bible
          </p>
        </div>

        <div className={styles.divider} />

        <ModeSelector />
        <DifficultySelector />
        <CategorySelector />
        <TimerAdjuster />

        <Button
          full
          size="lg"
          className={styles.startBtn}
          onClick={handleStart}
        >
          {mode === 'teams' ? '👥 Set Up Teams →' : 'Start Game'}
        </Button>

        <div className={styles.orDivider}>
          <span>or</span>
        </div>

        <div className={styles.altLinks}>
          <button className={styles.altLink} onClick={() => setAppMode('quiz')}>
            ❓ Bible Quiz Builder
          </button>
          <button className={styles.altLink} onClick={() => setAppMode('moderator')}>
            🎙 Moderator View
          </button>
        </div>

        <p className={styles.footer}>10 rounds per game · New selection every time</p>
      </div>
    </div>
  )
}
