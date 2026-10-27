import bibleBooks from './bibleBooks.js'
import bibleProphets from './bibleProphets.js'
import bibleDisciples from './bibleDisciples.js'
import bibleCouples from './bibleCouples.js'

/**
 * The word lists the Word Unscramble game can draw from, plus the copy that
 * changes with them. Every set shares the same entry shape and the same OT/NT
 * category axis, so only the wording differs — keep every "book"/"prophet"
 * string here rather than hardcoding it in components.
 *
 * Two optional shapes:
 *   pairs: true          — every data entry is `{ spouses: [a, b] }` (Couples);
 *                          selectWords() turns each into a normal entry whose
 *                          `name` is the answer and `partner` is shown.
 *                          Grand Mix holds some pair entries too — the engine
 *                          checks each entry for `spouses`, not just this flag
 *   categoryFilter: false — no OT/NT picker for this set (too few entries to
 *                          split); selectWords() ignores `category`
 *
 * Adding a set? Also add its id to WORD_SETS in server/index.js, or the
 * leaderboard rejects its scores.
 */
const TESTAMENTS = { OT: 'Old Testament', NT: 'New Testament' }

const BOOK_PREFIXES = [
  'the book of ', 'book of ', 'the letter to the ', 'the letter of ',
  'letter to the ', 'the gospel of ', 'gospel of ', 'the epistle of ',
  'epistle of ', 'saint ', 'st ', 'the ',
]
const PROPHET_PREFIXES = [
  'the prophet ', 'prophet ', 'the prophetess ', 'prophetess ',
  'the apostle ', 'apostle ', 'the disciple ', 'disciple ', 'saint ', 'st ', 'the ',
]

// Tight fuzzy budget for sets whose names cluster (Micah/Micaiah, Eldad/
// Medad…) — a loose one would confidently fill in the wrong answer
const tightFuzzy = (len) => (len >= 9 ? 1 : 0)

/**
 * Several lists as one: names shared between them (Amos, Joel, Jonah are
 * books *and* prophets; Philip is a prophet *and* an apostle) appear once,
 * and ids are renumbered so React keys never collide. Couples entries are
 * keyed by the pair, so "Ruth" the book and "Boaz & Ruth" both stay.
 */
function combine(...lists) {
  const seen = new Set()
  const out = []
  for (const entry of lists.flat()) {
    const key = (entry.spouses ? `pair:${entry.spouses.join('&')}` : entry.name).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...entry, id: out.length + 1 })
  }
  return out
}

// Longest first, so "the book of " is tried before "the "
const mergePrefixes = (...lists) => [...new Set(lists.flat())].sort((a, b) => b.length - a.length)

const prophetsAndDisciples = combine(bibleProphets, bibleDisciples)

export const WORD_SETS = {
  books: {
    id: 'books',
    data: bibleBooks,
    emoji: '📚',
    label: 'Bible Books',
    noun: 'book',
    subtitle: 'Unscramble the names of the 66 books of the Bible',
    tileDesc: 'Unscramble the names of the 66 books of the Bible.',
    allLabel: 'All Books',
    categories: TESTAMENTS,
    // Typing hint under the answer box
    typingHint: 'numbers required (e.g. 1 Samuel)',
    // Filler the speech engine picks up around a spoken name
    voicePrefixes: BOOK_PREFIXES,
    // Books are numbered ("1 Samuel"), prophets are not
    numberedNames: true,
    // Voice matching also accepts canonicalBooks.js names and aliases
    includesBooks: true,
    fuzzyBudget: (len) => (len >= 7 ? 2 : len >= 5 ? 1 : 0),
  },

  // id stays 'prophets' — it's stored on existing leaderboard rows
  prophets: {
    id: 'prophets',
    data: prophetsAndDisciples,
    emoji: '🕊️',
    label: 'Prophets & Disciples',
    noun: 'prophet or disciple',
    subtitle: 'Unscramble the names of the prophets and the disciples of Jesus',
    tileDesc: 'The prophets of the Bible and the disciples Jesus called.',
    allLabel: 'All Prophets & Disciples',
    categories: TESTAMENTS,
    typingHint: 'spell the full name (e.g. John the Baptist)',
    voicePrefixes: PROPHET_PREFIXES,
    numberedNames: false,
    includesBooks: false,
    fuzzyBudget: tightFuzzy,
  },

  couples: {
    id: 'couples',
    data: bibleCouples,
    pairs: true,
    categoryFilter: false,
    emoji: '💍',
    label: 'Biblical Couples',
    noun: 'spouse',
    subtitle: 'Name the missing husband or wife: Moses & ___?',
    tileDesc: 'Name the missing husband or wife: Moses & ___?',
    allLabel: 'All Couples',
    categories: TESTAMENTS, // still used by the testament hint
    typingHint: 'type the missing spouse’s name',
    voicePrefixes: ['the ', 'saint ', 'st '],
    numberedNames: false,
    includesBooks: false,
    fuzzyBudget: tightFuzzy,
  },

  grandmix: {
    id: 'grandmix',
    // Couples rounds show their "MOSES & ___" prompt here too
    data: combine(bibleBooks, prophetsAndDisciples, bibleCouples),
    emoji: '🎲',
    label: 'Grand Mix',
    noun: 'book, prophet, disciple or spouse',
    subtitle: 'Books, prophets, disciples and couples, all mixed together',
    tileDesc: 'Books, prophets, disciples and couples all mixed together. The ultimate challenge.',
    allLabel: 'Everything',
    categories: TESTAMENTS,
    typingHint: 'numbers required for books (e.g. 1 Samuel)',
    voicePrefixes: mergePrefixes(BOOK_PREFIXES, PROPHET_PREFIXES),
    numberedNames: true,
    includesBooks: true,
    fuzzyBudget: tightFuzzy,
  },
}

export const DEFAULT_WORD_SET = 'books'

export const getWordSet = (id) => WORD_SETS[id] ?? WORD_SETS[DEFAULT_WORD_SET]

export const WORD_SET_LIST = Object.values(WORD_SETS)
