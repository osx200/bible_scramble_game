// Room codes: a Bible word + 4 random digits, e.g. BETHEL4827.
// Easy to read aloud across a room, 900k combinations (90 words x 10,000), generated with
// crypto randomness and collision-checked. Guessing is further blunted by the
// per-IP limit on failed lookups (see http.js).
import { randomInt } from 'node:crypto'

const WORDS = [
  'ABRAHAM', 'ADAM', 'AMOS', 'ANDREW', 'ARK', 'BARNABAS', 'BETHANY', 'BETHEL', 'BETHLEHEM',
  'BOAZ', 'CALEB', 'CANAAN', 'CARMEL', 'CEDAR', 'DANIEL', 'DAVID', 'DEBORAH', 'DOVE', 'EDEN',
  'ELIJAH', 'ELISHA', 'EMMAUS', 'ESTHER', 'EZRA', 'GALILEE', 'GIDEON', 'GILEAD', 'GOSHEN',
  'GRACE', 'HANNAH', 'HEBRON', 'HOPE', 'HOREB', 'HOSEA', 'ISAAC', 'ISAIAH', 'JACOB', 'JAMES',
  'JERICHO', 'JOEL', 'JONAH', 'JORDAN', 'JOSEPH', 'JOSHUA', 'JOY', 'JUDAH', 'LAMP', 'LIGHT',
  'LUKE', 'LYDIA', 'MANNA', 'MARK', 'MARTHA', 'MARY', 'MATTHEW', 'MICAH', 'MIRIAM', 'MORIAH',
  'MOSES', 'NAOMI', 'NAZARETH', 'NEHEMIAH', 'NOAH', 'OLIVE', 'PATMOS', 'PAUL', 'PEACE',
  'PETER', 'PHILIP', 'PRISCILLA', 'PSALM', 'RACHEL', 'REBEKAH', 'RUTH', 'SALEM', 'SAMUEL',
  'SARAH', 'SHALOM', 'SHARON', 'SHILOH', 'SILAS', 'SINAI', 'SOLOMON', 'STEPHEN', 'TABITHA',
  'THOMAS', 'TIMOTHY', 'TITUS', 'VINE', 'ZION',
]

export function newRoomCode(isTaken) {
  for (let i = 0; i < 50; i++) {
    const word = WORDS[randomInt(WORDS.length)]
    const code = `${word}${String(randomInt(10000)).padStart(4, '0')}`
    if (!isTaken(code)) return code
  }
  throw new Error('Could not allocate a room code')
}

/** "bethel 4827", "Bethel-4827" → "BETHEL4827"; anything else → null */
export function normaliseRoomCode(raw) {
  if (typeof raw !== 'string') return null
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z]{2,12}\d{4}$/.test(code) ? code : null
}
