/**
 * Reads an uploaded .xlsx or .csv into plain rows of strings — just enough
 * spreadsheet support for the Quiz & Scramble Builder's bulk upload, with no
 * library. (SheetJS would mean committing another package into node_modules.)
 *
 *   readSpreadsheet(file) → [{ name: 'Scramble', rows: [['Word','Clue'], …] }, …]
 *
 * .xlsx is a zip of XML files: the zip is walked by hand and each entry is
 * inflated with the browser's built-in DecompressionStream('deflate-raw')
 * (Chrome 103+, Safari 16.4+, Firefox 113+). Only cell *values* are read —
 * formulas come through as their last computed result, styles are ignored.
 */

export class SheetError extends Error {}

export async function readSpreadsheet(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) {
    return [{ name: file.name.replace(/\.csv$/i, ''), rows: parseCsv(await file.text()) }]
  }
  if (name.endsWith('.xlsx')) return readXlsx(await file.arrayBuffer())
  if (name.endsWith('.xls')) {
    throw new SheetError('Old .xls files aren’t supported. In Excel choose File → Save As → Excel Workbook (.xlsx).')
  }
  throw new SheetError('Please upload an .xlsx or .csv file.')
}

// ── CSV (RFC 4180: quoted fields, "" escapes, newlines inside quotes) ─────

export function parseCsv(text) {
  const src = text.replace(/^﻿/, '') // Excel's UTF-8 BOM
  // Excel in many locales saves "CSV" with semicolons — sniff the first line
  const firstLine = src.slice(0, src.search(/\r?\n|$/))
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','

  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') {
      quoted = true
    } else if (c === delim) {
      row.push(field); field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

// ── XLSX ─────────────────────────────────────────────────────────────────

async function readXlsx(buffer) {
  const entries = listZip(buffer)
  const read = async (path) => {
    const entry = entries.get(path)
    return entry ? new TextDecoder().decode(await inflate(buffer, entry)) : null
  }
  const xml = (text) => new DOMParser().parseFromString(text, 'application/xml')

  const workbookXml = await read('xl/workbook.xml')
  if (!workbookXml) throw new SheetError('That file doesn’t look like an Excel workbook.')

  // sheet name → rId → target file
  const relsXml = await read('xl/_rels/workbook.xml.rels')
  const targets = new Map()
  if (relsXml) {
    for (const rel of byTag(xml(relsXml), 'Relationship')) {
      targets.set(rel.getAttribute('Id'), rel.getAttribute('Target').replace(/^\/?(xl\/)?/, 'xl/'))
    }
  }

  const sharedXml = await read('xl/sharedStrings.xml')
  const shared = sharedXml
    ? byTag(xml(sharedXml), 'si').map((si) => byTag(si, 't').map((t) => t.textContent).join(''))
    : []

  const sheets = []
  const sheetEls = byTag(xml(workbookXml), 'sheet')
  for (let i = 0; i < sheetEls.length; i++) {
    const el = sheetEls[i]
    const rid = el.getAttribute('r:id') ?? el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const path = targets.get(rid) ?? `xl/worksheets/sheet${i + 1}.xml`
    const sheetXml = await read(path)
    if (sheetXml) sheets.push({ name: el.getAttribute('name'), rows: sheetRows(xml(sheetXml), shared) })
  }
  return sheets
}

function sheetRows(doc, shared) {
  const rows = []
  for (const rowEl of byTag(doc, 'row')) {
    const r = Number(rowEl.getAttribute('r')) - 1
    const cells = []
    for (const c of byTag(rowEl, 'c')) {
      const col = colIndex(c.getAttribute('r'))
      const type = c.getAttribute('t')
      let value = ''
      if (type === 'inlineStr') value = byTag(c, 't').map((t) => t.textContent).join('')
      else {
        const v = byTag(c, 'v')[0]?.textContent ?? ''
        if (type === 's') value = shared[Number(v)] ?? ''
        else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE'
        else value = v
      }
      cells[col] = value
    }
    // Rows can be sparse (blank rows skipped in the XML) — keep positions so
    // error messages can quote the real Excel row number
    rows[Number.isFinite(r) && r >= 0 ? r : rows.length] = Array.from(cells, (v) => v ?? '')
  }
  return Array.from(rows, (row) => row ?? [])
}

// "C7" → 2
function colIndex(ref) {
  let n = 0
  for (const ch of String(ref).replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64)
  return Math.max(n - 1, 0)
}

// getElementsByTagName ignores namespace prefixes differently across
// browsers; matching on localName is reliable everywhere
function byTag(root, local) {
  return Array.from(root.getElementsByTagName('*')).filter((el) => el.localName === local)
}

// ── Minimal zip reader ───────────────────────────────────────────────────

function listZip(buffer) {
  const view = new DataView(buffer)
  // End of central directory: scan back from the end for its signature
  let eocd = -1
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new SheetError('That file doesn’t look like an Excel workbook.')

  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const entries = new Map()
  const decoder = new TextDecoder()
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break
    const method = view.getUint16(p + 10, true)
    const compressedSize = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const localOffset = view.getUint32(p + 42, true)
    const name = decoder.decode(new Uint8Array(buffer, p + 46, nameLen))
    entries.set(name, { method, compressedSize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function inflate(buffer, { method, compressedSize, localOffset }) {
  const view = new DataView(buffer)
  const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true)
  const data = new Uint8Array(buffer, start, compressedSize)
  if (method === 0) return data // stored
  if (method !== 8) throw new SheetError('That workbook uses a compression this app can’t read.')
  if (typeof DecompressionStream === 'undefined') {
    throw new SheetError('This browser can’t read .xlsx files. Save the sheet as .csv and upload that instead.')
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
