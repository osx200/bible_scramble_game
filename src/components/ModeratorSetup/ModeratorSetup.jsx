import { useState } from 'react'
import { useAppMode } from '../../context/AppModeContext.jsx'
import { SetupScreen, Field, Segmented, MoreOptions } from '../Setup/Setup.jsx'
import Stage from '../Stage/Stage.jsx'

const CATEGORIES   = [['all', 'All Books'], ['ot', 'Old Testament'], ['nt', 'New Testament']]
const DIFFICULTIES = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]
const COUNTS       = [[5, '5'], [10, '10'], [15, '15'], [20, '20']]
// Also used by the Builder's scramble tab
export const TIMERS = [{ value: 15, label: '15 s' }, { value: 30, label: '30 s' }, { value: 45, label: '45 s' }, { value: 60, label: '1 min' }, { value: 90, label: '90 s' }]

export default function ModeratorSetup({ onStart }) {
  const { setAppMode } = useAppMode()
  const [category,   setCategory]   = useState('all')
  const [difficulty, setDifficulty] = useState('easy')
  const [count,      setCount]      = useState(10)
  const [timer,      setTimer]      = useState(30)

  const summary = [
    `${count} words`,
    difficulty[0].toUpperCase() + difficulty.slice(1),
    category !== 'all' && CATEGORIES.find(([v]) => v === category)[1],
    `${TIMERS.find((t) => t.value === timer).label} each`,
  ].filter(Boolean).join(' · ')

  return (
    <Stage art="ezra">
      <SetupScreen
        title="Moderator View"
        subtitle="Show scrambled words on one big screen and reveal each answer when your group is ready."
        onBack={() => setAppMode('scramble')}
        summary={summary}
        onStart={() => onStart({ category, difficulty, count, timerDuration: timer })}
      >
        <Field label="Difficulty">
          <Segmented label="Difficulty" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
        </Field>
        <Field label="Number of words">
          <Segmented label="Number of words" options={COUNTS} value={count} onChange={setCount} />
        </Field>
        <MoreOptions changed={(category !== 'all') + (timer !== 30)}>
          <Field label="Category">
            <Segmented label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
          </Field>
          <Field label="Timer per word">
            <Segmented label="Timer per word" options={TIMERS.map((t) => [t.value, t.label])} value={timer} onChange={setTimer} />
          </Field>
        </MoreOptions>
      </SetupScreen>
    </Stage>
  )
}
