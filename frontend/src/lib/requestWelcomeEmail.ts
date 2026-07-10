/** Fire-and-forget: welcome email is sent at most once per user (server-side guard). */
export function requestWelcomeEmail(accessToken: string | undefined | null) {
  if (!accessToken) return;
  void fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/welcome-email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}
