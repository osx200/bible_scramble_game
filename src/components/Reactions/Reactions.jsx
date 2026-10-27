import { useState, useEffect, useRef } from 'react'
import { useReactionTrigger, useActiveReaction } from '../../context/ReactionContext.jsx'
import { REACTIONS } from '../../data/reactions.js'
import styles from './Reactions.module.css'

/**
 * Floating reaction picker — the moderator console's reactions, available on
 * every other screen. Collapsed to a single button so it never competes with
 * the game UI; the overlay it fires (rendered by ReactionProvider) is
 * fixed-position with pointer-events off, so play continues underneath.
 */
export default function Reactions() {
  const { triggerReaction } = useReactionTrigger()
  const reaction = useActiveReaction()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  // Dismiss on outside click or Escape
  useEffect(() => {
    if (!open) return

    function handlePointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      {open && (
        <div className={styles.panel} role="group" aria-label="Reactions">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              type="button"
              className={`${styles.reactionBtn} ${reaction?.type === r.type ? styles.reactionBtnActive : ''}`}
              onClick={() => triggerReaction(r.type)}
              title={r.label}
              aria-label={r.label}
            >
              <span className={styles.emoji}>{r.emoji}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Hide reactions' : 'Show reactions'}
        title="Reactions"
      >
        {open ? '✕' : '🎉'}
      </button>
    </div>
  )
}
