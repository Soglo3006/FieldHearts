/**
 * Persists the site's current language choice to the user's account so backend-driven
 * emails (booking, payment, dispute, etc.) match what they had selected — not just whatever
 * they last saved in Settings. Fire-and-forget; never blocks the auth flow.
 */
export function syncLanguagePreference(accessToken: string) {
  if (typeof window === "undefined" || !accessToken) return;
  const stored = localStorage.getItem("i18nextLng");
  const language = stored?.startsWith("en") ? "en" : "fr";
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ language }),
  }).catch(() => {});
}
