/**
 * Returns a clean, user-friendly error message from an API response or exception.
 * Never exposes raw backend internals to the user.
 */
export async function getApiErrorMessage(
  res: Response,
  fallback = "Something went wrong. Please try again."
): Promise<string> {
  try {
    const data = await res.json();
    // Only show the backend message if it's a short, safe string
    if (typeof data?.message === "string" && data.message.length < 200) {
      return data.message;
    }
  } catch {
    // ignore JSON parse errors
  }
  return fallback;
}

/** Wraps an unknown catch value into a safe display string */
export function getSafeErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err instanceof Error && err.message.length < 200) {
    return err.message;
  }
  return fallback;
}
