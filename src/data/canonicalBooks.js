import { levenshtein } from '../utils/levenshtein.js'

/**
 * The 66 canonical books of the Bible in order.
 * Separate from bibleBooks.js (which has 69 entries for the scramble game
 * and is missing Jeremiah). This file is the source of truth for the Recall mode.
 */
export const CANONICAL_BOOKS = [
  // ── Old Testament (39) ──────────────────────────────────────
  { name: 'Genesis',         testament: 'OT' },
  { name: 'Exodus',          testament: 'OT' },
  { name: 'Leviticus',       testament: 'OT' },
  { name: 'Numbers',         testament: 'OT' },
  { name: 'Deuteronomy',     testament: 'OT' },
  { name: 'Joshua',          testament: 'OT' },
  { name: 'Judges',          testament: 'OT' },
  { name: 'Ruth',            testament: 'OT' },
  { name: '1 Samuel',        testament: 'OT' },
  { name: '2 Samuel',        testament: 'OT' },
  { name: '1 Kings',         testament: 'OT' },
  { name: '2 Kings',         testament: 'OT' },
  { name: '1 Chronicles',    testament: 'OT' },
  { name: '2 Chronicles',    testament: 'OT' },
  { name: 'Ezra',            testament: 'OT' },
  { name: 'Nehemiah',        testament: 'OT' },
  { name: 'Esther',          testament: 'OT' },
  { name: 'Job',             testament: 'OT' },
  { name: 'Psalms',          testament: 'OT' },
  { name: 'Proverbs',        testament: 'OT' },
  { name: 'Ecclesiastes',    testament: 'OT' },
  { name: 'Song of Solomon', testament: 'OT' },
  { name: 'Isaiah',          testament: 'OT' },
  { name: 'Jeremiah',        testament: 'OT' },
  { name: 'Lamentations',    testament: 'OT' },
  { name: 'Ezekiel',         testament: 'OT' },
  { name: 'Daniel',          testament: 'OT' },
  { name: 'Hosea',           testament: 'OT' },
  { name: 'Joel',            testament: 'OT' },
  { name: 'Amos',            testament: 'OT' },
  { name: 'Obadiah',         testament: 'OT' },
  { name: 'Jonah',           testament: 'OT' },
  { name: 'Micah',           testament: 'OT' },
  { name: 'Nahum',           testament: 'OT' },
  { name: 'Habakkuk',        testament: 'OT' },
  { name: 'Zephaniah',       testament: 'OT' },
  { name: 'Haggai',          testament: 'OT' },
  { name: 'Zechariah',       testament: 'OT' },
  { name: 'Malachi',         testament: 'OT' },

  // ── New Testament (27) ──────────────────────────────────────
  { name: 'Matthew',         testament: 'NT' },
  { name: 'Mark',            testament: 'NT' },
  { name: 'Luke',            testament: 'NT' },
  { name: 'John',            testament: 'NT' },
  { name: 'Acts',            testament: 'NT' },
  { name: 'Romans',          testament: 'NT' },
  { name: '1 Corinthians',   testament: 'NT' },
  { name: '2 Corinthians',   testament: 'NT' },
  { name: 'Galatians',       testament: 'NT' },
  { name: 'Ephesians',       testament: 'NT' },
  { name: 'Philippians',     testament: 'NT' },
  { name: 'Colossians',      testament: 'NT' },
  { name: '1 Thessalonians', testament: 'NT' },
  { name: '2 Thessalonians', testament: 'NT' },
  { name: '1 Timothy',       testament: 'NT' },
  { name: '2 Timothy',       testament: 'NT' },
  { name: 'Titus',           testament: 'NT' },
  { name: 'Philemon',        testament: 'NT' },
  { name: 'Hebrews',         testament: 'NT' },
  { name: 'James',           testament: 'NT' },
  { name: '1 Peter',         testament: 'NT' },
  { name: '2 Peter',         testament: 'NT' },
  { name: '1 John',          testament: 'NT' },
  { name: '2 John',          testament: 'NT' },
  { name: '3 John',          testament: 'NT' },
  { name: 'Jude',            testament: 'NT' },
  { name: 'Revelation',      testament: 'NT' },
]

// Alias map: lowercase input → canonical name
const ALIASES = new Map()

// Populate baseline: every canonical name lowercased
CANONICAL_BOOKS.forEach(b => ALIASES.set(b.name.toLowerCase(), b.name))

