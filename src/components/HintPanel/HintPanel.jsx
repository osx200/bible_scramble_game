import { useGame } from '../../context/GameContext.jsx'
import styles from './HintPanel.module.css'

// Which hints are available per difficulty
const HINT_CONFIG = {
  easy:   ['firstLetter', 'testament', 'wordCount'],
  medium: ['firstLetter', 'wordCount'],
  hard:   [],
}

function getHintContent(hintType, book) {
  if (!book) return ''
  switch (hintType) {
    case 'firstLetter':
      return `Starts with: "${book.name[0]}"`
    case 'testament':
      return book.testament === 'OT' ? 'Old Testament' : 'New Testament'
    case 'wordCount':
      return book.wordCount === 1
        ? '1-word name'
        : `${book.wordCount}-word name`
    default:
      return ''
  }
}

const HINT_META = {
  firstLetter: { icon: '🔤', label: 'First Letter' },
  testament:   { icon: '📜', label: 'Testament' },
  wordCount:   { icon: '#️⃣', label: 'Word Count' },
}

export default function HintPanel() {
  const { state, dispatch } = useGame()
  const { difficulty, currentBook, revealedHints } = state

  const availableHints = HINT_CONFIG[difficulty] ?? []
  if (availableHints.length === 0) return null

  function useHint(hintType) {
    if (revealedHints.includes(hintType)) return
    dispatch({ type: 'USE_HINT', payload: { hintType } })
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.title}>Hints <span className={styles.penalty}>(-25 pts each)</span></p>
      <div className={styles.buttons}>
        {availableHints.map((hintType) => {
          const revealed = revealedHints.includes(hintType)
          const { icon, label } = HINT_META[hintType]
          return (
            <button
              key={hintType}
              className={`${styles.hintBtn} ${revealed ? styles.revealed : ''}`}
              onClick={() => useHint(hintType)}
              disabled={revealed}
            >
              <span className={styles.icon}>{icon}</span>
              {revealed ? (
                <span className={styles.revealedText}>{getHintContent(hintType, currentBook)}</span>
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
