import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Sends presence heartbeats through the backend (pool query) instead of
 * Supabase REST API — eliminates ~1M Supabase egress calls/month per user.
 */
export function usePresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const getToken = async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    };

    const sendPresence = async (isOnline: boolean, activeChatId?: string | null) => {
      const token = await getToken();
      if (!token) return;
      fetch(`${API}/profiles/presence`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_online: isOnline, active_chat_id: activeChatId ?? null }),
      }).catch(() => {});
    };

    const setOnline = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      sendPresence(true);
    };

    const setOffline = () => {
      if (!navigator.onLine) return;
      sendPresence(false);
    };

    setOnline();

    const heartbeat = window.setInterval(setOnline, PRESENCE_HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') { setOnline(); return; }
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    window.addEventListener('pagehide', setOffline);

    return () => {
      window.clearInterval(heartbeat);
      setOffline();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
      window.removeEventListener('pagehide', setOffline);
    };
  }, [userId]);
}
