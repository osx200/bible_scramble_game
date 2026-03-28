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
 * Normalise Roman-numeral prefixes before alias lookup.
 * "iii john" → "3 john", "ii kings" → "2 kings", "i samuel" → "1 samuel"
 * Only converts a leading Roman numeral followed by a space.
 */
function normaliseRoman(s) {
  return s
    .replace(/^iii\s+/, '3 ')
    .replace(/^ii\s+/,  '2 ')
    .replace(/^i\s+/,   '1 ')
}

/**
 * Match a player's freeform input to a canonical Bible book name.
 * Returns the canonical name string, or null if unrecognised.
 */
export function matchBookName(input) {
  const normalised = normaliseRoman(
    input.trim().replace(/\s+/g, ' ').toLowerCase()
  )
  return ALIASES.get(normalised) ?? null
}
