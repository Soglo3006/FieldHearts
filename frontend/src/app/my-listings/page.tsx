"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PostPublishLink } from "@/components/navigation/PostPublishLink";
import { Plus, Grid3x3, ChevronDown, Clock } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AppImage from "@/components/ui/AppImage";
import EditListingModal from "@/components/listings/EditListingModal";
import BookingSectionPagination from "@/components/bookings/BookingSectionPagination";
import { Spinner } from "@/components/ui/Spinner";
import ListingLocationLine from "@/components/listings/ListingLocationLine";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { formatListingPriceLine } from "@/lib/listingPrice";
import { formatListingCategoryLine } from "@/lib/listingTags";
import { ListingCardSubtitle, ListingCardPriceRow } from "@/components/listings/ListingTrustLine";
import { formatListingCreationDate } from "@/lib/listingDate";
import { cn } from "@/lib/utils";

const SECTION_PAGE_SIZE = 4;

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
  category_name?: string | null;
  subcategory: string | null;
  listing_tags?: unknown;
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
  is_public?: boolean;
  has_open_booking_flow?: boolean;
  completed_bookings_count?: number | string | null;
  review_count?: number | string | null;
  average_rating?: number | string | null;
}

function MyListingsSection({
  title,
  items,
  page,
  slideDir,
  isOpen,
  onToggleOpen,
  onPageChange,
  historical = false,
  confirmDeleteId,
  deletingId,
  onEdit,
  onConfirmDelete,
  onDelete,
  t,
  i18nLang,
  showSeparator,
}: {
  title: string;
  items: MyService[];
  page: number;
  slideDir: "prev" | "next";
  isOpen: boolean;
  onToggleOpen: () => void;
  onPageChange: (page: number) => void;
  historical?: boolean;
  confirmDeleteId: string | null;
  deletingId: string | null;
  onEdit: (s: MyService) => void;
  onConfirmDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  i18nLang: string | undefined;
  showSeparator?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / SECTION_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * SECTION_PAGE_SIZE;
  const pagedItems = items.slice(start, start + SECTION_PAGE_SIZE);

  return (
    <div>
      {showSeparator && <div className="border-t border-gray-200 mb-8" aria-hidden />}
      <div className="mb-3 flex items-center justify-center gap-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest text-center">
          {title}
          <span className="text-gray-300 font-normal normal-case tracking-normal text-xs ml-1">
            ({items.length})
          </span>
        </h2>
        <button
          type="button"
          onClick={onToggleOpen}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          {isOpen ? t("bookings.hideSection") : t("bookings.showSection")}
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="overflow-hidden">
            <div
              key={safePage}
              className={cn(
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                "animate-in fade-in-0 duration-300 ease-out",
                slideDir === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
              )}
            >
              {pagedItems.map((s) => (
                <ListingCard
                  key={s.id}
                  s={s}
                  historical={historical}
                  confirmDeleteId={confirmDeleteId}
                  deletingId={deletingId}
                  onEdit={onEdit}
                  onConfirmDelete={onConfirmDelete}
                  onDelete={onDelete}
                  t={t}
                  i18nLang={i18nLang}
                />
              ))}
            </div>
          </div>
          <BookingSectionPagination
            page={safePage}
            totalPages={totalPages}
            onPrevious={() => onPageChange(safePage - 1)}
            onNext={() => onPageChange(safePage + 1)}
          />
        </div>
      </div>
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
  const categoryLine = formatListingCategoryLine(
    s.category_name ?? s.category ?? null,
    s,
    t,
    " | ",
  );
  return (
    <div className={cn(
      "group border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col overflow-hidden transition-shadow",
      historical ? "opacity-60" : "hover:shadow-md",
    )}>
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

      <div className="flex flex-col flex-1 p-3">
        <Link href={`/serviceDetail/${s.id}`} className="flex flex-col flex-1 text-left outline-none">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 group-hover:text-green-700 transition-colors text-sm">
              {displayTitle}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {historical && (
                <Badge className="bg-gray-100 text-gray-500 text-xs border-0">{t("myListings.completed")}</Badge>
              )}
              {s.is_public === false && (
                <Badge className="bg-amber-100 text-amber-800 text-xs border-0">{t("myListings.private")}</Badge>
              )}
              {s.type === "looking" ? (
                <Badge className="bg-blue-100 text-blue-700 text-xs border-0">{t("myListings.looking")}</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 text-xs border-0">{t("listings.offering")}</Badge>
              )}
            </div>
          </div>

          <ListingCardSubtitle
            categoryLine={categoryLine || null}
            reviewCount={s.review_count}
            averageRating={s.average_rating}
          />

          <ListingCardPriceRow
            price={formatListingPriceLine(t, s)}
            completedBookingsCount={s.completed_bookings_count}
            listingType={s.type === "looking" ? "looking" : s.type === "offer" ? "offer" : undefined}
          />

          <ListingLocationLine service={s} />
          {s.created_at && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatListingCreationDate(s.created_at, i18nLang)}</span>
            </div>
          )}
        </Link>

        {!historical && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
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
  const [activeOpen, setActiveOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [activeSlideDir, setActiveSlideDir] = useState<"prev" | "next">("next");
  const [historySlideDir, setHistorySlideDir] = useState<"prev" | "next">("next");

  const changeActivePage = (next: number) => {
    setActivePage((current) => {
      if (next === current) return current;
      setActiveSlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

  const changeHistoryPage = (next: number) => {
    setHistoryPage((current) => {
      if (next === current) return current;
      setHistorySlideDir(next > current ? "next" : "prev");
      return next;
    });
  };

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
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.deactivated) {
          setListings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, is_active: false } : s)),
          );
        } else {
          setListings((prev) => prev.filter((s) => s.id !== id));
        }
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const activeListings = listings.filter((s) => s.is_active || s.has_open_booking_flow);
  const historyListings = listings.filter((s) => !s.is_active && !s.has_open_booking_flow);

  const activeTotalPages = Math.max(1, Math.ceil(activeListings.length / SECTION_PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(historyListings.length / SECTION_PAGE_SIZE));

  useEffect(() => {
    if (activePage > activeTotalPages) setActivePage(activeTotalPages);
  }, [activePage, activeTotalPages]);

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
          <div className="space-y-8">
            {activeListings.length > 0 && (
              <MyListingsSection
                title={t("myListings.active")}
                items={activeListings}
                page={activePage}
                slideDir={activeSlideDir}
                isOpen={activeOpen}
                onToggleOpen={() => setActiveOpen((v) => !v)}
                onPageChange={changeActivePage}
                confirmDeleteId={confirmDeleteId}
                deletingId={deletingId}
                onEdit={setEditingService}
                onConfirmDelete={setConfirmDeleteId}
                onDelete={handleDelete}
                t={t}
                i18nLang={i18n.language}
              />
            )}

            {historyListings.length > 0 && (
              <MyListingsSection
                title={t("myListings.history")}
                items={historyListings}
                page={historyPage}
                slideDir={historySlideDir}
                isOpen={historyOpen}
                onToggleOpen={() => setHistoryOpen((v) => !v)}
                onPageChange={changeHistoryPage}
                historical
                showSeparator={activeListings.length > 0}
                confirmDeleteId={confirmDeleteId}
                deletingId={deletingId}
                onEdit={setEditingService}
                onConfirmDelete={setConfirmDeleteId}
                onDelete={handleDelete}
                t={t}
                i18nLang={i18n.language}
              />
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
