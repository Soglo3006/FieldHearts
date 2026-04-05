import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isPresenceOnline, type PresenceRecord } from '@/lib/presence';

export function useUserPresence(otherUserId?: string) {
  const [presenceState, setPresenceState] = useState<{ userId?: string; isOnline: boolean }>({
    userId: undefined,
    isOnline: false,
  });
  const presenceRef = useRef<PresenceRecord | null>(null);

  useEffect(() => {
    if (!otherUserId) {
      presenceRef.current = null;
      return;
    }

    const fetchPresence = async () => {
      const { data } = await supabase
        .from('user_presence')
        .select('is_online, last_seen')
        .eq('user_id', otherUserId)
        .maybeSingle();

      presenceRef.current = data;
      setPresenceState({ userId: otherUserId, isOnline: isPresenceOnline(data) });
    };

    void fetchPresence();

    // Re-check stale status every 10s using local ref — no API call
    const staleCheckInterval = window.setInterval(() => {
      setPresenceState((current) => {
        if (current.userId !== otherUserId) return current;
        return { userId: otherUserId, isOnline: isPresenceOnline(presenceRef.current) };
      });
    }, 10_000);

    // Realtime handles live updates — no redundant poll needed
    const channel = supabase
      .channel(`presence-${otherUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${otherUserId}`,
      }, (payload) => {
        const nextPresence = payload.new as PresenceRecord;
        presenceRef.current = nextPresence;
        setPresenceState({ userId: otherUserId, isOnline: isPresenceOnline(nextPresence) });
      })
      .subscribe();

    return () => {
      window.clearInterval(staleCheckInterval);
      presenceRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [otherUserId]);

  return presenceState.userId === otherUserId ? presenceState.isOnline : false;
}