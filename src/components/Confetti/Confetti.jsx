import { useMemo } from 'react'
import styles from './Confetti.module.css'

const COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF9F43', '#FF6B9D', '#00D2D3',
  '#FFC300', '#DAF7A6', '#FF5733', '#C0392B',
]

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
    return Array.from({ length: count }, (_, i) => {
      const isCircle = Math.random() > 0.6
      const w = rand(6, 14)
      const h = isCircle ? w : rand(8, 20)
      const dur = rand(2.8, 5.5)
      const delay = rand(0, 3.5)
      const rot0 = rand(0, 360)
      return {
        id: i,
        color: COLORS[randInt(0, COLORS.length - 1)],
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
