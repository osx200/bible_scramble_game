import { useMemo } from 'react'
import styles from './Confetti.module.css'

// Pull the confetti palette from the live design tokens rather than
// hardcoding hex values, so it stays on-brand ("Verdigris") and follows
// light/dark theme automatically instead of scattering rainbow neon.
function getThemePalette() {
  if (typeof window === 'undefined') {
    return ['#0D5A4E', '#158777', '#E0A116', '#F5C64F', '#2F7340', '#96690A']
  }
  const cs = getComputedStyle(document.documentElement)
  const pick = (name, fallback) => {
    const v = cs.getPropertyValue(name).trim()
    return v || fallback
  }
  return [
    pick('--color-primary', '#0D5A4E'),
    pick('--color-primary-light', '#158777'),
    pick('--color-accent', '#E0A116'),
    pick('--color-accent-light', '#F5C64F'),
    pick('--color-success', '#2F7340'),
    pick('--color-accent-dark', '#96690A'),
  ]
}

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1))
}

/**
 * Confetti shower — fixed overlay, pure CSS animation.
 * count: number of pieces (default 120)
 * active: render at all (default true)
 */
export default function Confetti({ count = 120, active = true }) {
  const pieces = useMemo(() => {
    const colors = getThemePalette()
    return Array.from({ length: count }, (_, i) => {
      const isCircle = Math.random() > 0.6
      const w = rand(6, 14)
      const h = isCircle ? w : rand(8, 20)
      const dur = rand(2.8, 5.5)
      const delay = rand(0, 3.5)
      const rot0 = rand(0, 360)
      return {
        id: i,
        color: colors[randInt(0, colors.length - 1)],
        isCircle,
        left: rand(0, 100),
        w,
        h,
        dur,
        delay,
        sway: rand(18, 70),
        rot0,
        rot1: rot0 + rand(100, 260),
        rot2: rot0 + rand(300, 500),
      }
    })
  }, [count])

  if (!active) return null

  return (
    <div className={styles.container} aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className={`${styles.piece} ${p.isCircle ? styles.circle : ''}`}
          style={{
            left: `${p.left}%`,
            width: `${p.w}px`,
            height: `${p.h}px`,
            backgroundColor: p.color,
            '--dur': `${p.dur}s`,
            '--delay': `${p.delay}s`,
            '--sway': `${p.sway}px`,
            '--rot0': `${p.rot0}deg`,
            '--rot1': `${p.rot1}deg`,
            '--rot2': `${p.rot2}deg`,
          }}
        />
      ))}
    </div>
  )
}
