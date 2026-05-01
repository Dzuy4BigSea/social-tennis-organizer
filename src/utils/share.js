const API = './tennis-save.php'

// Unambiguous characters — easy to read aloud or type on mobile
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode() {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

/**
 * Save state to the server under a room code.
 * Returns true on success, false on failure.
 */
export async function saveToRoom(code, state) {
  try {
    const res = await fetch(`${API}?code=${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Load state from the server by room code.
 * Returns parsed state or null if not found / error.
 */
export async function loadFromRoom(code) {
  try {
    const res = await fetch(`${API}?code=${code}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Get the room code from the URL hash (#room=ABC123), if present.
 */
export function getRoomCodeFromURL() {
  const match = window.location.hash.match(/[#&]room=([A-Z0-9]{6})/)
  return match ? match[1] : null
}

/**
 * Set the room code in the URL hash without a page reload.
 */
export function setRoomCodeInURL(code) {
  history.replaceState(null, '', `#room=${code}`)
}

/**
 * Export the current tournament state as a JSON file download.
 */
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

/**
 * Import tournament state from a JSON file via FileReader.
 */
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
