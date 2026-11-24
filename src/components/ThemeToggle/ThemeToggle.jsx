import { useState, useEffect } from 'react'
import styles from './ThemeToggle.module.css'

// Storage can throw (site data blocked in the browser): the theme then just
// isn't remembered, instead of the whole app failing to render
function loadTheme() {
  try { return localStorage.getItem('theme') === 'dark' } catch { return false }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(loadTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])

  return (
    <button
      className={styles.toggle}
      onClick={() => setDark((d) => !d)}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
