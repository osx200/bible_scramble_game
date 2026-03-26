import { useState } from 'react'
import { useAppMode } from '../../context/AppModeContext.jsx'
import styles from './ModeratorSetup.module.css'

const CATEGORIES   = [{ value: 'all', label: 'All Books' }, { value: 'ot', label: 'Old Testament' }, { value: 'nt', label: 'New Testament' }]
const DIFFICULTIES = [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]
const COUNTS       = [5, 10, 15, 20]
const TIMERS       = [{ value: 15, label: '15 s' }, { value: 30, label: '30 s' }, { value: 45, label: '45 s' }, { value: 60, label: '1 min' }, { value: 90, label: '90 s' }]

export default function ModeratorSetup({ onStart }) {
  const { setAppMode } = useAppMode()
  const [category,   setCategory]   = useState('all')
  const [difficulty, setDifficulty] = useState('easy')
  const [count,      setCount]      = useState(10)
  const [timer,      setTimer]      = useState(30)

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => setAppMode('scramble')} type="button">
            ← Back to Menu
          </button>
          <div className={styles.titleRow}>
            <span className={styles.emoji}>🎙</span>
            <h1 className={styles.title}>Moderator View</h1>
          </div>
          <p className={styles.subtitle}>
            Display scrambled words for your group — reveal answers when ready
          </p>
        </div>

        <div className={styles.divider} />

        {/* Category */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Category</span>
          <div className={styles.pills}>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                className={`${styles.pill} ${category === c.value ? styles.pillActive : ''}`}
                onClick={() => setCategory(c.value)}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Difficulty</span>
          <div className={styles.pills}>
            {DIFFICULTIES.map(d => (
              <button
                key={d.value}
                type="button"
                className={`${styles.pill} ${difficulty === d.value ? styles.pillActive : ''}`}
                onClick={() => setDifficulty(d.value)}
              >{d.label}</button>
            ))}
          </div>
        </div>

        {/* Word count */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Number of Words</span>
          <div className={styles.pills}>
            {COUNTS.map(n => (
              <button
                key={n}
                type="button"
                className={`${styles.pill} ${count === n ? styles.pillActive : ''}`}
                onClick={() => setCount(n)}
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Timer per Word</span>
          <div className={styles.pills}>
            {TIMERS.map(t => (
              <button
                key={t.value}
                type="button"
                className={`${styles.pill} ${timer === t.value ? styles.pillActive : ''}`}
                onClick={() => setTimer(t.value)}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <div className={styles.divider} />

        <button className={styles.startBtn} onClick={() => onStart({ category, difficulty, count, timerDuration: timer })} type="button">
          Start Game →
        </button>

      </div>
    </div>
  )
}
