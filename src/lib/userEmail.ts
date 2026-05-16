const KEY = 'iron-clad-user-email'

export function getStoredUserEmail(): string | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  const e = raw.trim().toLowerCase()
  return e.length > 0 ? e : null
}

export function setStoredUserEmail(email: string): void {
  localStorage.setItem(KEY, email.trim().toLowerCase())
}

export function clearStoredUserEmail(): void {
  localStorage.removeItem(KEY)
}
