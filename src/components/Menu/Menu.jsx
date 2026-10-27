import { useState } from 'react'
import { useGame, useWordSet } from '../../context/GameContext.jsx'
import { useAppMode } from '../../context/AppModeContext.jsx'
import { usePlayer, brandName } from '../../context/PlayerContext.jsx'
import { WORD_SET_LIST } from '../../data/wordSets.js'
import Button from '../shared/Button.jsx'
import ModeSelector from '../ModeSelector/ModeSelector.jsx'
import DifficultySelector from '../DifficultySelector/DifficultySelector.jsx'
import CategorySelector from '../CategorySelector/CategorySelector.jsx'
import TimerAdjuster from '../TimerAdjuster/TimerAdjuster.jsx'
import Leaderboard from '../Leaderboard/Leaderboard.jsx'
import { WelcomeIntro, WelcomeFooter } from '../Welcome/WelcomeIntro.jsx'
import styles from './Menu.module.css'
import Stage from '../Stage/Stage.jsx'
import { WORD_SET_ART } from '../../data/art.js'

const MODES = [
  {
    id: 'scramble',
    title: 'Word Unscramble',
    desc: 'Unscramble books, prophets, disciples and Bible couples. Solo or teams, three difficulty levels.',
  },
  {
    id: 'recall',
    title: 'Book Recall',
    desc: 'Name as many books of the Bible as you can before the timer runs out.',
  },
  {
    id: 'moderator',
    title: 'Moderator View',
    desc: 'Host a live group session - reveal answers on demand with reactions.',
  },
  {
    id: 'quiz',
    title: 'Quiz & Scramble Builder',
    desc: 'Make your own quiz or word scramble, typed in or uploaded from Excel, and host it for your group.',
  },
]

export default function Menu() {
  const { state, dispatch } = useGame()
  const { setAppMode } = useAppMode()
  const { mode } = state
  const wordSet = useWordSet()
  const { profile, startEditing } = usePlayer()
  // null = app-mode grid | 'scramble' = pick a word set | 'setup' = game options
  // | 'leaderboard' = this month's boards | 'about' = purpose, disclaimer, contact
  const [selected, setSelected] = useState(null)

  function handleModeClick(id) {
    if (id === 'scramble') {
      setSelected('scramble')
    } else {
      setAppMode(id)
    }
  }

  function handleWordSetClick(id) {
    dispatch({ type: 'SET_WORD_SET', payload: id })
    setSelected('setup')
  }

  function handleStart() {
    if (mode === 'teams') {
      dispatch({ type: 'GO_TEAM_REGISTER' })
    } else {
      dispatch({ type: 'START_GAME' })
    }
  }

  // ── Word Unscramble: pick a word set ──────────────────────
  if (selected === 'scramble') {
    return (
      <Stage art="canaan">
        <div className={`${styles.card}`}>
          <div className={styles.header}>
            <h1 className={styles.title}>Word Unscramble</h1>
            <p className={styles.subtitle}>Choose what you want to unscramble</p>
          </div>

          <ul className={styles.modeList}>
            {WORD_SET_LIST.map((ws, i) => (
              <li key={ws.id}>
                <button
                  className={styles.modeRow}
                  style={{ '--i': i }}
                  onClick={() => handleWordSetClick(ws.id)}
                  type="button"
                >
                  <span className={styles.modeText}>
                    <span className={styles.modeTitle}>{ws.label}</span>
                    <span className={styles.modeDesc}>{ws.tileDesc}</span>
                  </span>
                  <span className={styles.modeArrow} aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>

          <button className={styles.backBtn} type="button" onClick={() => setSelected(null)}>
            ← Back to Menu
          </button>
        </div>
      </Stage>
    )
  }

  // ── Monthly leaderboard ───────────────────────────────────
  if (selected === 'leaderboard') {
    return (
      <Stage art="jonathan">
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Leaderboard</h1>
            <p className={styles.subtitle}>This month’s top 5 Word Unscramble scores</p>
          </div>

          <Leaderboard defaultBoard={profile.kind} highlightNames={[profile.name]} />

          <button className={styles.backBtn} type="button" onClick={() => setSelected(null)}>
            ← Back to Menu
          </button>
        </div>
      </Stage>
    )
  }

  // ── About / feedback ──────────────────────────────────────
  if (selected === 'about') {
    return (
      <Stage art="abraham">
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>About Bible Games</h1>
          </div>

          <WelcomeIntro />
          <WelcomeFooter />

          <button className={styles.backBtn} type="button" onClick={() => setSelected(null)}>
            ← Back to Menu
          </button>
        </div>
      </Stage>
    )
  }

  // ── Word Unscramble: game options ─────────────────────────
  if (selected === 'setup') {
    return (
      <Stage art={WORD_SET_ART[state.wordSet]}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Unscramble: {wordSet.label}</h1>
            <p className={styles.subtitle}>{wordSet.subtitle}</p>
          </div>

          <div className={styles.divider} />

          <ModeSelector />
          <DifficultySelector />
          <CategorySelector />
          <TimerAdjuster />

          <Button full size="lg" className={styles.startBtn} onClick={handleStart}>
            {mode === 'teams' ? '👥 Set Up Teams →' : 'Start Game'}
          </Button>

          <button className={styles.backBtn} type="button" onClick={() => setSelected('scramble')}>
            ← Back
          </button>
        </div>
      </Stage>
    )
  }

  return (
    <Stage art="sinai">
      <div className={`${styles.card}`}>
        <div className={styles.header}>
          {/* Print-style masthead: the player's name as the eyebrow */}
          <p className={styles.eyebrow}>{brandName(profile)}</p>
          <h1 className={`${styles.title} ${styles.masthead}`}>Bible Games</h1>
          <p className={styles.subtitle}>Welcome back! Choose a game to get started.</p>
          <button type="button" className={styles.playerChip} onClick={startEditing}>
            Playing as {profile.kind === 'group' ? 'a group' : 'an individual'}
            <span className={styles.playerChipAction}>Change</span>
          </button>
        </div>

        <ul className={styles.modeList}>
          {MODES.map((m, i) => (
            <li key={m.id}>
              <button
                className={styles.modeRow}
                style={{ '--i': i }}
                onClick={() => handleModeClick(m.id)}
                type="button"
              >
                <span className={styles.modeText}>
                  <span className={styles.modeTitle}>{m.title}</span>
                  <span className={styles.modeDesc}>{m.desc}</span>
                </span>
                <span className={styles.modeArrow} aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={`${styles.modeRow} ${styles.featured}`}
          style={{ '--i': MODES.length }}
          onClick={() => setSelected('leaderboard')}
        >
          <span className={styles.modeText}>
            <span className={styles.modeTitle}>Monthly Leaderboard</span>
            <span className={styles.modeDesc}>Top 5 players and groups. Resets on the 1st.</span>
          </span>
          <span className={styles.modeArrow} aria-hidden="true">→</span>
        </button>

        <button type="button" className={styles.aboutLink} onClick={() => setSelected('about')}>
          About and suggestions
        </button>
      </div>
    </Stage>
  )
}
