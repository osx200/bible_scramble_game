import { useRef, useState } from 'react'
import { readSpreadsheet, SheetError } from '../../utils/sheetImport.js'
import { importQuestions, importWords, MAX_UPLOAD_ROWS } from '../../utils/builderImport.js'
import styles from './BulkUpload.module.css'

const TEMPLATE_URL = '/templates/bible-games-template.xlsx'
const SHOWN_SKIPS = 6

const COPY = {
  scramble: { noun: 'word', sheet: 'Scramble', columns: 'Word · Clue · Difficulty' },
  quiz: { noun: 'question', sheet: 'Quiz', columns: 'Question · Answer · Bible Reference' },
}

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`

/**
 * Excel / CSV upload for one builder tab.
 *
 * kind         — 'scramble' | 'quiz'
 * existing     — items already in the list (for Replace vs Add, and de-duping words)
 * onImport     — (items, mode: 'replace' | 'append') => void
 */
export default function BulkUpload({ kind, existing, onImport }) {
  const copy = COPY[kind]
  const inputRef = useRef(null)
  const [mode, setMode] = useState('append')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState(null) // { added, skipped, truncated, error, fileName }

  async function handleFile(file) {
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const sheets = await readSpreadsheet(file)
      const replacing = mode === 'replace' || existing.length === 0
      const parsed =
        kind === 'scramble'
          ? importWords(sheets, replacing ? new Set() : new Set(existing.map((w) => w.name.toLowerCase())))
          : importQuestions(sheets)

      if (parsed.error) {
        setResult({ error: parsed.error, fileName: file.name })
      } else {
        if (parsed.items.length) onImport(parsed.items, replacing ? 'replace' : 'append')
        setResult({ ...parsed, added: parsed.items.length, fileName: file.name })
      }
    } catch (err) {
      setResult({
        error: err instanceof SheetError ? err.message : 'Couldn’t read that file. Is it a saved .xlsx or .csv?',
        fileName: file.name,
      })
    } finally {
      setBusy(false)
      // Same file can be picked again after fixing it
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <section className={styles.panel} aria-label={`Upload ${copy.noun}s from Excel`}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>Bulk upload</h3>
          <p className={styles.lead}>
            Fill in the <strong>{copy.sheet}</strong> sheet of the template ({copy.columns}), then upload
            it here. Up to {MAX_UPLOAD_ROWS} rows at a time.
          </p>
        </div>
        <a className={styles.templateLink} href={TEMPLATE_URL} download>
          Download Excel template
        </a>
      </div>

      {existing.length > 0 && (
        <div className={styles.modeRow} role="radiogroup" aria-label="When uploading">
          <span className={styles.modeLabel}>When uploading:</span>
          {[
            ['append', 'Add to list'],
            ['replace', `Replace the ${plural(existing.length, copy.noun)}`],
          ].map(([value, label]) => (
            <label key={value} className={`${styles.mode} ${mode === value ? styles.modeActive : ''}`}>
              <input
                type="radio"
                name={`upload-mode-${kind}`}
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              {label}
            </label>
          ))}
        </div>
      )}

      <label
        className={`${styles.drop} ${dragging ? styles.dropActive : ''} ${busy ? styles.dropBusy : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className={styles.fileInput}
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={busy}
        />
        <span className={styles.dropText}>
          {busy ? 'Reading file…' : <><strong>Choose a file</strong> or drag it here</>}
        </span>
        <span className={styles.dropHint}>.xlsx or .csv</span>
      </label>

      {result && (
        <div className={`${styles.result} ${result.error || !result.added ? styles.resultWarn : ''}`} role="status">
          {result.error ? (
            <p>
              <strong>{result.fileName}:</strong> {result.error}
            </p>
          ) : (
            <>
              <p>
                <strong>{plural(result.added, copy.noun)} added</strong>
                {result.skipped.length > 0 && <> · {plural(result.skipped.length, 'row')} skipped</>}
                {result.truncated && <> · stopped at {MAX_UPLOAD_ROWS} rows</>}
                <span className={styles.resultFile}> from {result.fileName}</span>
              </p>
              {result.skipped.length > 0 && (
                <ul className={styles.skips}>
                  {result.skipped.slice(0, SHOWN_SKIPS).map((s) => (
                    <li key={s.row}>
                      <span className={styles.skipRow}>Row {s.row}</span> {s.reason}
                    </li>
                  ))}
                  {result.skipped.length > SHOWN_SKIPS && (
                    <li className={styles.skipMore}>…and {result.skipped.length - SHOWN_SKIPS} more</li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
