import { useState } from 'react'
import { useGame, useWordSet } from '../../context/GameContext.jsx'
import { useAppMode } from '../../context/AppModeContext.jsx'
import { usePlayer, brandName } from '../../context/PlayerContext.jsx'
import { WORD_SET_LIST } from '../../data/wordSets.js'
import { SetupScreen, Field, ChoiceCards, MoreOptions } from '../Setup/Setup.jsx'
import { DIFFICULTY_CONFIG } from '../../utils/scoring.js'
import ModeSelector from '../ModeSelector/ModeSelector.jsx'
import DifficultySelector from '../DifficultySelector/DifficultySelector.jsx'
import CategorySelector from '../CategorySelector/CategorySelector.jsx'
import TimerAdjuster from '../TimerAdjuster/TimerAdjuster.jsx'
import Leaderboard from '../Leaderboard/Leaderboard.jsx'
import { WelcomeIntro, WelcomeFooter } from '../Welcome/WelcomeIntro.jsx'
import Privacy from '../Welcome/Privacy.jsx'
import styles from './Menu.module.css'
import Stage from '../Stage/Stage.jsx'
import { WORD_SET_ART } from '../../data/art.js'
import { track } from '../../utils/analytics.js'

// meta: the short facts under each card's description
// tone: the card's pigment (--pigment-* in variables.css)
const MODES = [
  {
    id: 'scramble',
    title: 'Word Unscramble',
    desc: 'Unscramble books, prophets, disciples and Bible couples against the clock.',
    meta: ['Solo or teams', '4 word sets', 'Leaderboard'],
    featured: true,
    tone: 'lapis',
  },
  {
    id: 'multiplayer',
    title: 'Play With Others',
    desc: 'Everyone joins on their own phone with a link or code.',
    meta: ['Live', 'Up to 50 players'],
    tone: 'vermilion',
  },
  {
    id: 'recall',
    title: 'Book Recall',
    desc: 'Name as many books of the Bible as you can before time runs out.',
    meta: ['Solo', 'Voice or typing'],
    tone: 'ochre',
  },
  {
    id: 'moderator',
    title: 'Moderator View',
    desc: 'Run a session on one big screen and reveal answers when ready.',
    meta: ['For leaders'],
    tone: 'plum',
  },
  {
    id: 'quiz',
    title: 'Quiz & Scramble Builder',
    desc: 'Make your own quiz or scramble, typed in or from Excel.',
    meta: ['Custom content'],
    tone: 'verdigris',
  },
]

