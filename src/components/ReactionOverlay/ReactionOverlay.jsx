import { useMemo } from 'react'
import Confetti from '../Confetti/Confetti.jsx'
import { REACTION_CONFIG } from '../../data/reactions.js'
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

export default function ReactionOverlay({ reaction }) {
  if (!reaction) return null

  const cfg = REACTION_CONFIG[reaction.type] ?? REACTION_CONFIG.confetti

  return (
    <div
      key={reaction.key}
      className={styles.overlay}
      // hold = seconds on screen before fading; auto-fired reactions use a
      // short hold so they clear before the next round starts
      style={{ '--bg': cfg.bg, '--hold': `${reaction.hold ?? 3}s` }}
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
