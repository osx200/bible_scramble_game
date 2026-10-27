/**
 * Celebration reactions — one source of truth for the overlay, the floating
 * picker, and the moderator console's inline panel.
 *
 * bg values are CSS var() expressions consumed directly by the overlay's
 * inline custom property -- no hardcoded colors, everything resolves
 * through design tokens.
 */
export const REACTION_CONFIG = {
  confetti: { emoji: '🎉', label: 'Awesome!',   bg: 'var(--color-primary-tint-strong)', showConfetti: true  },
  highfive: { emoji: '✋', label: 'High Five!', bg: 'var(--color-accent-tint)',         showConfetti: false },
  fire:     { emoji: '🔥', label: 'On Fire!',   bg: 'color-mix(in srgb, var(--color-danger) 18%, transparent)', showConfetti: false },
  applause: { emoji: '👏', label: 'Applause!',  bg: 'color-mix(in srgb, var(--color-success) 18%, transparent)', showConfetti: false },
  star:     { emoji: '⭐', label: 'Amazing!',   bg: 'var(--color-accent-tint)',         showConfetti: false },
  trophy:   { emoji: '🏆', label: 'Winner!',    bg: 'color-mix(in srgb, var(--color-accent) 22%, transparent)', showConfetti: true  },
  love:     { emoji: '❤️', label: 'Love it!',   bg: 'color-mix(in srgb, var(--color-danger) 18%, transparent)', showConfetti: false },
  clown:    { emoji: '🎊', label: 'Party!',     bg: 'var(--color-primary-tint-strong)', showConfetti: true  },
}

/**
 * The picker's buttons, in display order.
 * `reserved` keeps a reaction out of the random pool — the trophy is the
 * end-of-game winner celebration, so it must not turn up on a routine
 * correct answer. It stays available to press by hand.
 */
export const REACTIONS = [
  { type: 'confetti', emoji: '🎉', label: 'Confetti'  },
  { type: 'trophy',   emoji: '🏆', label: 'Winner', reserved: true },
  { type: 'highfive', emoji: '✋', label: 'High Five' },
  { type: 'applause', emoji: '👏', label: 'Applause'  },
  { type: 'fire',     emoji: '🔥', label: 'On Fire'   },
  { type: 'star',     emoji: '⭐', label: 'Amazing'   },
  { type: 'love',     emoji: '❤️', label: 'Love It'   },
  { type: 'clown',    emoji: '🎊', label: 'Party'     },
]

// Everything except the reserved ones — this is what auto-reactions draw from
const AUTO_TYPES = REACTIONS.filter((r) => !r.reserved).map((r) => r.type)

/** The reaction reserved for winning a game. */
export const WINNER_REACTION = 'trophy'

/**
 * A random reaction type, never repeating the one just shown — back-to-back
 * duplicates read as a bug rather than a celebration.
 */
export function randomReactionType(previousType) {
  const pool = AUTO_TYPES.length > 1
    ? AUTO_TYPES.filter((t) => t !== previousType)
    : AUTO_TYPES
  return pool[Math.floor(Math.random() * pool.length)]
}
