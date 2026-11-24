// Book Recall race for multiplayer: one long round in which every player (or
// every team, sharing one list) names as many books of the Bible as they can.
// Unlike the other modes a player answers many times, so rooms.js runs a
// `multi` mode through its own path (recallAnswer) instead of judge().
//
// Scoring is 1 point per book, added the moment a book is accepted; ties go
// to whoever reached the count first. Typed names use the same forgiving
// matcher as solo Recall (src/data/canonicalBooks.js), so a typo counts the
// same way online as on one device.
import { CANONICAL_BOOKS, matchBookNameForgiving } from '../../../src/data/canonicalBooks.js'

export const RECALL_SECONDS = [60, 120, 180, 300]

const TESTAMENT_LABEL = { all: 'All 66 books', OT: 'Old Testament', NT: 'New Testament' }

export const recall = {
  id: 'recall',
  label: 'Book Recall',
  multi: true,

  /** One round: the books that count (the canon, or one testament) */
  prepare(settings) {
    const targets = CANONICAL_BOOKS
      .filter((b) => settings.category === 'all' || b.testament === settings.category)
      .map((b) => b.name)
    return [{ targets, testament: settings.category }]
  },

  /** The target list is the public canon, not a secret: only players' lists are private */
  publicRound(r) {
    return { kind: 'recall', targets: r.targets, testament: r.testament, label: TESTAMENT_LABEL[r.testament] }
  },

  /**
   * One typed or spoken name → { name } for a book that counts, or { error }.
   * `has(name)` says whether this player's list (or team's) already holds it.
   */
  judgeBook(r, text, has) {
    const match = matchBookNameForgiving(text)
    if (!match) return { error: `“${text}” is not a Bible book. Check the spelling.` }
    if (!r.targets.includes(match.name)) return { error: `${match.name} is not in the ${TESTAMENT_LABEL[r.testament]}.` }
    if (has(match.name)) return { error: `${match.name} is already on your list.` }
    return { name: match.name }
  },

  reveal(r) {
    return { answer: `${r.targets.length} books`, reference: null }
  },

  describe(settings) {
    return settings.category === 'all' ? 'Book Recall' : `Book Recall: ${TESTAMENT_LABEL[settings.category]}`
  },
}
