import { selectWords } from './wordFilter.js'

/**
 * Select `count` Bible books based on difficulty and category.
 * Thin wrapper over selectWords for callers that only ever want books
 * (ModeratorApp). New code should call selectWords directly.
 */
export function selectBooks(options) {
  return selectWords({ ...options, wordSet: 'books' })
}
