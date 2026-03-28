import { useState } from 'react'
import { CANONICAL_BOOKS } from '../../data/canonicalBooks.js'
import RecallSetup from './RecallSetup.jsx'
import RecallPlay from './RecallPlay.jsx'
import RecallResults from './RecallResults.jsx'

export default function RecallApp() {
  const [phase,   setPhase]   = useState('setup') // 'setup' | 'play' | 'results'
  const [config,  setConfig]  = useState(null)
  const [results, setResults] = useState(null)

  function handleStart(cfg) {
    const targetBooks = CANONICAL_BOOKS.filter(b =>
      cfg.category === 'all' || b.testament.toLowerCase() === cfg.category
    )
    setConfig({ ...cfg, targetBooks })
    setPhase('play')
  }

  function handleFinish(namedBooks) {
    setResults({ namedBooks, targetBooks: config.targetBooks })
    setPhase('results')
  }

  function handlePlayAgain() {
    setResults(null)
    setPhase('setup')
  }

  if (phase === 'play') {
    return <RecallPlay config={config} onFinish={handleFinish} />
  }

  if (phase === 'results') {
    return (
      <RecallResults
        namedBooks={results.namedBooks}
        targetBooks={results.targetBooks}
        onPlayAgain={handlePlayAgain}
      />
    )
  }

  return <RecallSetup onStart={handleStart} />
}
