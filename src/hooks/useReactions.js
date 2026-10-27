import { useState, useRef, useEffect, useCallback } from 'react'
import { randomReactionType } from '../data/reactions.js'

// Seconds the overlay stays up before fading, when the caller doesn't say
const DEFAULT_HOLD = 3
// The overlay's fade-out takes 0.5s on top of the hold
const FADE_OUT = 0.5

/**
 * Fire-and-forget celebration reactions.
 * Returns the active reaction (pass it to <ReactionOverlay />) and triggers.
 * Re-triggering restarts the animation — the `key` forces a fresh mount.
 */
export function useReactions() {
  const [reaction, setReaction] = useState(null)
  const timerRef = useRef(null)
  const lastTypeRef = useRef(null)

  const triggerReaction = useCallback((type, { hold = DEFAULT_HOLD } = {}) => {
    clearTimeout(timerRef.current)
    lastTypeRef.current = type
    setReaction({ type, hold, key: Date.now() })
    timerRef.current = setTimeout(() => setReaction(null), (hold + FADE_OUT) * 1000)
  }, [])

  /** Celebrate without picking — used for automatic reactions on a correct answer. */
  const triggerRandomReaction = useCallback((options) => {
    triggerReaction(randomReactionType(lastTypeRef.current), options)
  }, [triggerReaction])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { reaction, triggerReaction, triggerRandomReaction }
}
