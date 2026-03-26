import { useState } from 'react'
import { useAppMode } from '../../context/AppModeContext.jsx'
import QuizBuilder from '../QuizBuilder/QuizBuilder.jsx'
import QuizPlayer from '../QuizPlayer/QuizPlayer.jsx'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function QuizApp() {
  const { setAppMode } = useAppMode()
  const [quizPhase, setQuizPhase] = useState('builder') // 'builder' | 'player'
  const [questions, setQuestions] = useState([])

  function addQuestion(q) {
    setQuestions(prev => [...prev, { ...q, id: uid() }])
  }

  function removeQuestion(id) {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  if (quizPhase === 'player') {
    return (
      <QuizPlayer
        questions={questions}
        onBack={() => setQuizPhase('builder')}
      />
    )
  }

  return (
    <QuizBuilder
      questions={questions}
      onAdd={addQuestion}
      onRemove={removeQuestion}
      onStart={() => setQuizPhase('player')}
      onBackToScramble={() => setAppMode('scramble')}
    />
  )
}
