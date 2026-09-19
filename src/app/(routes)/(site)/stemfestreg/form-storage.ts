/**
 * localStorage helpers for the registration form's draft + "already submitted"
 * state. Keys stay namespaced per form so one form's answers can never leak
 * into another's.
 */

export function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — drafts are a nicety, never a blocker */
  }
}

export function removeStored(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* see above */
  }
}
