import { CANONICAL_BOOKS, matchBookName } from '../data/canonicalBooks.js'
import { getWordSet, DEFAULT_WORD_SET } from '../data/wordSets.js'

/**
 * Turns what the speech engine heard into a name the game accepts, for
 * whichever word set is in play (Bible books or prophets).
 *
 * Speech recognition never returns clean answers: it writes numbers as words
 * ("first Samuel"), adds punctuation ("Genesis."), and mishears short names.
 * Submitting the raw transcript therefore fails almost every numbered book,
 * so every transcript goes through here first.
 */

// One vocabulary per word set, built on first use.
// For books, bibleBooks.js carries a few unnumbered forms ('Chronicles',
// 'Timothy', …) that canonicalBooks.js does not, so both lists feed it.
const VOCABULARIES = {}

function vocabularyFor(wordSetId) {
  if (VOCABULARIES[wordSetId]) return VOCABULARIES[wordSetId]

  const ws = getWordSet(wordSetId)
  const names = ws.id === 'books'
    ? [...ws.data.map(e => e.name), ...CANONICAL_BOOKS.map(b => b.name)]
    : ws.data.map(e => e.name)

  const map = new Map()
  names.forEach(name => map.set(name.toLowerCase(), name))
  VOCABULARIES[ws.id] = map
  return map
}

// Leading number words / ordinals → digit prefix
const NUMBER_WORDS = {
  one: '1', first: '1', '1st': '1', i: '1', won: '1',
  two: '2', second: '2', '2nd': '2', ii: '2', to: '2', too: '2',
  three: '3', third: '3', '3rd': '3', iii: '3',
}

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function cleanTranscript(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripPrefix(s, ws) {
  for (const p of ws.voicePrefixes) {
    // Never strip down to nothing ("the" alone stays as-is)
    if (s.startsWith(p) && s.length > p.length) return s.slice(p.length)
  }
  return s
}

/** "first samuel" → "1 samuel", "1st john" → "1 john" */
function digitsForWords(s) {
  const words = s.split(' ')
  if (words.length > 1 && NUMBER_WORDS[words[0]]) {
    words[0] = NUMBER_WORDS[words[0]]
    return words.join(' ')
  }
  return s
}

function levenshtein(a, b) {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const carry = prev[j]
      prev[j] = Math.min(
        prev[j] + 1,                                    // deletion
        prev[j - 1] + 1,                                // insertion
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),     // substitution
      )
      diagonal = carry
    }
  }
  return prev[b.length]
}

/** Splits "1 samuel" into ['1', 'samuel']; unnumbered names get an empty prefix. */
function splitNumber(s) {
  const m = /^([123])\s+(.*)$/.exec(s)
  return m ? [m[1], m[2]] : ['', s]
}

/**
 * Closest vocabulary entry within an edit-distance budget, or null.
 * The number prefix must match exactly — "1 Samuel" and "2 Samuel" are one
 * edit apart, and guessing between them would silently cost the player a round.
 */
function fuzzyMatch(input, ws) {
  const [inputNum, inputRest] = splitNumber(input)
  const budget = ws.fuzzyBudget(inputRest.length)
  if (budget === 0) return null

  let best = null
  let bestDistance = Infinity

  for (const [key, name] of vocabularyFor(ws.id)) {
    const [keyNum, keyRest] = splitNumber(key)
    if (keyNum !== inputNum) continue
    const distance = levenshtein(inputRest, keyRest)
    if (distance < bestDistance) {
      bestDistance = distance
      best = name
    }
  }

  return bestDistance <= budget ? best : null
}

/**
 * Resolve one transcript to a name from the given word set.
 * Returns { name, exact } when recognised, otherwise null.
 * `exact` is false for fuzzy hits, so callers can ask before auto-submitting.
 */
export function matchSpokenBook(transcript, wordSetId = DEFAULT_WORD_SET) {
  const ws = getWordSet(wordSetId)
  const stripped = stripPrefix(cleanTranscript(transcript), ws)
  // Only books are numbered — "too" → "2" would just mangle a prophet's name
  const cleaned = ws.numberedNames ? digitsForWords(stripped) : stripped
  if (!cleaned) return null

  const direct = vocabularyFor(ws.id).get(cleaned)
    ?? (ws.id === 'books' ? matchBookName(cleaned) : null)
  if (direct) return { name: direct, exact: true }

  const fuzzy = fuzzyMatch(cleaned, ws)
  return fuzzy ? { name: fuzzy, exact: false } : null
}

/**
 * Pick the best name out of the engine's ranked alternatives.
 * Prefers an exact hit from a lower-confidence alternative over a fuzzy hit
 * from the top one — "1st Samuel" beats a near-miss on "Samuel".
 * Falls back to the cleaned top transcript so the player can edit it.
 */
export function resolveSpokenAnswer(transcripts, wordSetId = DEFAULT_WORD_SET) {
  const list = (Array.isArray(transcripts) ? transcripts : [transcripts]).filter(Boolean)
  if (list.length === 0) return { text: '', matched: false, exact: false }

  let fuzzy = null
  for (const t of list) {
    const hit = matchSpokenBook(t, wordSetId)
    if (hit?.exact) return { text: hit.name, matched: true, exact: true }
    if (hit && !fuzzy) fuzzy = hit
  }
  if (fuzzy) return { text: fuzzy.name, matched: true, exact: false }

  return { text: cleanTranscript(list[0]), matched: false, exact: false }
}
