const DISPUTE_WINDOW_DAYS = 3;

export function getDisputeWindowState(completedAt?: string | null) {
  if (!completedAt) {
    return {
      isOpen: false,
      isExpired: false,
      remainingMs: null as number | null,
    };
  }

  const completedMs = new Date(completedAt).getTime();
  if (Number.isNaN(completedMs)) {
    return {
      isOpen: false,
      isExpired: false,
      remainingMs: null as number | null,
    };
  }

  const deadlineMs = completedMs + DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = deadlineMs - Date.now();

  return {
    isOpen: remainingMs > 0,
    isExpired: remainingMs <= 0,
    remainingMs,
  };
}