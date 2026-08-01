/**
 * Wraps an async function with a try/catch block to prevent server-side
 * rendering crashes when a data source (like a database query) fails.
 */
export async function safeLoad<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[safeLoad] "${label}" failed:`, err)
    return fallback
  }
}
