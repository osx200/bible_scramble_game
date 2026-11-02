import { useEffect, useState } from 'react'
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
// The plate on screen right now, kept across Stage mounts (every screen
// renders its own Stage), so the next screen can crossfade from it instead
// of fading in over a bare tint. null = no art showing (in-game layout).
let shownPlate = null // a plate's `file`

// artOverlay — optional content set over the bottom of the artwork (desktop
// only; phones show a short art band, so pages render it in the content too)
export default function Stage({ art, artOverlay, children, wide = false }) {
  const plate = art ? getArt(art) : null
  const key = plate ? plate.file : null // file names match the ART keys

  // { current, previous }: previous is whatever was showing before this plate
  // (from another screen on mount, or this Stage's own last plate when its
  // `art` changes, e.g. switching word sets). Adjusted during render, React's
  // pattern for state derived from a changing prop.
  const [pair, setPair] = useState(() => ({ current: key, previous: shownPlate }))
  if (pair.current !== key) setPair({ current: key, previous: pair.current })
  const previous = pair.previous && pair.previous !== key ? getArt(pair.previous) : null

  // Fades wait for the image: a plate that's still downloading would
  // otherwise fade in as a bare block of ink
  const [loaded, setLoaded] = useState(null)
  const ready = loaded === key

  useEffect(() => {
    shownPlate = key
  }, [key])

  if (!plate) {
    return (
      <div className={styles.play}>
        <div className={styles.playInner}>{children}</div>
      </div>
    )
  }

  const alt = `${plate.title} (${plate.ref}), engraving by Gustave Doré`
  // pair.previous === key: the same plate as the last screen, so no fade
  const crossfade = Boolean(previous)

  return (
    <div className={styles.stage}>
      {/* Nothing showing before (first load, or back from a game): the whole
          panel fades in from the page. Same plate as before: no motion. */}
      <figure className={`${styles.art} ${pair.previous ? '' : styles.artIn}`} data-ready={ready}>
        {/* Each plate is its own layer so the screen blend only ever mixes
            a plate with its ink, never with the plate underneath it */}
        {crossfade && (
          <div className={styles.plate} key={previous.file} aria-hidden="true">
            <img
              className={styles.artImg}
              src={previous.src}
              alt=""
              style={{ objectPosition: previous.focus }}
              decoding="async"
            />
          </div>
        )}
        <div
          className={`${styles.plate} ${crossfade ? styles.plateIn : ''}`}
          data-ready={ready}
          key={plate.file}
        >
          <img
            className={styles.artImg}
            src={plate.src}
            alt={alt}
            style={{ objectPosition: plate.focus }}
            decoding="async"
            fetchpriority="high"
            onLoad={() => setLoaded(plate.file)}
            onError={() => setLoaded(plate.file)}
          />
        </div>
        {artOverlay && <div className={styles.overlay}>{artOverlay}</div>}
      </figure>
      <main className={`${styles.content} ${wide ? styles.contentWide : ''}`}>{children}</main>
    </div>
  )
}
