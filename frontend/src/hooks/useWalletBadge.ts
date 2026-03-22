import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

const WALLET_SEEN_KEY = (userId: string) => `wallet_seen_total_${userId}`;

export function useWalletBadge() {
  const { user, session } = useAuth();
  const pathname = usePathname();
  const [hasBadge, setHasBadge] = useState(false);
  const latestTotalRef = useRef(0);

  useEffect(() => {
    if (!user || !session?.access_token) return;

    const check = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const currentTotal = (data.available_for_payout || 0) + (data.pending_amount || 0);
        latestTotalRef.current = currentTotal;
        const seenTotal = parseFloat(localStorage.getItem(WALLET_SEEN_KEY(user.id)) || '0');
        setHasBadge(currentTotal > 0 && currentTotal > seenTotal);
      } catch { /* silent */ }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user, session]);

  // Clear badge when user visits /wallet
  useEffect(() => {
    if (pathname === '/wallet' && user) {
      const total = latestTotalRef.current;
      localStorage.setItem(WALLET_SEEN_KEY(user.id), String(total));
      setHasBadge(false);
    }
  }, [pathname, user]);

  return { walletBadge: hasBadge };
}
