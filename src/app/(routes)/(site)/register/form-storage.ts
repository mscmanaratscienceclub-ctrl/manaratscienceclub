/**
 * localStorage helpers for the application forms' draft + "already submitted"
 * state. Every form namespaces its own keys so switching programme never leaks
 * one form's answers into another.
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
