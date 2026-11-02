import { useState } from 'react'
import { useAppMode } from '../../context/AppModeContext.jsx'
import { SetupScreen, Field, Segmented } from '../Setup/Setup.jsx'
import Stage from '../Stage/Stage.jsx'

const TIMERS = [[60, '1 min'], [120, '2 min'], [180, '3 min'], [300, '5 min']]
const CATEGORIES = [['all', 'All 66'], ['ot', 'Old Testament'], ['nt', 'New Testament']]
const CATEGORY_SUMMARY = { all: 'All 66 books', ot: 'Old Testament (39)', nt: 'New Testament (27)' }

export default function RecallSetup({ onStart }) {
  const { setAppMode } = useAppMode()
  const [timer, setTimer] = useState(180)
  const [category, setCategory] = useState('all')

  return (
    <Stage art="isaiah">
      <SetupScreen
        title="Book Recall"
        subtitle="How many books of the Bible can you name from memory? Type them or say them out loud."
        onBack={() => setAppMode('scramble')}
        summary={`${CATEGORY_SUMMARY[category]} · ${TIMERS.find(([v]) => v === timer)[1]}`}
        onStart={() => onStart({ category, timerDuration: timer })}
      >
        <Field label="Books to name">
          <Segmented label="Books to name" options={CATEGORIES} value={category} onChange={setCategory} />
        </Field>
        <Field label="Time limit">
          <Segmented label="Time limit" options={TIMERS} value={timer} onChange={setTimer} />
        </Field>
      </SetupScreen>
    </Stage>
  )
}
