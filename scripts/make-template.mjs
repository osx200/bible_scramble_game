// Generates public/templates/bible-games-template.xlsx — the workbook the
// Quiz & Scramble Builder offers for bulk upload.
//
//   node scripts/make-template.mjs
//
// Node built-ins only: the .xlsx is written by hand as a "stored" (no
// compression) zip of SpreadsheetML parts, which every spreadsheet app opens.
// Re-run it after changing the columns, and keep src/utils/builderImport.js's
// header names in step with SCRAMBLE_HEADERS / QUIZ_HEADERS below.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'templates', 'bible-games-template.xlsx')

const SCRAMBLE_HEADERS = ['Word', 'Clue', 'Difficulty']
const QUIZ_HEADERS = ['Question', 'Answer', 'Bible Reference']
const DATA_ROWS = 300 // matches the builder's per-upload limit

const INSTRUCTIONS = [
  ['Bible Games: Quiz & Scramble upload template'],
  [''],
  ['How to use this file'],
  ['1. Fill in the "Scramble" sheet, the "Quiz" sheet, or both. Keep the header row (row 1) as it is.'],
  ['2. Save the file (Excel Workbook .xlsx, or CSV if you prefer).'],
  ['3. In Bible Games open "Quiz & Scramble Builder", choose the Quiz or Scramble tab and press Upload.'],
  ['4. Uploaded words and questions are only kept for that session. Nothing is saved online.'],
  [''],
  ['Scramble sheet'],
  ['Word: required. The word or name players unscramble, e.g. Hannah or 1 Samuel (2 to 30 letters).'],
  ['Clue: optional. Shown when the host presses "Show clue", e.g. Mother of Samuel.'],
  ['Difficulty: optional. Easy, Medium or Hard. Left blank, it is guessed from the length of the word.'],
  [''],
  ['Quiz sheet'],
  ['Question: required.'],
  ['Answer: required.'],
  ['Bible Reference: optional, shown with the answer, e.g. 1 Samuel 1:20.'],
  [''],
  ['Examples (do not copy these rows onto the other sheets unless you want them in your game)'],
  ['Scramble:', 'Hannah', 'Mother of Samuel', 'Easy'],
  ['Scramble:', 'Nebuchadnezzar', 'King of Babylon', 'Hard'],
  ['Quiz:', 'Who was swallowed by a great fish?', 'Jonah', 'Jonah 1:17'],
]

// ── SpreadsheetML ─────────────────────────────────────────────

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const colName = (i) => String.fromCharCode(65 + i)

function cell(ref, value, style = 0) {
  return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${esc(value)}</t></is></c>`
}

function sheetXml({ rows, widths, freezeHeader = false, headerStyle = 0, validation = null }) {
  const views = freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0" tabSelected="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
  const cols = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
  const data = rows
    .map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(`${colName(c)}${r + 1}`, v, r === 0 ? headerStyle : 0)).join('')}</row>`)
    .join('')
  const dv = validation
    ? `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Difficulty" error="Choose Easy, Medium or Hard, or leave it blank." sqref="${validation.range}"><formula1>"${validation.list}"</formula1></dataValidation></dataValidations>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${views}<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${data}</sheetData>${dv}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`
}

// Style 1: bold header on a cream fill with a bottom border (the app's palette)
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF7B2433"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF7B2433"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0E8D8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="medium"><color rgb="FFB08A3E"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

const SHEETS = [
  { name: 'Instructions', xml: sheetXml({ rows: INSTRUCTIONS, widths: [96, 34, 22, 14], headerStyle: 2 }) },
  {
    name: 'Scramble',
    xml: sheetXml({
      rows: [SCRAMBLE_HEADERS],
      widths: [28, 44, 14],
      freezeHeader: true,
      headerStyle: 1,
      validation: { range: `C2:C${DATA_ROWS + 1}`, list: 'Easy,Medium,Hard' },
    }),
  },
  { name: 'Quiz', xml: sheetXml({ rows: [QUIZ_HEADERS], widths: [60, 34, 22], freezeHeader: true, headerStyle: 1 }) },
]

const parts = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${SHEETS.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${SHEETS.map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${SHEETS.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${SHEETS.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  'xl/styles.xml': STYLES,
  ...Object.fromEntries(SHEETS.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s.xml])),
}

// ── Stored zip ────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  // Fixed timestamp (1 Jan 2026) so re-running the script gives identical bytes
  const DOS_TIME = 0
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1
  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8')
    const data = Buffer.from(text, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(0, 8) // stored
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBuf, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(DOS_TIME, 12)
    central.writeUInt16LE(DOS_DATE, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + data.length
  }
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBuf, end])
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, zip(parts))
console.log(`Wrote ${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes)`)
