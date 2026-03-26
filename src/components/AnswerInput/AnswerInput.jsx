import { useState, useRef, useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Button from '../shared/Button.jsx'
import styles from './AnswerInput.module.css'

export default function AnswerInput({ roundKey, onSubmit }) {
  const [value, setValue] = useState('')
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef(null)

  // Auto-focus on mount and on each new round
  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [roundKey])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) {
      // Shake to indicate empty input
      setShaking(true)
      setTimeout(() => setShaking(false), 450)
      return
    }
    onSubmit(trimmed)
    setValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        type="text"
        className={`${styles.input} ${shaking ? styles.shake : ''}`}
        placeholder="Type the book name..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <Button onClick={handleSubmit} className={styles.submitBtn}>
        Submit
      </Button>
    </div>
  )
}
