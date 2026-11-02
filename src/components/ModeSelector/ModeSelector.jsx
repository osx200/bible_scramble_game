import { useGame } from '../../context/GameContext.jsx'
import { ChoiceCards, Field } from '../Setup/Setup.jsx'

const OPTIONS = [
  { value: 'solo', title: 'Solo', desc: 'Play on your own and post to the leaderboard' },
  { value: 'teams', title: 'Teams', desc: 'Take turns on one screen, team against team' },
]

export default function ModeSelector() {
  const { state, dispatch } = useGame()
  return (
    <Field label="Who's playing">
      <ChoiceCards label="Who's playing" options={OPTIONS} value={state.mode} onChange={(v) => dispatch({ type: 'SET_MODE', payload: v })} />
    </Field>
  )
}
