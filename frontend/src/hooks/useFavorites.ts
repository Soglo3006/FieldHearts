"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useFavorites() {
  const { user, session } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const token = session?.access_token;

  useEffect(() => {
    if (user && token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites/ids`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data: string[]) => {
          setIds(new Set(data));
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    } else {
      Promise.resolve().then(() => {
        try {
          const raw = localStorage.getItem("savedListings");
          const arr: string[] = raw ? JSON.parse(raw) : [];
          setIds(new Set(arr));
        } catch {
          setIds(new Set());
        }
        setLoaded(true);
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSaved = useCallback(
    (serviceId: string) => ids.has(serviceId),
    [ids]
  );

  const toggle = useCallback(
    async (serviceId: string) => {
      const wasSaved = ids.has(serviceId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(serviceId);
        else next.add(serviceId);
        return next;
      });

      if (user && token) {
        if (wasSaved) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites/${serviceId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        } else {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ service_id: serviceId }),
          }).catch(() => {});
        }
      } else {
        try {
          setIds((current) => {
            localStorage.setItem("savedListings", JSON.stringify([...current]));
            return current;
          });
        } catch {}
      }
    },
    [ids, user, token] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { ids, isSaved, toggle, loaded };
}
