/**
 * Flat scoring: every correct answer is worth the same, every miss costs the
 * same. Difficulty changes how long you get, not what a round is worth, and
 * hints are free — a correct answer is always POINTS_CORRECT.
 */
export const POINTS_CORRECT = 20
export const POINTS_INCORRECT = -2

/**
 * Timer durations and total rounds per difficulty.
 */
export const DIFFICULTY_CONFIG = {
  easy:   { maxTime: 45, totalRounds: 10 },
  medium: { maxTime: 30, totalRounds: 10 },
  hard:   { maxTime: 20, totalRounds: 10 },
}

/**
 * Points for a round. A miss is a miss — wrong answer, timeout, or skip all
 * cost the same, and the running total is allowed to go negative.
 */
export function pointsFor(correct) {
  return correct ? POINTS_CORRECT : POINTS_INCORRECT
}