// Common alternate names / spellings
const EXTRA_ALIASES = [
  ['revelations',                'Revelation'],
  ['song of songs',              'Song of Solomon'],
  ['canticles',                  'Song of Solomon'],
  ['canticle of canticles',      'Song of Solomon'],
  ['psalm',                      'Psalms'],
  ['songs of solomon',           'Song of Solomon'],
  ['song of solomons',           'Song of Solomon'],
  ['songs of songs',             'Song of Solomon'],
  ['the psalms',                 'Psalms'],
  ['acts of the apostles',       'Acts'],

  // No-space numbered forms
  ['1samuel',      '1 Samuel'],   ['2samuel',      '2 Samuel'],
  ['1kings',       '1 Kings'],    ['2kings',       '2 Kings'],
  ['1chronicles',  '1 Chronicles'], ['2chronicles', '2 Chronicles'],
  ['1corinthians', '1 Corinthians'], ['2corinthians', '2 Corinthians'],
  ['1thessalonians','1 Thessalonians'], ['2thessalonians','2 Thessalonians'],
  ['1timothy',     '1 Timothy'],  ['2timothy',     '2 Timothy'],
  ['1peter',       '1 Peter'],    ['2peter',       '2 Peter'],
  ['1john',        '1 John'],     ['2john',        '2 John'],
  ['3john',        '3 John'],
]

EXTRA_ALIASES.forEach(([alias, canonical]) => ALIASES.set(alias, canonical))

/**
 * Normalise a leading book number to a digit before alias lookup:
 * "iii john" / "third john" / "3rd john" → "3 john", "1samuel" → "1 samuel".
 * Only the first word is touched, so "Job" or "Isaiah" can't be mistaken for one.
 */
const NUMBER_PREFIXES = [
  [/^(?:iii|3rd|third)\.?\s+/, '3 '],
  [/^(?:ii|2nd|second)\.?\s+/, '2 '],
  [/^(?:i|1st|first)\.?\s+/,   '1 '],
  [/^([123])(?:st|nd|rd)?\.?\s*(?=[a-z])/, '$1 '],
]

function normaliseNumber(s) {
  for (const [re, to] of NUMBER_PREFIXES) {
    if (re.test(s)) return s.replace(re, to)
  }
  return s
}

function normalise(input) {
  return normaliseNumber(input.trim().replace(/\s+/g, ' ').toLowerCase())
}

/**
 * Match a player's freeform input to a canonical Bible book name, exactly
 * (after case, spacing, number-prefix and alias normalisation).
 * Returns the canonical name string, or null if unrecognised.
 * Voice input relies on this staying exact; typed Recall input uses
 * matchBookNameForgiving below.
 */
export function matchBookName(input) {
  return ALIASES.get(normalise(input)) ?? null
}

// Fuzzy candidates: every alias split into [number prefix, letters only]
// (normalised first, so "1john" files under 1, not as a rival to "John")
const FUZZY_KEYS = [...ALIASES].map(([alias, name]) => {
  const key = normaliseNumber(alias)
  const m = /^([123]) (.*)$/.exec(key)
  return { num: m ? m[1] : '', body: (m ? m[2] : key).replace(/[^a-z]/g, ''), name }
})

/**
 * How many slips (a letter added, dropped or swapped) a book name forgives:
 * short names none (Job, Joel, Mark, John…), mid-length names one
 * (Habakuk, Isiah), long names two (Phillipians, Ecclesiastics).
 */
export function forgivenTypos(length) {
  if (length <= 4) return 0
  if (length <= 7) return 1
  return 2
}

/**
 * Typed Book Recall input, pardoning minor slips ("Habakuk", "Revalation").
 * Returns { name, exact } or null.
 * - Numbered books (1 Samuel, 2 John…) are never guessed: they must be spelt
 *   exactly, though the number may be written 1 / 1st / first / I.
 * - Other books allow forgivenTypos() slips, and the match must be clearly
 *   closer than any other book, so a guess between two books is refused.
 */
export function matchBookNameForgiving(input) {
  const exact = matchBookName(input)
  if (exact) return { name: exact, exact: true }

  const normalised = normalise(input)
  if (/^[123] /.test(normalised)) return null
  const body = normalised.replace(/[^a-z]/g, '')
  if (body.length < 3) return null

  let best = null
  let bestDistance = Infinity
  let runnerUp = Infinity
  for (const key of FUZZY_KEYS) {
    if (key.num) continue // numbered books: exact only
    const distance = levenshtein(body, key.body)
    if (distance > forgivenTypos(key.body.length)) continue
    if (key.name === best) { bestDistance = Math.min(bestDistance, distance); continue }
    if (distance < bestDistance) {
      runnerUp = bestDistance
      bestDistance = distance
      best = key.name
    } else if (distance < runnerUp) {
      runnerUp = distance
    }
  }
  if (!best || bestDistance === runnerUp) return null
  return { name: best, exact: false }
}
