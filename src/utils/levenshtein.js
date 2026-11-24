/** Edit distance between two strings (insert, delete, substitute all cost 1). */
export function levenshtein(a, b) {
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
