// Word Unscramble for multiplayer. Uses the same word lists, word selection
// and scrambler as the single-device game (imported, not copied), so a
// multiplayer round is exactly a normal round — just judged on the server.
import { WORD_SETS } from '../../../src/data/wordSets.js'
import { selectWords } from '../../../src/utils/wordFilter.js'
import { scrambleName } from '../../../src/utils/scramble.js'

const tidy = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

export const unscramble = {
  id: 'unscramble',
  label: 'Word Unscramble',

  /**
   * settings.wordSet is a built-in set id, or 'custom' with payload.words
   * ([{ name, clue }], from the Quiz & Scramble Builder — memory only).
   */
  prepare(settings, payload) {
    const entries = settings.wordSet === 'custom'
      ? payload.words.slice(0, settings.rounds).map((w) => ({ name: w.name, clue: w.clue || '' }))
      : selectWords({
          wordSet: settings.wordSet,
          difficulty: settings.difficulty,
          category: settings.category,
          count: settings.rounds,
        })
    return entries.map((e) => ({
      answer: e.name,
      scrambled: scrambleName(e.name),
      wordCount: e.name.split(' ').length,
      clue: e.clue || '',
      // Couples: one spouse shown, the other is the answer
      partner: e.partner || null,
      partnerFirst: Boolean(e.partnerFirst),
      pair: e.pair || null,
    }))
  },

  /** What every screen may see while the round is open — never the answer */
  publicRound(r) {
    return {
      kind: 'unscramble',
      scrambled: r.scrambled,
      wordCount: r.wordCount,
      clue: r.clue || null,
      partner: r.partner,
      partnerFirst: r.partnerFirst,
      // Couples show one underscore per letter of the missing name
      blank: r.partner ? r.answer.replace(/\S/g, '_') : null,
    }
  },

  judge(r, text) {
    return tidy(text) === tidy(r.answer) ? 'correct' : 'wrong'
  },

  reveal(r) {
    return { answer: r.pair ?? r.answer, reference: null }
  },

  describe(settings) {
    if (settings.wordSet === 'custom') return 'Custom words'
    return WORD_SETS[settings.wordSet]?.label ?? 'Word Unscramble'
  },

  validWordSet(id) {
    return id === 'custom' || id in WORD_SETS
  },
}
