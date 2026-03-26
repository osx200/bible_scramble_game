import styles from './Button.module.css'

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  type = 'button',
  className = '',
  style,
}) {
  const classes = [
    styles.btn,
    styles[variant],
    size !== 'md' ? styles[size] : '',
    full ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  )
}
