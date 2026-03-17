"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "../../../lib/auth";
import { RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

type Ticket = {
  id: number;
  user_id: string;
  user_email?: string;
  subject?: string;
  category?: string;
  description: string;
  status: string;
  created_at: string;
};

export default function SupportAdminPage() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [openId, setOpenId] = useState<number | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [allowed, setAllowed] = useState(false);

  // Gate: require authenticated admin before rendering page content
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isAdminUser(user)) {
      router.replace("/");
      return;
    }
    setAllowed(true);
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setTicketsLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      } catch (e) {
        setTickets([]);
      } finally {
         setTicketsLoading(false);
      }
    };
    if (allowed) fetchTickets();
  }, [session, allowed]);

  const filtered = useMemo(() => {
    let list = [...tickets];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.subject || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.user_email || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [tickets, search, statusFilter, sort]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      open: "bg-blue-100 text-blue-700",
      in_progress: "bg-yellow-100 text-yellow-700",
      closed: "bg-green-100 text-green-700",
    };
    return <Badge className={map[s] || "bg-gray-100 text-gray-700"}>{s.replace("_", " ")}</Badge>;
  };

  const refresh = async () => {
    try {
      setTicketsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } finally {
      setTicketsLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      setUpdating(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      // ignore for now; could show toast
    } finally {
      setUpdating(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-screen bg-white text-black">
        <main className="max-w-7xl mx-auto p-5">
          <Card className="p-10 text-center">
            <p className="text-gray-600">Loading…</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">

      <main className="max-w-7xl mx-auto p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Support Inbox</h1>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Search subject, email, text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={refresh}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        {ticketsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="xl" />
          </div>
        ) : filtered.length ? (
          <div className="space-y-4">
            {paginated.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900 line-clamp-1">{t.subject || "No subject"}</div>
                  <div className="flex items-center gap-2">
                    {statusBadge(t.status)}
                    <div className="text-sm text-gray-500">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  From: {t.user_email || t.user_id} · Category: {t.category || "N/A"}
                </div>
                <p className="text-gray-800 mt-2 line-clamp-2">{t.description}</p>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenId(t.id)}>View</Button>
                  {t.status !== "in_progress" && (
                    <Button variant="outline" onClick={() => updateStatus(t.id, "in_progress")} disabled={updating}>Mark In Progress</Button>
                  )}
                  {t.status !== "closed" && (
                    <Button className="bg-green-700 text-white hover:bg-green-800" onClick={() => updateStatus(t.id, "closed")} disabled={updating}>Close</Button>
                  )}
                </div>
              </Card>
            ))}
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(1)}>First</Button>
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
              <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(totalPages)}>Last</Button>
            </div>
          </div>
        ) : (
          <Card className="p-10 text-center">
            <p className="text-gray-600">No support messages yet.</p>
          </Card>
        )}
      </main>


      <Dialog open={openId !== null} onOpenChange={(o) => setOpenId(o ? openId : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {openId !== null && (
            (() => {
              const t = tickets.find((x) => x.id === openId)!;
              return (
                <div className="space-y-3">
                  <div className="text-sm text-gray-700"><span className="font-semibold">Subject:</span> {t.subject || "No subject"}</div>
                  <div className="text-sm text-gray-700"><span className="font-semibold">From:</span> {t.user_email || t.user_id}</div>
                  <div className="text-sm text-gray-700"><span className="font-semibold">Category:</span> {t.category || "N/A"}</div>
                  <div className="text-sm text-gray-700"><span className="font-semibold">Created:</span> {new Date(t.created_at).toLocaleString()}</div>
                  <div className="text-sm text-gray-700"><span className="font-semibold">Status:</span> {statusBadge(t.status)}</div>
                  <div className="text-sm text-gray-900"><span className="font-semibold">Description:</span></div>
                  <div className="text-gray-800 whitespace-pre-wrap border rounded p-3 bg-gray-50">{t.description}</div>

                  <div className="pt-2">
                    <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })()
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
