import { useLayoutEffect, useRef, useState } from 'react'
import { useGame, useWordSet } from '../../context/GameContext.jsx'
import styles from './ScrambledWord.module.css'

function isNumericPrefix(token) {
  return /^\d+$/.test(token)
}

// "Moses" → "Moses’", "Ruth" → "Ruth’s"
function possessive(name) {
  return /s$/i.test(name) ? `${name}’` : `${name}’s`
}

/** Couples: "MOSES & ______" (or "______ & ZIPPORAH") above the tiles */
function PairPrompt({ entry }) {
  // One underscore per letter of the answer, so the blank hints at its length
  const blank = (
    <span className={styles.pairBlank} aria-label="missing name">
      {entry.name.replace(/\S/g, '_')}
    </span>
  )
  const shown = <span className={styles.pairName}>{entry.partner}</span>
  return (
    <p className={styles.pairPrompt}>
      {entry.partnerFirst ? <>{shown} &amp; {blank}</> : <>{blank} &amp; {shown}</>}
    </p>
  )
}

/**
 * The letter tiles, one group per word. Shared with multiplayer's PlayView.
 * --n (longest word) lets the CSS shrink tiles so that word fits on one line.
 * Tiles cascade in 25ms apart, capped so even a long name is fully on
 * screen within ~300ms: this is seen every round, and the player is waiting.
 */
export function TileWords({ words, animKey }) {
  // The widest line: the longest word, or a number prefix with the word it
  // belongs to ("1 Thessalonians"), +1 for the space between them
  const longest = Math.max(
    1,
    ...words.map((w, i) => (isNumericPrefix(w) && words[i + 1] ? w.length + 1 + words[i + 1].length : w.length)),
  )
  // When that line can't fit at the minimum tile size, long words wrap into
  // two halves: size the tiles for a half, so they grow to use the room
  const ref = useRef(null)
  const [split, setSplit] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => {
      const css = getComputedStyle(el)
      const min = parseFloat(css.getPropertyValue('--tile-min')) || 26
      const gap = parseFloat(css.rowGap) || 8
      setSplit((el.clientWidth - 2 - (longest - 1) * gap) / longest < min)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [longest])
  // Split: the widest unbreakable piece (half a long word, or a whole short one)
  const n = split ? Math.max(1, ...words.map((w) => (w.length > 8 ? Math.ceil(w.length / 2) : w.length))) : longest
  let letterIndex = 0
  const tile = (char, key, isPrefix) => (
    <span
      key={key}
      className={`${styles.tile} ${isPrefix ? styles.prefix : ''}`}
      style={{ animationDelay: `${Math.min(letterIndex++ * 25, 300)}ms` }}
    >
      {char.toUpperCase()}
    </span>
  )
  return (
    <div ref={ref} className={styles.group} style={{ '--n': n }}>
      {words.map((word, wordIdx) => {
        const isPrefix = isNumericPrefix(word)
        const letters = word.split('')
        // A long word is two unbreakable halves: if it can't fit on one line
        // at a readable size, it wraps into two even rows, never a lone letter
        const cut = letters.length > 8 ? Math.ceil(letters.length / 2) : letters.length
        const halves = [letters.slice(0, cut), letters.slice(cut)].filter((h) => h.length)
        return (
          <span key={wordIdx} className={styles.word}>
            {halves.map((half, hi) => (
              <span key={hi} className={styles.half}>
                {half.map((char, ci) => tile(char, `${animKey}-${wordIdx}-${hi}-${ci}`, isPrefix))}
              </span>
            ))}
          </span>
        )
      })}
    </div>
  )
}

export default function ScrambledWord({ animKey }) {
  const { state } = useGame()
  const wordSet = useWordSet()
  const { scrambledName, currentBook } = state
  const isPair = Boolean(currentBook?.partner)

  const words = scrambledName.split(' ')

  return (
    <div className={styles.wrapper}>
      {isPair && <PairPrompt key={animKey} entry={currentBook} />}
      <TileWords words={words} animKey={animKey} />
      <p className={styles.hint}>
        {isPair
          ? `Unscramble the name of ${possessive(currentBook.partner)} spouse`
          : words.length > 1 ? `${words.length}-word ${wordSet.noun} name` : 'Unscramble the letters'}
      </p>
    </div>
  )
}
