import { useGame } from '../../context/GameContext.jsx'
import { Field, Segmented } from '../Setup/Setup.jsx'

const OPTIONS = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]
const HINT = {
  easy: 'Well-known names, 45 seconds a round.',
  medium: 'Adds less familiar names, 30 seconds a round.',
  hard: 'Everything, including the rarest names, 20 seconds a round.',
}

export default function DifficultySelector() {
  const { state, dispatch } = useGame()
  return (
    <Field label="Difficulty" hint={HINT[state.difficulty]}>
      <Segmented label="Difficulty" options={OPTIONS} value={state.difficulty} onChange={(v) => dispatch({ type: 'SET_DIFFICULTY', payload: v })} />
    </Field>
  )
}
