import styles from './StarBurst.module.css'

const COUNT = 10

// Same rationale as Confetti: draw from the live "Verdigris" tokens instead
// of an arbitrary rainbow so the celebration stays on-brand and theme-aware.
function getThemePalette() {
  if (typeof window === 'undefined') {
    return ['#B08A3E', '#D2B26E', '#7B2433', '#9A3444', '#7A5A1E']
  }
  const cs = getComputedStyle(document.documentElement)
  const pick = (name, fallback) => cs.getPropertyValue(name).trim() || fallback
  return [
    pick('--color-accent', '#B08A3E'),
    pick('--color-accent-light', '#D2B26E'),
    pick('--color-primary', '#7B2433'),
    pick('--color-primary-light', '#9A3444'),
    pick('--color-accent-dark', '#7A5A1E'),
  ]
}

export default function StarBurst() {
  const burstColors = getThemePalette()
  const stars = Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * 2 * Math.PI
    const dist = 55 + Math.random() * 35
    return {
      id: i,
      color: burstColors[i % burstColors.length],
      tx: Math.round(Math.cos(angle) * dist),
      ty: Math.round(Math.sin(angle) * dist),
      size: 6 + Math.random() * 8,
      dur: 0.55 + Math.random() * 0.25,
      delay: Math.random() * 0.1,
    }
  })

  return (
    <div className={styles.container} aria-hidden="true">
      {stars.map((s) => (
        <div
          key={s.id}
          className={styles.star}
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: s.color,
            '--tx': `${s.tx}px`,
            '--ty': `${s.ty}px`,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
