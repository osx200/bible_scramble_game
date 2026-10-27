import { useState } from 'react'
import { useAppMode } from '../../context/AppModeContext.jsx'
import QuizBuilder from '../QuizBuilder/QuizBuilder.jsx'
import QuizPlayer from '../QuizPlayer/QuizPlayer.jsx'
import ModeratorPlay from '../ModeratorPlay/ModeratorPlay.jsx'

/**
 * Quiz & Scramble Builder. Owns the session's questions and words in plain
 * component state — deliberately never localStorage or the server. Leaving to
 * the menu unmounts this component, which is what discards the session.
 */
export default function QuizApp() {
  const { setAppMode } = useAppMode()
  const [phase, setPhase] = useState('builder') // 'builder' | 'quiz' | 'scramble'
  const [tab, setTab] = useState('quiz') // builder tab: 'quiz' | 'scramble'
  const [questions, setQuestions] = useState([])
  const [words, setWords] = useState([])
  const [scrambleConfig, setScrambleConfig] = useState(null)

  if (phase === 'quiz') {
    return <QuizPlayer questions={questions} onBack={() => setPhase('builder')} />
  }

  if (phase === 'scramble') {
    return (
      <ModeratorPlay
        config={scrambleConfig}
        onBack={() => setPhase('builder')}
        backLabel="← Builder"
        showReactions={false}
      />
    )
  }

  return (
    <QuizBuilder
      tab={tab}
      onTabChange={setTab}
      questions={questions}
      onQuestionsChange={setQuestions}
      words={words}
      onWordsChange={setWords}
      onStartQuiz={() => setPhase('quiz')}
      onStartScramble={(config) => {
        setScrambleConfig(config)
        setPhase('scramble')
      }}
      onBack={() => setAppMode('scramble')}
    />
  )
}
