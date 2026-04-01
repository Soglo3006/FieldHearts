import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence';

export function usePresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const upsertPresence = async (isOnline: boolean) => {
      await supabase.from('user_presence').upsert({
        user_id: userId,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };

    const setOnline = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      await upsertPresence(true);
    };

    const setOffline = async () => {
      if (!navigator.onLine) return;
      await upsertPresence(false);
    };

    setOnline();

    const heartbeat = window.setInterval(() => {
      void setOnline();
    }, PRESENCE_HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void setOnline();
        return;
      }

      void setOffline();
    };

    const handleOnline = () => {
      void setOnline();
    };

    const handleOffline = () => {
      void setOffline();
    };

    const handlePageHide = () => {
      void setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(heartbeat);
      void setOffline();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [userId]);
}