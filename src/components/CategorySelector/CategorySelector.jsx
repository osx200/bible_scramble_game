import { useGame, useWordSet } from '../../context/GameContext.jsx'
import { Field, Segmented } from '../Setup/Setup.jsx'

export default function CategorySelector() {
  const { state, dispatch } = useGame()
  const wordSet = useWordSet()

  // Couples is too small to split by testament
  if (wordSet.categoryFilter === false) return null

  const options = [['all', wordSet.allLabel], ['OT', wordSet.categories.OT], ['NT', wordSet.categories.NT]]
  return (
    <Field label="Category">
      <Segmented label="Category" options={options} value={state.category} onChange={(v) => dispatch({ type: 'SET_CATEGORY', payload: v })} />
    </Field>
  )
}
