/**
 * Fisher-Yates shuffle on an array — mutates in place, returns the array.
 */
function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Scramble a single word.
 * Words of 1-2 characters are returned as-is.
 * Re-shuffles up to 10 times to avoid returning the original.
 */
function scrambleWord(word) {
  if (word.length <= 2) return word
  const lower = word.toLowerCase()
  const letters = lower.split('')
  let result
  let attempts = 0
  do {
    result = fisherYates([...letters]).join('')
    attempts++
  } while (result === lower && attempts < 10)
  return result
}

/**
 * Numeric prefix tokens: "1", "2", "3"
 */
function isNumericPrefix(token) {
  return /^\d+$/.test(token)
}

/**
 * Scramble a Bible book name.
 * - Preserves numeric prefixes ("1", "2", "3")
 * - Scrambles each other word independently
 * - Result is always lowercase (display with text-transform: uppercase in CSS)
 *
 * @param {string} bookName  e.g. "Genesis", "1 Samuel", "Song of Solomon"
 * @returns {string}         e.g. "sgnsiee", "1 lusame", "gno fo oosomln"
 */
export function scrambleName(bookName) {
  const words = bookName.split(' ')
  const scrambled = words.map((word) =>
    isNumericPrefix(word) ? word : scrambleWord(word)
  )
  return scrambled.join(' ')
}
