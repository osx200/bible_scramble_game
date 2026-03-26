import { useMemo } from 'react'
import Confetti from '../Confetti/Confetti.jsx'
import styles from './ReactionOverlay.module.css'

// Particles that float out from center in random directions
function Particles({ emoji, count = 10 }) {
  const particles = useMemo(() => (
    Array.from({ length: count }, (_, i) => {
      const angle  = (360 / count) * i + (Math.random() * 30 - 15)
      const dist   = 80 + Math.random() * 120
      const rad    = (angle * Math.PI) / 180
      const tx     = Math.cos(rad) * dist
      const ty     = Math.sin(rad) * dist
      const scale  = 0.5 + Math.random() * 0.6
      const delay  = Math.random() * 0.3
      const size   = 1.4 + Math.random() * 1.2
      return { i, tx, ty, scale, delay, size }
    })
  ), [count, emoji])

  return (
    <>
      {particles.map(p => (
        <span
          key={p.i}
          className={styles.particle}
          style={{
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            '--delay': `${p.delay}s`,
            fontSize: `${p.size}rem`,
          }}
        >
          {emoji}
        </span>
      ))}
    </>
  )
}

const REACTION_CONFIG = {
  confetti: { emoji: '🎉', label: 'Awesome!',   bg: 'rgba(107,63,160,0.18)',  showConfetti: true  },
  highfive: { emoji: '✋', label: 'High Five!',  bg: 'rgba(255,159,67,0.18)', showConfetti: false },
  fire:     { emoji: '🔥', label: 'On Fire!',    bg: 'rgba(198,40,40,0.18)',  showConfetti: false },
  applause: { emoji: '👏', label: 'Applause!',   bg: 'rgba(46,125,82,0.18)', showConfetti: false },
  star:     { emoji: '⭐', label: 'Amazing!',    bg: 'rgba(201,168,76,0.18)', showConfetti: false },
  trophy:   { emoji: '🏆', label: 'Winner!',     bg: 'rgba(201,168,76,0.22)', showConfetti: true  },
  love:     { emoji: '❤️', label: 'Love it!',    bg: 'rgba(220,50,80,0.18)', showConfetti: false },
  clown:    { emoji: '🎊', label: 'Party!',      bg: 'rgba(77,150,255,0.18)', showConfetti: true  },
}

export default function ReactionOverlay({ reaction }) {
  if (!reaction) return null

  const cfg = REACTION_CONFIG[reaction.type] ?? REACTION_CONFIG.confetti

  return (
    <div
      key={reaction.key}
      className={styles.overlay}
      style={{ '--bg': cfg.bg }}
      aria-hidden="true"
    >
      {cfg.showConfetti && <Confetti count={100} />}

      <div className={styles.center}>
        <div className={styles.particleWrap}>
          <Particles emoji={cfg.emoji} count={10} />
        </div>
        <span className={styles.mainEmoji}>{cfg.emoji}</span>
        <span className={styles.label}>{cfg.label}</span>
      </div>
    </div>
  )
}
