import styles from './Card.module.css'

export default function Card({ children, size = 'md', className = '' }) {
  const classes = [styles.card, size !== 'md' ? styles[size] : '', className]
    .filter(Boolean)
    .join(' ')
  return <div className={classes}>{children}</div>
}
