"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/Spinner";
import { Search, ChevronLeft, ShieldOff, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  full_name: string | null;
  company_name: string | null;
  account_type: string;
  email: string;
  province: string | null;
  is_suspended: boolean;
  created_at: string;
  booking_count: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!isAdminUser(user)) { router.replace("/"); return; }
    setAllowed(true);
  }, [user, loading, router]);

  const fetchUsers = useCallback(async (q = "") => {
    if (!session?.access_token) return;
    setFetching(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/profiles/admin/all${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      setUsers(await res.json());
    } catch {
    } finally {
      setFetching(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (allowed) fetchUsers();
  }, [allowed, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    if (!session?.access_token) return;
    if (!window.confirm(suspend ? "Suspendre ce compte ?" : "Réactiver ce compte ?")) return;
    setSuspendLoading(userId);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${userId}/suspend`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ suspend }),
      });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_suspended: suspend } : u));
    } catch {
    } finally {
      setSuspendLoading(null);
    }
  };

  if (!allowed) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérer et suspendre les comptes</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* Users list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{users.length} utilisateur{users.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fetching ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">Aucun utilisateur trouvé</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar placeholder */}
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-semibold text-gray-500">
                    {(u.full_name || u.company_name || "?")[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.account_type === "company" ? u.company_name : u.full_name}
                      </p>
                      {u.is_suspended && (
                        <Badge variant="destructive" className="text-xs">Suspendu</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{u.email} · {u.province ?? "—"} · {u.booking_count} réservation{Number(u.booking_count) !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Action */}
                  <Button
                    size="sm"
                    variant={u.is_suspended ? "outline" : "destructive"}
                    className="shrink-0 gap-1.5"
                    disabled={suspendLoading === u.id}
                    onClick={() => handleSuspend(u.id, !u.is_suspended)}
                  >
                    {suspendLoading === u.id ? (
                      <Spinner size="sm" />
                    ) : u.is_suspended ? (
                      <><ShieldCheck className="h-3.5 w-3.5" /> Réactiver</>
                    ) : (
                      <><ShieldOff className="h-3.5 w-3.5" /> Suspendre</>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
