import { getArt } from '../../data/art.js'
import styles from './Stage.module.css'

/**
 * The full-screen layout every screen sits in.
 *
 *   art="sinai"   → split screen: a full-height Doré engraving (tinted lapis)
 *                   beside the content; on phones the art becomes a band on top
 *   art omitted   → full-width "play" layout for in-game screens, where the
 *                   artwork would only compete with the letters and timer
 *
 * Children are the screens' existing card markup. Stage neutralises the old
 * floating-card styling (max-width, background, shadow, radius) so each
 * screen only had to swap its outer wrapper for <Stage>.
 */
// artOverlay — optional content set over the bottom of the artwork (desktop
// only; phones show a short art band, so pages render it in the content too)
export default function Stage({ art, artOverlay, children, wide = false }) {
  const plate = art ? getArt(art) : null

  if (!plate) {
    return (
      <div className={styles.play}>
        <div className={styles.playInner}>{children}</div>
      </div>
    )
  }

  return (
    <div className={styles.stage}>
      <figure className={styles.art} key={plate.file}>
        <img
          className={styles.artImg}
          src={plate.src}
          alt={`${plate.title} (${plate.ref}), engraving by Gustave Doré`}
          style={{ objectPosition: plate.focus }}
          decoding="async"
          fetchpriority="high"
        />
        {artOverlay && <div className={styles.overlay}>{artOverlay}</div>}
      </figure>
      <main className={`${styles.content} ${wide ? styles.contentWide : ''}`}>{children}</main>
    </div>
  )
}
