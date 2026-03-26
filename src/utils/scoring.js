/**
 * Timer durations and total rounds per difficulty.
 */
export const DIFFICULTY_CONFIG = {
  easy:   { maxTime: 45, totalRounds: 10, basePoints: 100 },
  medium: { maxTime: 30, totalRounds: 10, basePoints: 200 },
  hard:   { maxTime: 20, totalRounds: 10, basePoints: 300 },
}

/**
 * Calculate points earned for a correct answer.
 *
 * Formula:
 *   total = (basePoints + timeBonus - hintPenalty) × streakMultiplier
 *   timeBonus     = round((timeRemaining / maxTime) × 50)
 *   hintPenalty   = hintsUsed × 25
 *   streakMultiplier = min(2.0, 1.0 + streak × 0.1)
 *
 * Returns at least 0 (never negative).
 */
export function calculatePoints({ difficulty, timeRemaining, maxTime, hintsUsed, streak }) {
  const { basePoints } = DIFFICULTY_CONFIG[difficulty]
  const timeBonus = Math.round((timeRemaining / maxTime) * 50)
  const hintPenalty = hintsUsed * 25
  const streakMultiplier = Math.min(2.0, 1.0 + streak * 0.1)
  const total = Math.round((basePoints + timeBonus - hintPenalty) * streakMultiplier)
  return Math.max(0, total)
}
