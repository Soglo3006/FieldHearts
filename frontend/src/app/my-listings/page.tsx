"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PostPublishLink } from "@/components/navigation/PostPublishLink";
import { Plus, Grid3x3, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AppImage from "@/components/ui/AppImage";
import EditListingModal from "@/components/listings/EditListingModal";
import { Spinner } from "@/components/ui/Spinner";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { formatListingPriceLine } from "@/lib/listingPrice";

const PAGE_SIZE = 9;

interface MyService extends ServiceLikeWithI18n {
  id: string;
  type: "offer" | "looking";
  title: string;
  description: string;
  price: string | number | null;
  pricing_mode?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean;
  category: string | null;
  subcategory: string | null;
  poster_type: string | null;
  availability: string | null;
  language: string | null;
  mobility: string | null;
  duration: string | null;
  urgency: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at: string;
  is_active: boolean;
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {start > 1 && (
        <>
          <button type="button" onClick={() => onChange(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border text-sm hover:bg-gray-50 cursor-pointer transition-colors">1</button>
          {start > 2 && <span className="text-gray-400 text-sm px-1">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border text-sm cursor-pointer transition-colors ${
            p === page ? "bg-green-700 border-green-700 text-white font-semibold" : "hover:bg-gray-50 text-gray-700"
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-gray-400 text-sm px-1">…</span>}
          <button type="button" onClick={() => onChange(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg border text-sm hover:bg-gray-50 cursor-pointer transition-colors">{totalPages}</button>
        </>
      )}

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ListingCard({
  s, historical = false, confirmDeleteId, deletingId, onEdit, onConfirmDelete, onDelete, t, i18nLang,
}: {
  s: MyService;
  historical?: boolean;
  confirmDeleteId: string | null;
  deletingId: string | null;
  onEdit: (s: MyService) => void;
  onConfirmDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  i18nLang: string | undefined;
}) {
  const thumb = s.image_urls?.[0] ?? s.image_url;
  const displayTitle = resolveListingTitle(s, i18nLang);
  return (
    <div className={`border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden transition-all ${historical ? "opacity-60" : "hover:shadow-lg"}`}>
      <Link href={`/serviceDetail/${s.id}`} className="block">
        <AspectRatio ratio={16 / 9}>
          <div className="relative h-full w-full">
            <ListingLangPills service={s} />
            {thumb ? (
              <AppImage src={thumb} alt={displayTitle} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <Grid3x3 className="h-12 w-12 text-gray-300" />
              </div>
            )}
          </div>
        </AspectRatio>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-2 mb-1">
          <Link href={`/serviceDetail/${s.id}`} className="flex-1">
            <h3 className="font-semibold text-gray-900 line-clamp-1 hover:text-green-700 transition-colors">
              {displayTitle}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            {historical && (
              <Badge className="bg-gray-100 text-gray-500 text-xs border-0">{t("myListings.completed")}</Badge>
            )}
            {s.type === "looking" && (
              <Badge className="bg-blue-100 text-blue-700 text-xs border-0">{t("myListings.looking")}</Badge>
            )}
          </div>
        </div>

        <p className="text-green-700 font-bold text-lg mb-2">{formatListingPriceLine(t, s)}</p>

        <div className="flex items-center text-sm text-gray-500 mb-2">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
        </div>

        {s.category && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-3">
            {s.category}{s.subcategory && ` • ${s.subcategory}`}
          </p>
        )}

        {!historical && (
          <div className="mt-auto pt-3 border-t border-gray-100 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => onEdit(s)}>
              {t("myListings.edit")}
            </Button>
            {confirmDeleteId === s.id ? (
              <>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  onClick={() => onDelete(s.id)}
                  disabled={deletingId === s.id}
                >
                  {deletingId === s.id ? "…" : t("common.confirm")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onConfirmDelete(null)}>{t("common.cancel")}</Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 flex-1"
                onClick={() => onConfirmDelete(s.id)}
              >
                {t("myListings.delete")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyListingsPage() {
  const { t, i18n } = useTranslation();
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [listings, setListings] = useState<MyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<MyService | null>(null);

  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!session?.access_token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/my-services`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [user, session, router, authLoading]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) setListings((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const activeListings = listings.filter((s) => s.is_active);
  const historyListings = listings.filter((s) => !s.is_active);

  const pagedActive = activeListings.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const pagedHistory = historyListings.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("myListings.title")}</h1>
          <PostPublishLink>
            <Button className="bg-green-700 hover:bg-green-800 text-white gap-2">
              <Plus className="h-4 w-4" />
              {t("myListings.newListing")}
            </Button>
          </PostPublishLink>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-xl shadow-sm bg-white animate-pulse overflow-hidden">
                <div className="w-full aspect-video bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded w-16" />
                  <div className="h-8 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Grid3x3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">{t("myListings.noListings")}</p>
            <PostPublishLink className="text-sm text-green-700 hover:underline mt-2 inline-block">
              {t("myListings.postFirstListing")}
            </PostPublishLink>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Active listings */}
            {activeListings.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                  {t("myListings.active")} ({activeListings.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pagedActive.map((s) => (
                    <ListingCard
                      key={s.id} s={s}
                      confirmDeleteId={confirmDeleteId} deletingId={deletingId}
                      onEdit={setEditingService} onConfirmDelete={setConfirmDeleteId} onDelete={handleDelete}
                      t={t}
                      i18nLang={i18n.language}
                    />
                  ))}
                </div>
                <Pagination
                  page={activePage}
                  total={activeListings.length}
                  onChange={(p) => { setActivePage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                />
              </div>
            )}

            {/* Historical listings */}
            {historyListings.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                  {t("myListings.history")} ({historyListings.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pagedHistory.map((s) => (
                    <ListingCard
                      key={s.id} s={s} historical
                      confirmDeleteId={confirmDeleteId} deletingId={deletingId}
                      onEdit={setEditingService} onConfirmDelete={setConfirmDeleteId} onDelete={handleDelete}
                      t={t}
                      i18nLang={i18n.language}
                    />
                  ))}
                </div>
                <Pagination
                  page={historyPage}
                  total={historyListings.length}
                  onChange={(p) => setHistoryPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {editingService && session?.access_token && (
        <EditListingModal
          service={editingService}
          accessToken={session.access_token}
          onClose={() => setEditingService(null)}
          onSaved={(updated) => {
            setListings((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setEditingService(null);
          }}
        />
      )}
    </div>
  );
}
