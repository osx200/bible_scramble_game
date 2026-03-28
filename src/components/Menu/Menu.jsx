import { useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useAppMode } from '../../context/AppModeContext.jsx'
import Button from '../shared/Button.jsx'
import ModeSelector from '../ModeSelector/ModeSelector.jsx'
import DifficultySelector from '../DifficultySelector/DifficultySelector.jsx'
import CategorySelector from '../CategorySelector/CategorySelector.jsx'
import TimerAdjuster from '../TimerAdjuster/TimerAdjuster.jsx'
import styles from './Menu.module.css'

const MODES = [
  {
    id: 'scramble',
    emoji: '🔤',
    title: 'Word Unscramble',
    desc: 'Unscramble the names of Bible books. Solo or team play with difficulty levels.',
  },
  {
    id: 'recall',
    emoji: '🧠',
    title: 'Book Recall',
    desc: 'Name as many books of the Bible as you can before the timer runs out.',
  },
  {
    id: 'moderator',
    emoji: '🎙',
    title: 'Moderator View',
    desc: 'Host a live group session — reveal answers on demand with reactions.',
  },
  {
    id: 'quiz',
    emoji: '❓',
    title: 'Quiz Builder',
    desc: 'Build a custom Q&A quiz and present it to your group with show-answer control.',
  },
]

export default function Menu() {
  const { state, dispatch } = useGame()
  const { setAppMode } = useAppMode()
  const { mode } = state
  const [selected, setSelected] = useState(null)

  function handleModeClick(id) {
    if (id === 'scramble') {
      setSelected('scramble')
    } else {
      setAppMode(id)
    }
  }

  function handleStart() {
    if (mode === 'teams') {
      dispatch({ type: 'GO_TEAM_REGISTER' })
    } else {
      dispatch({ type: 'START_GAME' })
    }
  }

  if (selected === 'scramble') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.emoji}>🔤</div>
            <h1 className={styles.title}>Word Unscramble</h1>
            <p className={styles.subtitle}>Unscramble the names of the 66 books of the Bible</p>
          </div>

          <div className={styles.divider} />

          <ModeSelector />
          <DifficultySelector />
          <CategorySelector />
          <TimerAdjuster />

          <Button full size="lg" className={styles.startBtn} onClick={handleStart}>
            {mode === 'teams' ? '👥 Set Up Teams →' : 'Start Game'}
          </Button>

          <button className={styles.backBtn} type="button" onClick={() => setSelected(null)}>
            ← Back to Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.card} ${styles.modePickerCard}`}>
        <div className={styles.header}>
          <div className={styles.emoji}>📖</div>
          <h1 className={styles.title}>MyRestStop Bible Games</h1>
          <p className={styles.subtitle}>Choose a game mode to get started</p>
        </div>

        <div className={styles.modeGrid}>
          {MODES.map(m => (
            <button
              key={m.id}
              className={styles.modeCard}
              onClick={() => handleModeClick(m.id)}
              type="button"
            >
              <span className={styles.modeEmoji}>{m.emoji}</span>
              <span className={styles.modeTitle}>{m.title}</span>
              <span className={styles.modeDesc}>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
