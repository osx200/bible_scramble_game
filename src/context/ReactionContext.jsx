import { createContext, useContext, useMemo } from 'react'
import { useReactions } from '../hooks/useReactions.js'
import ReactionOverlay from '../components/ReactionOverlay/ReactionOverlay.jsx'

/**
 * App-wide celebration reactions: one overlay at the root, triggerable from
 * any view (the floating picker, the moderator panel, or automatically on a
 * correct answer).
 *
 * Split in two so firing a reaction doesn't re-render every view that only
 * needs the trigger — the trigger value is stable for the app's lifetime.
 */
const ReactionTriggerContext = createContext({
  triggerReaction: () => {},
  triggerRandomReaction: () => {},
})
const ActiveReactionContext = createContext(null)

export function ReactionProvider({ children }) {
  const { reaction, triggerReaction, triggerRandomReaction } = useReactions()

  const triggers = useMemo(
    () => ({ triggerReaction, triggerRandomReaction }),
    [triggerReaction, triggerRandomReaction],
  )

  return (
    <ReactionTriggerContext.Provider value={triggers}>
      <ActiveReactionContext.Provider value={reaction}>
        {children}
        <ReactionOverlay reaction={reaction} />
      </ActiveReactionContext.Provider>
    </ReactionTriggerContext.Provider>
  )
}

/** `{ triggerReaction(type, { hold }), triggerRandomReaction({ hold }) }` */
export function useReactionTrigger() {
  return useContext(ReactionTriggerContext)
}

/** The reaction currently playing, or null — for picker highlighting. */
export function useActiveReaction() {
  return useContext(ActiveReactionContext)
}
