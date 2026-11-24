// The game-mode registry: everything mode-specific in multiplayer goes
// through this interface, so rooms, lobby, timers, scoring and reconnection
// are shared by every game.
//
//   prepare(settings, payload) → rounds[]       server-only round data (with answers)
//   publicRound(round)         → object          safe to send before the reveal
//   judge(round, text)         → 'correct' | 'wrong' | 'pending' (host decides)
//   reveal(round)              → { answer, reference }
//   describe(settings)         → short label for the lobby
//
// Adding a game (Bible Trivia, the Christmas games…) means adding a module
// here — not new multiplayer infrastructure.
import { unscramble } from './unscramble.js'
import { quiz } from './quiz.js'
import { recall } from './recall.js'

// `multi: true` (Book Recall) = one long round where each player answers many
// times; rooms.js handles it with recallAnswer() and judgeBook() instead of judge().
export const MODES = { unscramble, quiz, recall }

export const getMode = (id) => MODES[id] ?? null
