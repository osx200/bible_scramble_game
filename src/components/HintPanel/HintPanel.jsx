import { useGame, useWordSet } from '../../context/GameContext.jsx'
import styles from './HintPanel.module.css'

// Which hints are available per difficulty
const HINT_CONFIG = {
  easy:   ['firstLetter', 'testament', 'wordCount'],
  medium: ['firstLetter', 'wordCount'],
  hard:   [],
}

function getHintContent(hintType, book, wordSet) {
  if (!book) return ''
  switch (hintType) {
    case 'firstLetter':
      return `Starts with: "${book.name[0]}"`
    case 'testament':
      // The set's own label for this side of the OT/NT axis
      return wordSet.categories[book.testament]
    case 'wordCount':
      return book.wordCount === 1
        ? '1-word name'
        : `${book.wordCount}-word name`
    default:
      return ''
  }
}

const HINT_META = {
  firstLetter: { label: 'First Letter' },
  testament:   { label: 'Testament' },
  wordCount:   { label: 'Word Count' },
}

export default function HintPanel() {
  const { state, dispatch } = useGame()
  const { difficulty, currentBook, revealedHints } = state
  const wordSet = useWordSet()
  // A set whose OT/NT axis isn't the testaments gets a neutral button label
  const testamentLabel = wordSet.categories.OT === 'Old Testament' ? 'Testament' : 'Category'

  const availableHints = HINT_CONFIG[difficulty] ?? []
  if (availableHints.length === 0) return null

  function useHint(hintType) {
    if (revealedHints.includes(hintType)) return
    dispatch({ type: 'USE_HINT', payload: { hintType } })
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.title}>Hints <span className={styles.penalty}>(free)</span></p>
      <div className={styles.buttons}>
        {availableHints.map((hintType) => {
          const revealed = revealedHints.includes(hintType)
          const label = hintType === 'testament' ? testamentLabel : HINT_META[hintType].label
          return (
            <button
              key={hintType}
              className={`${styles.hintBtn} ${revealed ? styles.revealed : ''}`}
              onClick={() => useHint(hintType)}
              disabled={revealed}
            >
              {revealed ? (
                <span className={styles.revealedText}>{getHintContent(hintType, currentBook, wordSet)}</span>
              ) : (
                label
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
