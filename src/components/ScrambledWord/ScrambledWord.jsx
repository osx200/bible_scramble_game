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

export default function ScrambledWord({ animKey }) {
  const { state } = useGame()
  const wordSet = useWordSet()
  const { scrambledName, currentBook } = state
  const isPair = Boolean(currentBook?.partner)

  const words = scrambledName.split(' ')

  // Build tile elements: words separated by spacer divs
  const elements = []
  words.forEach((word, wordIdx) => {
    if (wordIdx > 0) {
      elements.push(<div key={`gap-${wordIdx}`} className={styles.wordGap} />)
    }
    const isPrefix = isNumericPrefix(word)
    word.split('').forEach((char, charIdx) => {
      const delay = (wordIdx * 8 + charIdx) * 50
      elements.push(
        <div
          key={`${animKey}-${wordIdx}-${charIdx}`}
          className={`${styles.tile} ${isPrefix ? styles.prefix : ''}`}
          style={{ animationDelay: `${delay}ms` }}
        >
          {char.toUpperCase()}
        </div>
      )
    })
  })

  return (
    <div className={styles.wrapper}>
      {isPair && <PairPrompt key={animKey} entry={currentBook} />}
      <div className={styles.group}>{elements}</div>
      <p className={styles.hint}>
        {isPair
          ? `Unscramble the name of ${possessive(currentBook.partner)} spouse`
          : words.length > 1 ? `${words.length}-word ${wordSet.noun} name` : 'Unscramble the letters'}
      </p>
    </div>
  )
}
