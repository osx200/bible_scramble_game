import { useGame } from '../../context/GameContext.jsx'
import styles from './ScrambledWord.module.css'

function isNumericPrefix(token) {
  return /^\d+$/.test(token)
}

export default function ScrambledWord({ animKey }) {
  const { state } = useGame()
  const { scrambledName } = state

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
      <div className={styles.group}>{elements}</div>
      <p className={styles.hint}>{words.length > 1 ? `${words.length}-word book name` : 'Unscramble the letters'}</p>
    </div>
  )
}
