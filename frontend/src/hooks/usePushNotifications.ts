"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL!;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications() {
  const { user, session } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);

  // Sync current permission state
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    if (!user || !session?.access_token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      // Ask permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const keyRes = await fetch(`${API}/notifications/vapid-public-key`);
      const { publicKey } = await keyRes.json();

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey as string),
      });

      // Save subscription to backend
      const subJson = sub.toJSON();
      await fetch(`${API}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      setSubscribed(true);
    } catch (err) {
    }
  };

  const unsubscribe = async () => {
    if (!session?.access_token) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;

      await fetch(`${API}/notifications/unsubscribe`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setSubscribed(false);
    } catch (err) {
    }
  };

  // Auto-subscribe when user logs in (if already granted)
  useEffect(() => {
    if (!user || !session?.access_token) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async (reg) => {
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setSubscribed(true);
      } else {
        // Permission already granted but no sub — re-subscribe silently
        subscribe();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { permission, subscribed, subscribe, unsubscribe };
}
