"use client";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { PostPublishLink } from "@/components/navigation/PostPublishLink";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from "@/components/ui/carousel";
import { Grid3x3, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import AppImage from "@/components/ui/AppImage";
import EditListingModal, { type Service as Listing } from "@/components/listings/EditListingModal";
import { ProfileListingsGridSkeleton } from "@/components/profile/ProfileSkeleton";
import ListingLocationLine from "@/components/listings/ListingLocationLine";
import { resolveListingTitle } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { formatListingPriceLine } from "@/lib/listingPrice";
import { formatListingCategoryLine } from "@/lib/listingTags";
import { ListingCardSubtitle, ListingCardPriceRow, ListingCardTitle } from "@/components/listings/ListingTrustLine";
import { formatListingCreationDate } from "@/lib/listingDate";

const PAGE_SIZE = 9;

type ProfileListing = Listing & {
  created_at?: string;
  category_name?: string | null;
  completed_bookings_count?: number | string | null;
  review_count?: number | string | null;
  average_rating?: number | string | null;
};

interface Props {
  userListings: ProfileListing[];
  setUserListings: (fn: (prev: ProfileListing[]) => ProfileListing[]) => void;
  listingsLoading: boolean;
  isOwner: boolean;
  isPerson: boolean;
  profileId: string;
  accessToken?: string;
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

export default function ProfileListings({
  userListings, setUserListings, listingsLoading,
  isOwner, isPerson, profileId, accessToken,
}: Props) {
  const { t, i18n } = useTranslation();
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const listingsSectionTopRef = useRef<HTMLDivElement>(null);

  const handleListingsPageChange = (p: number) => {
    setPage(p);
    requestAnimationFrame(() => {
      listingsSectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const deleteListing = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setUserListings((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Use carousel for ≤9, paginated grid for >9
  const usePagination = userListings.length > PAGE_SIZE;
  const pagedListings = usePagination
    ? userListings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : userListings;

  const ListingCardContent = (listing: ProfileListing) => {
    const thumb = listing.image_urls?.[0] ?? listing.image_url;
    const resolved = resolveListingTitle(listing, i18n.language);
    const categoryLine = formatListingCategoryLine(
      listing.category_name ?? listing.category ?? null,
      listing,
      t,
      " | ",
    );
    return (
    <div className="group border border-gray-200 rounded-xl shadow-sm bg-white h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/serviceDetail/${listing.id}`} className="block">
        <AspectRatio ratio={16 / 9}>
          <div className="relative h-full w-full">
            <ListingLangPills service={listing} />
            {thumb ? (
              <AppImage src={thumb} alt={resolved} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <Grid3x3 className="h-12 w-12 text-gray-300" />
              </div>
            )}
          </div>
        </AspectRatio>
      </Link>

      <div className="flex flex-col flex-1 p-3">
        <Link href={`/serviceDetail/${listing.id}`} className="flex flex-col flex-1 text-left outline-none">
          <div className="flex items-start gap-2 mb-1">
            <ListingCardTitle title={resolved} className="group-hover:text-green-700 transition-colors" />
            <div className="flex shrink-0 items-center gap-1.5">
              {isOwner && listing.is_public === false && (
                <Badge className="border-0 bg-amber-100 text-xs text-amber-800">
                  {t("myListings.private")}
                </Badge>
              )}
              {listing.type === "looking" ? (
                <Badge className="shrink-0 border-0 bg-blue-100 text-xs text-blue-700">
                  {t("listings.looking")}
                </Badge>
              ) : (
                <Badge className="shrink-0 border-0 bg-green-100 text-xs text-green-700">
                  {t("listings.offering")}
                </Badge>
              )}
            </div>
          </div>

          <ListingCardSubtitle
            categoryLine={categoryLine || null}
            reviewCount={listing.review_count}
            averageRating={listing.average_rating}
          />

          <ListingCardPriceRow
            price={formatListingPriceLine(t, listing)}
            completedBookingsCount={listing.completed_bookings_count}
            listingType={listing.type === "looking" ? "looking" : listing.type === "offer" ? "offer" : undefined}
          />

          <ListingLocationLine service={listing} />
          {isOwner && listing.created_at && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatListingCreationDate(listing.created_at, i18n.language)}</span>
            </div>
          )}
        </Link>

        {isOwner && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => setEditingListing(listing)}>
              {t("common.edit")}
            </Button>
            {confirmDeleteId === listing.id ? (
              <>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  onClick={() => deleteListing(listing.id)}
                  disabled={deletingId === listing.id}
                >
                  {deletingId === listing.id ? "…" : t("common.confirm")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>✕</Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 flex-1"
                onClick={() => setConfirmDeleteId(listing.id)}
              >
                {t("common.delete")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
  };

  return (
    <>
      <Card className="p-4 sm:p-6">
        <div ref={listingsSectionTopRef} className="flex items-center justify-between mb-4 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isPerson ? t("profile.listings") : t("profile.ourServices")}
          </h2>
          {isOwner && (
            <PostPublishLink>
              <Button className="bg-green-700 hover:bg-green-800 text-white cursor-pointer">
                {t("profile.createNewListing")}
              </Button>
            </PostPublishLink>
          )}
        </div>

        {listingsLoading ? (
          <ProfileListingsGridSkeleton count={6} embedded />
        ) : userListings.length > 0 ? (
          <>
            {usePagination ? (
              /* — Paginated grid (>9 listings) — */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pagedListings.map((listing) => (
                    <div key={listing.id}>{ListingCardContent(listing)}</div>
                  ))}
                </div>
                <Pagination page={page} total={userListings.length} onChange={handleListingsPageChange} />
              </>
            ) : (
              /* — Carousel (≤9 listings) — */
              <>
                <Carousel opts={{ align: "start", loop: false }} className="w-full">
                  <CarouselContent className="-ml-4">
                    {userListings.map((listing) => (
                      <CarouselItem key={listing.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        {ListingCardContent(listing)}
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {userListings.length > 3 && (
                    <>
                      <CarouselPrevious className="hidden md:flex -left-4 cursor-pointer" />
                      <CarouselNext className="hidden md:flex -right-4 cursor-pointer" />
                    </>
                  )}
                </Carousel>

                {isOwner && (
                  <div className="mt-4">
                    <Link href="/my-listings">
                      <Button variant="outline" className="w-full cursor-pointer">
                        {t("profile.manageListings")}
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Grid3x3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("profile.noListings")}</h3>
            <p className="text-gray-500">
              {isOwner ? t("profile.yourListingsEmpty") : t("profile.userNoListings")}
            </p>
            {isOwner && (
              <PostPublishLink>
                <Button className="mt-4 bg-green-700 hover:bg-green-800 text-white cursor-pointer">
                  {t("profile.createFirstListing")}
                </Button>
              </PostPublishLink>
            )}
          </div>
        )}
      </Card>

      {editingListing && accessToken && (
        <EditListingModal
          service={editingListing}
          accessToken={accessToken}
          onClose={() => setEditingListing(null)}
          onSaved={(updated) => {
            setUserListings((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setEditingListing(null);
          }}
        />
      )}
    </>
  );
}
