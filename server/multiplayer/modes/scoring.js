// Multiplayer scoring — kept apart from the single-device game logic, but
// built on the same flat rule (src/utils/scoring.js): +20 for a correct
// answer, -2 for a wrong or missing one. The server alone runs this.
import { POINTS_CORRECT, POINTS_INCORRECT } from '../../../src/utils/scoring.js'

export const SPEED_BONUS_MAX = 10

/**
 * verdict: 'correct' | 'wrong' | 'none' (no answer before the round closed)
 * answeredAt / deadline / roundMs: server timestamps — never client-supplied.
 */
/**
 * "First correct answer wins" rounds. Every wrong guess costs -2 (players may
 * retry). The winner adds +20. Silence costs nothing when someone won (the
 * round was cut short), and the usual -2 when the timer ran out on everyone.
 */
export function racePoints({ isWinner, wrongs, answered, hasWinner }) {
  const penalty = wrongs * POINTS_INCORRECT
  if (isWinner) return POINTS_CORRECT + penalty
  if (!answered) return hasWinner ? 0 : POINTS_INCORRECT
  return penalty
}

export function pointsFor(verdict, { speedBonus = false, answeredAt = 0, deadline = 0, roundMs = 1 } = {}) {
  if (verdict !== 'correct') return POINTS_INCORRECT
  if (!speedBonus) return POINTS_CORRECT
  const left = Math.min(Math.max((deadline - answeredAt) / roundMs, 0), 1)
  return POINTS_CORRECT + Math.round(SPEED_BONUS_MAX * left)
}
