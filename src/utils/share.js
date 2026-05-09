const API = './tennis-save.php'

// Unambiguous characters — easy to read aloud or type on mobile
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PIN_KEY = 'feedin-pin' // stored in localStorage, scoped per device
const RECENT_KEY = 'feedin-recent-rooms'
const RECENT_LIMIT = 10

export function generateRoomCode() {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

/**
 * Per-device cache of room codes the pro has visited. Powers the
 * "Recent tournaments" list on the home screen so they can hop
 * between events without re-typing the code or hunting for a link.
 *
 * Stored locally only — server-side has no notion of "which device
 * touched this room." That's fine for the single-club use case, and
 * keeps room visibility explicit: only people who've been handed the
 * link can navigate to a tournament.
 */
export function getRecentRooms() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function trackRoomVisit({ code, name, date }) {
  if (!code) return
  try {
    const list = getRecentRooms().filter(r => r.code !== code)
    list.unshift({
      code,
      name: name || '',
      date: date || '',
      lastVisited: Date.now(),
    })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)))
  } catch {}
}

export function removeRecentRoom(code) {
  try {
    const list = getRecentRooms().filter(r => r.code !== code)
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {}
}

export function getStoredPin() {
  try {
    return localStorage.getItem(PIN_KEY) || ''
  } catch {
    return ''
  }
}

export function setStoredPin(pin) {
  try {
    if (pin) localStorage.setItem(PIN_KEY, pin)
    else localStorage.removeItem(PIN_KEY)
  } catch {}
}

/**
 * Save state to the server under a room code.
 * If the room is PIN-protected the server checks the X-Tournament-Pin header.
 * Returns { ok, status } so callers can detect a 403 (bad pin) and prompt.
 */
export async function saveToRoom(code, state) {
  try {
    const res = await fetch(`${API}?code=${code}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tournament-Pin': getStoredPin(),
      },
      body: JSON.stringify(state),
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

/**
 * Reads are always public — anyone with the link can view a tournament.
 */
export async function loadFromRoom(code) {
  try {
    const res = await fetch(`${API}?code=${code}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Probe whether the current stored PIN is accepted for this room.
 * The server has a `?check=1` mode that returns 200/403 without writing.
 */
export async function checkPin(code) {
  try {
    const res = await fetch(`${API}?code=${code}&check=1`, {
      method: 'POST',
      headers: { 'X-Tournament-Pin': getStoredPin() },
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * URL hash holds the room code so iPads can refresh without losing it.
 */
export function getRoomCodeFromURL() {
  const match = window.location.hash.match(/[#&]room=([A-Z0-9]{6})/)
  return match ? match[1] : null
}

export function setRoomCodeInURL(code) {
  history.replaceState(null, '', `#room=${code}`)
}

export function exportJSON(state) {
  const filename = state.tournament.name
    ? `${state.tournament.name.replace(/\s+/g, '-').toLowerCase()}.json`
    : 'tournament.json'
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file, dispatch) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target.result)
        dispatch({ type: 'LOAD_STATE', payload: state })
        resolve(state)
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Hash a PIN with SubtleCrypto. Server stores the same hash so we never
 * write the plaintext PIN to disk. Falls back to a simple hash if the
 * crypto API is unavailable.
 */
export async function hashPin(pin) {
  if (window.crypto?.subtle) {
    const enc = new TextEncoder().encode(`feedin:${pin}`)
    const buf = await window.crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h = 0
  for (let i = 0; i < pin.length; i++) h = (h * 31 + pin.charCodeAt(i)) >>> 0
  return h.toString(16)
}
