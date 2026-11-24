// WebSocket message validation. Anything that isn't a known type with the
// expected field types and sizes is rejected before it reaches a room.
//
// Client → server:
//   resume        { code, token, reconnect? }   must be the first message
//   answer        { text } or { texts: [≤10] } (Book Recall: several books per phrase)
//   set_team      { teamId }
//   host only:    start · pause · resume_game · skip · reveal · next · end ·
//                 restart · close · kick { playerId } · accept { playerId, accept } ·
//                 update_settings { settings }
// Every message may carry actionId (de-duplicated per connection).
//
// Server → client:
//   snapshot  full per-viewer state after every change (never an unrevealed answer)
//   notice    { text, tone } — joined / left / paused / host changed…
//   error     { message, action }
//   closed    { reason, message } — room over or player removed; the socket closes

const isStr = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max

const SCHEMAS = {
  resume: (m) => isStr(m.code, 20) && isStr(m.token, 64),
  // `texts`: Book Recall, where one spoken phrase can name several books
  answer: (m) => isStr(m.text, 200)
    || (Array.isArray(m.texts) && m.texts.length > 0 && m.texts.length <= 10 && m.texts.every((t) => isStr(t, 60))),
  set_team: (m) => isStr(m.teamId, 8),
  start: () => true,
  pause: () => true,
  resume_game: () => true,
  skip: () => true,
  reveal: () => true,
  next: () => true,
  end: () => true,
  restart: () => true,
  close: () => true,
  kick: (m) => isStr(m.playerId, 16),
  accept: (m) => isStr(m.playerId, 16) && typeof m.accept === 'boolean',
  update_settings: (m) => Boolean(m.settings) && typeof m.settings === 'object',
}

export const HOST_ONLY = new Set([
  'start', 'pause', 'resume_game', 'skip', 'reveal', 'next', 'end', 'restart', 'close', 'kick', 'accept', 'update_settings',
])
export const PLAYER_ONLY = new Set(['answer', 'set_team'])

export const MAX_MESSAGE_BYTES = 8 * 1024

/** raw frame → message object, or null when it should be ignored */
export function parseMessage(raw) {
  if (raw.length > MAX_MESSAGE_BYTES) return null
  let msg
  try {
    msg = JSON.parse(raw.toString('utf8'))
  } catch {
    return null
  }
  if (!msg || typeof msg !== 'object' || !Object.hasOwn(SCHEMAS, msg.type)) return null
  if (msg.actionId !== undefined && !isStr(msg.actionId, 40)) return null
  return SCHEMAS[msg.type](msg) ? msg : null
}
