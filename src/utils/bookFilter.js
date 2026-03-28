import bibleBooks from '../data/bibleBooks.js'

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
 * Select `count` books based on difficulty and category.
 * Harder modes include easier books to pad the pool.
 * Returns a shuffled slice — no duplicates.
 */
export function selectBooks({ difficulty = 'easy', category = 'all', count = 10 }) {
  const difficultyMap = {
    easy: [1],
    medium: [1, 2],
    hard: [1, 2, 3],
  }
  const allowedDifficulties = difficultyMap[difficulty] ?? [1]

  let pool = bibleBooks.filter((book) => {
    const diffOk = allowedDifficulties.includes(book.difficulty)
    const catOk =
      category === 'all' || book.testament.toLowerCase() === category.toLowerCase()
    return diffOk && catOk
  })

  pool = shuffleArray(pool)
  return pool.slice(0, count)
}
