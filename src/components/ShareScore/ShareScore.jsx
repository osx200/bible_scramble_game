import { useEffect, useRef, useState } from 'react'
import { track } from '../../utils/analytics.js'
import styles from './ShareScore.module.css'

/** The site's front page, without /join/CODE or any other path */
export function siteLink() {
  return `${window.location.origin}/`
}

/** Clipboard API where allowed (https / localhost), else the old textarea trick (plain-HTTP LAN) */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the fallback
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

/**
 * "Share your score" on every end screen. `message` is the sentence to share
 * (the link back to the site is added here); `game` is the analytics key
 * (gameKey() in utils/analytics.js). Rendering it also counts the finished
 * game, once.
 */
export default function ShareScore({ message, game }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('') // '' | 'copied' | 'failed'
  const counted = useRef(false)
  const text = `${message} ${siteLink()}`
  const canShare = typeof navigator.share === 'function'

  useEffect(() => {
    if (counted.current) return
    counted.current = true
    track('game_finish', game)
  }, [game])

  async function share() {
    try {
      await navigator.share({ title: 'Bible Games', text: message, url: siteLink() })
      track('share', game)
    } catch {
      // Cancelled, or the share sheet failed: Copy is right there
    }
  }

  async function copy() {
    const ok = await copyText(text)
    setStatus(ok ? 'copied' : 'failed')
    if (ok) track('share', game)
  }

  if (!open) {
    return (
      <button type="button" className={styles.toggle} onClick={() => setOpen(true)}>
        Share your score
      </button>
    )
  }

  return (
    <section className={styles.panel} aria-label="Share your score">
      <p className={styles.heading}>Share your score</p>
      <p className={styles.preview}>{text}</p>
      <div className={styles.actions}>
        {canShare && <button type="button" className={styles.primary} onClick={share}>Share…</button>}
        <button type="button" className={canShare ? styles.secondary : styles.primary} onClick={copy}>
          {status === 'copied' ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className={styles.close} onClick={() => { setOpen(false); setStatus('') }}>
          Close
        </button>
      </div>
      <p className={styles.status} aria-live="polite">
        {status === 'copied' ? 'Copied. Paste it into a message or post.' : status === 'failed' ? 'Could not copy here. Select the text above instead.' : ''}
      </p>
    </section>
  )
}
