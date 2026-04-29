export const POST_PATH = "/post" as const;

/** Login with return to the post page after sign-in (query key matches login page + useProtectedRoute). */
export const POST_LOGIN_REDIRECT = `/login?redirect=${encodeURIComponent(POST_PATH)}`;
