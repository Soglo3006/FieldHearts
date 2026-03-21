import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export interface BookingNotif {
  id: string;
  service_title: string;
  other_name: string;
  other_avatar: string | null;
  status: string;
  created_at: string;
  role: "worker" | "client";
  seen: boolean;
}

// Same keys as bookings/page.tsx so the two systems stay in sync
const RECEIVED_SEEN_KEY = (uid: string) => `bookings_received_seen_${uid}`;
const SENT_SEEN_KEY     = (uid: string) => `bookings_sent_seen_${uid}`;

function lsGetIds(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}
function lsSaveIds(key: string, ids: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...ids])); } catch {}
}

export function useUnreadBookings() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<BookingNotif[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;

    const seenReceived = lsGetIds(RECEIVED_SEEN_KEY(user.id));
    const seenSent     = lsGetIds(SENT_SEEN_KEY(user.id));

    // Worker side: pending requests (badge on "Received" tab)
    const { data: workerBookings } = await supabase
      .from("bookings")
      .select("id, status, created_at, service_id, client_id")
      .eq("worker_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    // Client side: accepted / refused responses (badge on "Sent" tab)
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: clientBookings } = await supabase
      .from("bookings")
      .select("id, status, created_at, service_id, worker_id")
      .eq("client_id", user.id)
      .in("status", ["accepted", "refused"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10);

    const serviceIds = [
      ...new Set([
        ...(workerBookings || []).map((b) => b.service_id),
        ...(clientBookings || []).map((b) => b.service_id),
      ]),
    ].filter(Boolean);

    const profileIds = [
      ...new Set([
        ...(workerBookings || []).map((b) => b.client_id),
        ...(clientBookings || []).map((b) => b.worker_id),
      ]),
    ].filter(Boolean);

    const [{ data: services }, { data: profiles }] = await Promise.all([
      serviceIds.length
        ? supabase.from("services").select("id, title").in("id", serviceIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? supabase.from("profiles").select("id, full_name, company_name, account_type, avatar_url").in("id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const serviceMap = Object.fromEntries((services || []).map((s) => [s.id, s]));
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const result: BookingNotif[] = [];

    for (const b of workerBookings || []) {
      const client = profileMap[b.client_id];
      const name = client?.account_type === "company" ? client?.company_name : client?.full_name;
      result.push({
        id: b.id,
        service_title: serviceMap[b.service_id]?.title || "Service",
        other_name: name || "Client",
        other_avatar: client?.avatar_url || null,
        status: b.status,
        created_at: b.created_at,
        role: "worker",
        seen: seenReceived.has(b.id),
      });
    }

    for (const b of clientBookings || []) {
      const worker = profileMap[b.worker_id];
      const name = worker?.account_type === "company" ? worker?.company_name : worker?.full_name;
      result.push({
        id: b.id,
        service_title: serviceMap[b.service_id]?.title || "Service",
        other_name: name || "Worker",
        other_avatar: worker?.avatar_url || null,
        status: b.status,
        created_at: b.created_at,
        role: "client",
        seen: seenSent.has(b.id),
      });
    }

    result.sort((a, b) => {
      if (a.seen !== b.seen) return a.seen ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setNotifs(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => { setNotifs([]); setLoading(false); });
      return;
    }

    Promise.resolve().then(() => fetchNotifs());

    const channel = supabase
      .channel("booking-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, fetchNotifs)
      .subscribe();

    // Re-fetch when bookings page marks items as seen
    const onSeenUpdated = () => fetchNotifs();
    window.addEventListener("bookings-seen-updated", onSeenUpdated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("bookings-seen-updated", onSeenUpdated);
    };
  }, [user, fetchNotifs]);

  const unseenCount = notifs.filter((n) => !n.seen).length;

  const markSeen = useCallback((id: string) => {
    if (!user) return;
    const notif = notifs.find((n) => n.id === id);
    if (!notif) return;
    const key = notif.role === "worker"
      ? RECEIVED_SEEN_KEY(user.id)
      : SENT_SEEN_KEY(user.id);
    const ids = lsGetIds(key);
    ids.add(id);
    lsSaveIds(key, ids);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, seen: true } : n));
  }, [user, notifs]);

  const markAllSeen = useCallback(() => {
    if (!user) return;
    const recIds = lsGetIds(RECEIVED_SEEN_KEY(user.id));
    const sentIds = lsGetIds(SENT_SEEN_KEY(user.id));
    notifs.forEach((n) => {
      if (n.role === "worker") recIds.add(n.id);
      else sentIds.add(n.id);
    });
    lsSaveIds(RECEIVED_SEEN_KEY(user.id), recIds);
    lsSaveIds(SENT_SEEN_KEY(user.id), sentIds);
    setNotifs((prev) => prev.map((n) => ({ ...n, seen: true })));
    window.dispatchEvent(new Event("bookings-seen-updated"));
  }, [user, notifs]);

  const markReadByLink = useCallback((_linkSubstring: string) => {}, []);

  return { notifs, loading, unseenCount, markSeen, markAllSeen, markReadByLink };
}
