"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "ready" | "slow" | "error";

const HEALTH_URL = `${process.env.NEXT_PUBLIC_API_URL}/health`;
const FAST_TIMEOUT_MS = 3_000;   // show "slow" banner after 3 s
const RETRY_INTERVAL_MS = 3_000; // retry every 3 s
const MAX_WAIT_MS = 90_000;      // give up after 90 s

export function useBackendReady() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    // First fast probe — if the backend responds quickly, skip the loading screen
    const fastTimer = setTimeout(() => {
      if (!cancelled) setStatus("slow");
    }, FAST_TIMEOUT_MS);

    async function probe() {
      if (cancelled) return;

      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        if (!cancelled) setStatus("error");
        return;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);

        const res = await fetch(HEALTH_URL, {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);

        if (!cancelled && res.ok) {
          clearTimeout(fastTimer);
          setStatus("ready");
          return;
        }
      } catch {
        // timeout or network error — retry below
      }

      if (!cancelled) {
        retryTimer = setTimeout(probe, RETRY_INTERVAL_MS);
      }
    }

    probe();

    return () => {
      cancelled = true;
      clearTimeout(fastTimer);
      clearTimeout(retryTimer);
    };
  }, []);

  return status;
}
