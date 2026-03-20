"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from "@/components/ui/carousel";
import { Grid3x3, MapPin } from "lucide-react";
import EditListingModal, { type Service as Listing } from "@/components/listings/EditListingModal";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  userListings: Listing[];
  setUserListings: (fn: (prev: Listing[]) => Listing[]) => void;
  listingsLoading: boolean;
  isOwner: boolean;
  isPerson: boolean;
  profileId: string;
  accessToken?: string;
}

export default function ProfileListings({
  userListings, setUserListings, listingsLoading,
  isOwner, isPerson, profileId, accessToken,
}: Props) {
  const { t } = useTranslation();
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <>
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isPerson ? t("profile.listings") : t("profile.ourServices")}
          </h2>
          {isOwner && (
            <Link href="/post">
              <Button className="bg-green-700 hover:bg-green-800 text-white cursor-pointer">
                {t("profile.createNewListing")}
              </Button>
            </Link>
          )}
        </div>

        {listingsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="xl" />
          </div>
        ) : userListings.length > 0 ? (
          <>
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
              <CarouselContent className="-ml-4">
                {userListings.map((listing) => (
                  <CarouselItem key={listing.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <div className="border rounded-xl shadow-sm bg-white h-full flex flex-col overflow-hidden hover:shadow-lg transition-all">
                      <Link href={`/serviceDetail/${listing.id}`} className="block">
                        <AspectRatio ratio={16 / 9}>
                          {listing.image_url ? (
                            <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Grid3x3 className="h-12 w-12 text-gray-300" />
                            </div>
                          )}
                        </AspectRatio>
                      </Link>

                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link href={`/serviceDetail/${listing.id}`} className="flex-1">
                            <h3 className="font-semibold text-gray-900 line-clamp-1 hover:text-green-700 transition-colors">
                              {listing.title}
                            </h3>
                          </Link>
                          {listing.type === "looking" && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs shrink-0 border-0">
                              {t("listings.looking")}
                            </Badge>
                          )}
                        </div>

                        <p className="text-green-700 font-bold text-lg mb-2">${listing.price}</p>

                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <MapPin className="h-4 w-4 mr-1 shrink-0" />
                          <span className="line-clamp-1">{listing.location}</span>
                        </div>

                        {listing.category && (
                          <p className="text-xs text-gray-500 line-clamp-1 mb-3">
                            {listing.category}{listing.subcategory && ` • ${listing.subcategory}`}
                          </p>
                        )}

                        {isOwner && (
                          <div className="mt-auto pt-3 border-t border-gray-100 flex gap-2">
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

            <div className="mt-2">
              <Link href={isOwner ? "/my-listings" : `/profile/${profileId}/listings`}>
                <Button variant="outline" className="w-full cursor-pointer">
                  {isOwner ? t("profile.manageListings") : t("profile.viewAllListingsCount", { count: userListings.length })}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Grid3x3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("profile.noListings")}</h3>
            <p className="text-gray-500">
              {isOwner ? t("profile.yourListingsEmpty") : t("profile.userNoListings")}
            </p>
            {isOwner && (
              <Link href="/post">
                <Button className="mt-4 bg-green-700 hover:bg-green-800 text-white cursor-pointer">
                  {t("profile.createFirstListing")}
                </Button>
              </Link>
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
