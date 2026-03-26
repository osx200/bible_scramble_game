import styles from './StarBurst.module.css'

const BURST_COLORS = ['#FFD93D', '#FF6B6B', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F43']
const COUNT = 10

export default function StarBurst() {
  const stars = Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * 2 * Math.PI
    const dist = 55 + Math.random() * 35
    return {
      id: i,
      color: BURST_COLORS[i % BURST_COLORS.length],
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
