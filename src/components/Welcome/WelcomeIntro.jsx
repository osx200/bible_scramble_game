import styles from './WelcomeIntro.module.css'

export const CONTACT_EMAIL = 'bible-games@proton.me'

/**
 * The anchor verse. `onArt` sets it in light type over the artwork panel
 * (the first-visit Welcome page, via Stage's artOverlay); otherwise it's a
 * card in the content column.
 */
export function Verse({ onArt = false, className = '' }) {
  return (
    <figure className={`${onArt ? styles.verseOnArt : styles.verse} ${className}`}>
      <blockquote className={styles.verseText}>
        And let us consider one another to provoke unto love and to good works: Not forsaking the
        assembling of ourselves together, as the manner of some is; but exhorting one another: and
        so much the more, as ye see the day approaching.
      </blockquote>
      <figcaption className={styles.verseRef}>Hebrews 10:24-25 (KJV)</figcaption>
    </figure>
  )
}

/**
 * Why the app exists, plus its anchor verse. Shown on a first visit and on
 * Menu's About view. `verseOnArt`: the page shows the verse on the artwork
 * instead, so here it only appears where the art is too small (phones).
 */
export function WelcomeIntro({ verseOnArt = false }) {
  return (
    <div className={styles.intro}>
      <p className={styles.purpose}>
        Bible Games helps keep fellowship meetings lively and engaging. It’s a fun way to learn the
        books, prophets and stories of Scripture together, while keeping our hearts and minds
        focused on God.
      </p>
      <Verse className={verseOnArt ? styles.phoneOnly : ''} />
    </div>
  )
}

/** Suggestions contact + disclaimer. Sits below the form / at the end of About. */
export function WelcomeFooter() {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Bible Games suggestion')}`

  return (
    <footer className={styles.footer}>
      <p className={styles.contact}>
        <span>
          Have an idea, or a game you’d like added? We’re open to suggestions:{' '}
          <a className={styles.contactLink} href={mailto}>
            {CONTACT_EMAIL}
          </a>
        </span>
      </p>

      <p className={styles.disclaimer}>
        <strong>Disclaimer:</strong> Bible Games is a free, independent resource for fellowship and
        personal study, and is not affiliated with any church or denomination. It is meant to
        support Bible reading, not replace it. Names you enter may appear on the public monthly
        leaderboard, so please avoid full names or personal details, especially for children.
        Scripture quoted from the King James Version (public domain).
      </p>
    </footer>
  )
}
