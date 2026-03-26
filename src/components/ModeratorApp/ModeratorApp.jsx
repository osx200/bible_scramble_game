import { useState } from 'react'
import { selectBooks } from '../../utils/bookFilter.js'
import { scrambleName } from '../../utils/scramble.js'
import ModeratorSetup from '../ModeratorSetup/ModeratorSetup.jsx'
import ModeratorPlay from '../ModeratorPlay/ModeratorPlay.jsx'

export default function ModeratorApp() {
  const [phase, setPhase] = useState('setup') // 'setup' | 'play'
  const [config, setConfig] = useState(null)

  function handleStart(cfg) {
    const books = selectBooks({
      difficulty: cfg.difficulty,
      category: cfg.category,
      count: cfg.count,
    })
    const words = books.map(b => ({
      name: b.name,
      scrambled: scrambleName(b.name),
    }))
    setConfig({ ...cfg, words })
    setPhase('play')
  }

  if (phase === 'play') {
    return <ModeratorPlay config={config} onBack={() => setPhase('setup')} />
  }

  return <ModeratorSetup onStart={handleStart} />
}
