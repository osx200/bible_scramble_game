import { getWordSet } from '../data/wordSets.js'

// Fisher-Yates shuffle — returns a new shuffled array
function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * A Couples pair → an ordinary engine entry. Which spouse is shown is random
 * each time, so "Moses & ___" and "___ & Zipporah" both come up. `name` is
 * the answer, which keeps scrambling, answer checking, hints and voice
 * working unchanged.
 */
function orientPair(entry) {
  const answerFirst = Math.random() < 0.5
  const [first, second] = entry.spouses
  const answer = answerFirst ? first : second
  return {
    id: entry.id,
    name: answer,
    partner: answerFirst ? second : first,
    partnerFirst: !answerFirst, // for "Moses & ___" vs "___ & Zipporah"
    pair: `${first} & ${second}`,
    testament: entry.testament,
    difficulty: entry.difficulty,
    wordCount: answer.split(' ').length,
  }
}

/**
 * Select `count` entries from a word set based on difficulty and category.
 * Harder modes include easier entries to pad the pool.
 * Returns a shuffled slice — no duplicates.
 */
export function selectWords({ wordSet = 'books', difficulty = 'easy', category = 'all', count = 10 }) {
  const difficultyMap = {
    easy: [1],
    medium: [1, 2],
    hard: [1, 2, 3],
  }
  const allowedDifficulties = difficultyMap[difficulty] ?? [1]

  const ws = getWordSet(wordSet)
  // A set without a category picker ignores whatever category the previous
  // set left in state — otherwise a stale 'OT' could empty the pool
  const anyCategory = category === 'all' || ws.categoryFilter === false

  let pool = ws.data.filter((entry) => {
    const diffOk = allowedDifficulties.includes(entry.difficulty)
    const catOk = anyCategory || entry.testament.toLowerCase() === category.toLowerCase()
    return diffOk && catOk
  })

  pool = shuffleArray(pool).slice(0, count)
  // Per entry, not per set: Grand Mix mixes pairs with ordinary names
  return pool.map((entry) => (entry.spouses ? orientPair(entry) : entry))
}