export default function Menu() {
  const { state, dispatch } = useGame()
  const { setAppMode } = useAppMode()
  const { mode } = state
  const wordSet = useWordSet()
  const { profile, startEditing } = usePlayer()
  // null = app-mode grid | 'scramble' = word set + game options on one screen
  // | 'leaderboard' = this month's boards | 'about' = purpose, disclaimer, contact
  // | 'privacy' = what is stored and for how long
  const [selected, setSelected] = useState(null)

  function handleModeClick(id) {
    if (id === 'scramble') {
      track('mode_open', 'scramble')
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

  // ── Word Unscramble: one screen, word set + options ───────
  if (selected === 'scramble') {
    const seconds = state.customTime ?? DIFFICULTY_CONFIG[state.difficulty].maxTime
    const category = wordSet.categoryFilter !== false && state.category !== 'all' ? wordSet.categories[state.category] : null
    const summary = [
      wordSet.label,
      mode === 'teams' ? 'Teams' : 'Solo',
      state.difficulty[0].toUpperCase() + state.difficulty.slice(1),
      category,
      `${seconds}s a round`,
    ].filter(Boolean).join(' · ')
    const changed = (category ? 1 : 0) + (state.customTime != null ? 1 : 0)
    return (
      <Stage art={WORD_SET_ART[state.wordSet]}>
        <SetupScreen
          title="Word Unscramble"
          subtitle="Pick what to unscramble, then how you want to play."
          onBack={() => setSelected(null)}
          summary={summary}
          startLabel={mode === 'teams' ? 'Set up teams' : 'Start game'}
          onStart={handleStart}
        >
          <Field label="Unscramble">
            <ChoiceCards
              label="Word set"
              options={WORD_SET_LIST.map((ws) => ({ value: ws.id, title: ws.label, desc: ws.cardDesc }))}
              value={state.wordSet}
              onChange={(id) => dispatch({ type: 'SET_WORD_SET', payload: id })}
            />
          </Field>
          <ModeSelector />
          <DifficultySelector />
          <MoreOptions changed={changed}>
            <CategorySelector />
            <TimerAdjuster />
          </MoreOptions>
        </SetupScreen>
      </Stage>
    )
  }

  // ── Monthly leaderboard ───────────────────────────────────
  if (selected === 'leaderboard') {
    return (
      <Stage art="jonathan">
        <div className={styles.card}>
          <button className={styles.backLink} type="button" onClick={() => setSelected(null)}>
            <span aria-hidden="true">←</span> Menu
          </button>
          <div className={styles.header}>
            <h1 className={styles.title}>Leaderboard</h1>
            <p className={styles.subtitle}>This month’s top 5 Word Unscramble scores</p>
          </div>

          <Leaderboard defaultBoard={profile.kind} highlightNames={[profile.name]} />

        </div>
      </Stage>
    )
  }

  // ── About / feedback ──────────────────────────────────────
  if (selected === 'about') {
    return (
      <Stage art="abraham">
        <div className={styles.card}>
          <button className={styles.backLink} type="button" onClick={() => setSelected(null)}>
            <span aria-hidden="true">←</span> Menu
          </button>
          <div className={styles.header}>
            <h1 className={styles.title}>About Bible Games</h1>
          </div>

          <WelcomeIntro />
          <WelcomeFooter onPrivacy={() => setSelected('privacy')} />

        </div>
      </Stage>
    )
  }

  // ── Privacy ───────────────────────────────────────────────
  if (selected === 'privacy') {
    return (
      <Stage art="abraham">
        <div className={styles.card}>
          <button className={styles.backLink} type="button" onClick={() => setSelected(null)}>
            <span aria-hidden="true">←</span> Menu
          </button>
          <div className={styles.header}>
            <h1 className={styles.title}>Privacy</h1>
          </div>
          <Privacy />
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

        <ul className={styles.modeGrid}>
          {MODES.map((m, i) => (
            <li key={m.id} className={m.featured ? styles.wide : ''}>
              <button
                className={`${styles.modeCard} ${m.featured ? styles.featuredCard : ''}`}
                style={{ '--i': i, '--tone': `var(--pigment-${m.tone})` }}
                onClick={() => handleModeClick(m.id)}
                type="button"
              >
                <span className={styles.modeTitle}>{m.title}</span>
                <span className={styles.modeDesc}>{m.desc}</span>
                <span className={styles.modeMeta}>
                  {m.meta.map((x) => <span key={x}>{x}</span>)}
                </span>
                <span className={styles.modeArrow} aria-hidden="true">→</span>
              </button>
            </li>
          ))}
          <li className={styles.wide}>
            <button
              type="button"
              className={`${styles.modeCard} ${styles.boardCard}`}
              style={{ '--i': MODES.length }}
              onClick={() => setSelected('leaderboard')}
            >
              <span className={styles.modeTitle}>Monthly Leaderboard</span>
              <span className={styles.modeDesc}>Top 5 players and groups. Resets on the 1st.</span>
              <span className={styles.modeArrow} aria-hidden="true">→</span>
            </button>
          </li>
        </ul>

        <div className={styles.footerLinks}>
          <button type="button" className={styles.aboutLink} onClick={() => setSelected('about')}>
            About and suggestions
          </button>
          <button type="button" className={styles.aboutLink} onClick={() => setSelected('privacy')}>
            Privacy
          </button>
        </div>
      </div>
    </Stage>
  )
}
