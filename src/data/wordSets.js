import bibleBooks from './bibleBooks.js'
import bibleProphets from './bibleProphets.js'

/**
 * The word lists the Word Unscramble game can draw from, plus the copy that
 * changes with them. Both sets share the same entry shape and the same OT/NT
 * category axis, so only the wording differs — keep every "book"/"prophet"
 * string here rather than hardcoding it in components.
 */
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
    // Typing hint under the answer box
    typingHint: 'numbers required (e.g. 1 Samuel)',
    // Filler the speech engine picks up around a spoken name
    voicePrefixes: [
      'the book of ', 'book of ', 'the letter to the ', 'the letter of ',
      'letter to the ', 'the gospel of ', 'gospel of ', 'the epistle of ',
      'epistle of ', 'saint ', 'st ', 'the ',
    ],
    // Books are numbered ("1 Samuel"), prophets are not
    numberedNames: true,
    fuzzyBudget: (len) => (len >= 7 ? 2 : len >= 5 ? 1 : 0),
  },

  prophets: {
    id: 'prophets',
    data: bibleProphets,
    emoji: '🕊️',
    label: 'Prophets',
    noun: 'prophet',
    subtitle: 'Unscramble the names of the prophets of the Bible',
    tileDesc: 'Unscramble the names of the prophets of the Bible.',
    allLabel: 'All Prophets',
    typingHint: 'spell the full name (e.g. John the Baptist)',
    voicePrefixes: [
      'the prophet ', 'prophet ', 'the prophetess ', 'prophetess ', 'saint ', 'st ', 'the ',
    ],
    numberedNames: false,
    // Tighter than books: prophet names cluster (Micah/Micaiah, Eldad/Medad),
    // so a loose budget would confidently fill in the wrong answer.
    fuzzyBudget: (len) => (len >= 9 ? 1 : 0),
  },
}

export const DEFAULT_WORD_SET = 'books'

export const getWordSet = (id) => WORD_SETS[id] ?? WORD_SETS[DEFAULT_WORD_SET]

export const WORD_SET_LIST = Object.values(WORD_SETS)
