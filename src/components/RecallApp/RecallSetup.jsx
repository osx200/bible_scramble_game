import { useState } from 'react'
import { useAppMode } from '../../context/AppModeContext.jsx'
import styles from './RecallSetup.module.css'

const TIMERS = [
  { value: 60,  label: '1 min'  },
  { value: 120, label: '2 min'  },
  { value: 180, label: '3 min'  },
  { value: 300, label: '5 min'  },
]

const CATEGORIES = [
  { value: 'all', label: 'All 66 Books'         },
  { value: 'ot',  label: 'Old Testament (39)'   },
  { value: 'nt',  label: 'New Testament (27)'   },
]

export default function RecallSetup({ onStart }) {
  const { setAppMode } = useAppMode()
  const [timer,    setTimer]    = useState(180)
  const [category, setCategory] = useState('all')

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => setAppMode('scramble')} type="button">
            ← Back to Menu
          </button>
          <div className={styles.titleRow}>
            <span className={styles.emoji}>🧠</span>
            <h1 className={styles.title}>Bible Book Recall</h1>
          </div>
          <p className={styles.subtitle}>
            How many of the 66 books of the Bible can you name from memory?
          </p>
        </div>

        <div className={styles.divider} />

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

        <div className={styles.group}>
          <span className={styles.groupLabel}>Time Limit</span>
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

        <button
          className={styles.startBtn}
          type="button"
          onClick={() => onStart({ category, timerDuration: timer })}
        >
          Start Game →
        </button>

      </div>
    </div>
  )
}
