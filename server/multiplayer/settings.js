// Validation for everything a host sends when creating or editing a room.
// Returns { settings, payload } or { error }. Nothing from the browser is
// trusted: every field is whitelisted, typed and bounded here.
import { getMode } from './modes/index.js'

export const MP_MAX_PLAYERS = Number(process.env.MP_MAX_PLAYERS) || 50
const ROUND_CHOICES = [5, 10, 15, 20]
const DIFFICULTIES = ['easy', 'medium', 'hard']
const CATEGORIES = ['all', 'OT', 'NT']
const MAX_CUSTOM_ITEMS = 300

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '')
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback)
const int = (v, min, max, fallback) => (Number.isInteger(v) && v >= min && v <= max ? v : fallback)

export function validateSettings(input, { cleanName, isBlocked }) {
  if (!input || typeof input !== 'object') return { error: 'Missing settings' }
  const mode = getMode(input.mode)
  if (!mode) return { error: 'Unknown game mode' }

  const settings = {
    mode: mode.id,
    difficulty: DIFFICULTIES.includes(input.difficulty) ? input.difficulty : 'easy',
    category: CATEGORIES.includes(input.category) ? input.category : 'all',
    rounds: ROUND_CHOICES.includes(input.rounds) ? input.rounds : 10,
    seconds: int(input.seconds, 10, 120, 30),
    reveal: input.reveal === 'instant' ? 'instant' : 'round',
    speedBonus: bool(input.speedBonus, false),
    minPlayers: int(input.minPlayers, 1, 20, 2),
    hostPlays: bool(input.hostPlays, false),
    autoAdvance: bool(input.autoAdvance, true),
    // Race rounds: the first correct answer takes the points and ends the
    // round. A speed bonus means nothing there, and players must see a wrong
    // verdict straight away so they can guess again.
    firstCorrect: bool(input.firstCorrect, false),
    wordSet: null,
    teams: null,
  }
  if (settings.firstCorrect) {
    settings.speedBonus = false
    settings.reveal = 'instant'
  }

  if (mode.id === 'unscramble') {
    if (!mode.validWordSet(input.wordSet)) return { error: 'Unknown word set' }
    settings.wordSet = input.wordSet
  }

  if (input.teams != null) {
    if (!Array.isArray(input.teams) || input.teams.length < 2 || input.teams.length > 6) {
      return { error: 'Teams need 2 to 6 names' }
    }
    const names = input.teams.map((t) => cleanName(t))
    if (names.some((n) => !n)) return { error: 'Team names must be 2 to 24 characters' }
    if (names.some((n) => isBlocked(n))) return { error: 'Please choose different team names' }
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return { error: 'Team names must be different' }
    settings.teams = names.map((name, i) => ({ id: `t${i + 1}`, name }))
  }

  return { settings }
}

/**
 * Builder content for custom games. Session-only: the room keeps it in
 * memory and it is never written to SQLite or sent anywhere else.
 */
export function validatePayload(settings, input) {
  const payload = { words: [], questions: [] }
  if (settings.mode === 'unscramble' && settings.wordSet === 'custom') {
    const words = Array.isArray(input?.words) ? input.words.slice(0, MAX_CUSTOM_ITEMS) : []
    payload.words = words
      .map((w) => ({ name: str(w?.name, 30), clue: str(w?.clue, 120) }))
      .filter((w) => w.name.length >= 2 && /\p{L}.*\p{L}/u.test(w.name))
    if (!payload.words.length) return { error: 'Add some words in the Builder first' }
  }
  if (settings.mode === 'quiz') {
    const qs = Array.isArray(input?.questions) ? input.questions.slice(0, MAX_CUSTOM_ITEMS) : []
    payload.questions = qs
      .map((q) => ({ question: str(q?.question, 500), answer: str(q?.answer, 200), reference: str(q?.reference, 80) }))
      .filter((q) => q.question && q.answer)
    if (!payload.questions.length) return { error: 'Add some questions in the Builder first' }
  }
  return { payload }
}
