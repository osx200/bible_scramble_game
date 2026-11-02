import { useLayoutEffect, useRef } from 'react'

const MOVE_MS = 360
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)' // --ease-in-out: movement on screen

/**
 * Re-ordered lists glide instead of jumping (FLIP: remember where each row
 * was, let React re-render, then animate each row from its old spot).
 * Used for live standings, where seeing *who moved* is the point.
 *
 *   const listRef = useFlipList(dependency)
 *   <ol ref={listRef}>{rows.map(r => <li data-flip-key={r.id}>…)}</ol>
 *
 * Runs on the Web Animations API (transform only, so it stays on the
 * compositor). Skipped entirely under prefers-reduced-motion.
 */
export function useFlipList(dependency) {
  const listRef = useRef(null)
  const positions = useRef(new Map())

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const rows = [...list.querySelectorAll('[data-flip-key]')]
    const next = new Map(rows.map((row) => [row.dataset.flipKey, row.getBoundingClientRect().top]))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (!reduce) {
      for (const row of rows) {
        const before = positions.current.get(row.dataset.flipKey)
        const after = next.get(row.dataset.flipKey)
        const delta = before === undefined ? 0 : before - after
        if (Math.abs(delta) > 1) {
          row.animate(
            [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
            { duration: MOVE_MS, easing: EASE_IN_OUT },
          )
        }
      }
    }
    positions.current = next
  }, [dependency])

  return listRef
}
