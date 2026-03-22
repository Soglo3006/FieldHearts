"use client";

import Link from 'next/link';
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Grid3x3, MapPin, Settings, X } from 'lucide-react';
import { Spinner } from "@/components/ui/Spinner";
import RatingsPage from '@/components/profile/RatingsPage';

interface ProfileSidebarProps {
  otherUser?: {
    id?: string;
    full_name?: string;
    company_name?: string;
    account_type?: string;
    avatar_url?: string | null;
    bio?: string;
    created_at?: string;
  } | null;
  onClose?: () => void;
  onOpenSettings?: () => void;
  isBlocked?: boolean;
  isBlockedByOther?: boolean;
  blockCheckLoading?: boolean;
}

export function ProfileSidebar({ otherUser, onClose, onOpenSettings, isBlocked, isBlockedByOther, blockCheckLoading }: ProfileSidebarProps) {
  const { t, i18n } = useTranslation();
  useScrollLock(true);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showRatings, setShowRatings] = useState(false);

  const sidebarLoading = listingsLoading || reviewsLoading || blockCheckLoading;

  // Reset quand on change de conversation
  useEffect(() => {
    setUserListings([]);
    setReviewStats(null);
  }, [otherUser?.id]);

  // Charger les listings de l'autre utilisateur
  useEffect(() => {
    const fetchUserListings = async () => {
      if (!otherUser?.id) {
        setUserListings([]);
        return;
      }

      setListingsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/services/user/${otherUser.id}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }

        const data = await response.json();
        
        // Limiter à 3 listings maximum
        setUserListings(data.slice(0, 3));
      } catch (err) {
        setUserListings([]);
      } finally {
        setListingsLoading(false);
      }
    };

    fetchUserListings();
  }, [otherUser?.id]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!otherUser?.id) return;
      setReviewsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/${otherUser.id}`);
        if (!res.ok) throw new Error();
        const data: { rating: number }[] = await res.json();
        if (!data || data.length === 0) {
          setReviewStats(null);
        } else {
          const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
          setReviewStats({ avg: Math.round(avg * 10) / 10, count: data.length });
        }
      } catch {
        setReviewStats(null);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [otherUser?.id]);

  if (!otherUser) {
    return (
      <div className="w-full border-l bg-gray-50 flex flex-col h-full">
        <div className="flex items-center justify-center h-full text-gray-500">
          <p className="text-sm text-center px-4">
            {t("messages.selectConversation")}
          </p>
        </div>
      </div>
    );
  }

  const isPerson = otherUser.account_type === 'person';
  const isCompany = otherUser.account_type === 'company';
  const displayName = (isCompany
    ? otherUser.company_name
    : otherUser.full_name) || otherUser.full_name || otherUser.company_name || 'Unknown';

  const memberSince = otherUser.created_at
    ? new Date(otherUser.created_at).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
    : t("messages.recently");

  const blocked = isBlocked || isBlockedByOther;

  return (
    <div className="w-full border-l bg-gray-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 bg-gray-50 border-b h-[73px] flex items-center justify-between">
        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose} className="cursor-pointer">
            <X className="h-5 w-5" />
          </Button>
        ) : <div className="w-9" />}
        <h3 className="text-lg font-semibold">{t("messages.about")}</h3>
        {onOpenSettings ? (
          <Button variant="ghost" size="icon" onClick={onOpenSettings} className="cursor-pointer">
            <Settings className="h-5 w-5" />
          </Button>
        ) : <div className="w-9" />}
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">
        {sidebarLoading ? (
          <div className="py-4 space-y-4">
            {/* Avatar skeleton */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-24 w-24 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-28 bg-gray-100 animate-pulse rounded" />
            </div>
            <div className="h-px bg-gray-100" />
            {/* Info skeleton */}
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 animate-pulse rounded w-full" />
              <div className="h-3 bg-gray-100 animate-pulse rounded w-4/5" />
              <div className="h-3 bg-gray-100 animate-pulse rounded w-3/5" />
            </div>
            <div className="h-px bg-gray-100" />
            {/* Listings skeleton */}
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border overflow-hidden">
                <div className="aspect-video bg-gray-200 animate-pulse" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-4/5" />
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="py-4 w-full">
          {/* Avatar + Nom — toujours visible */}
          <div className="text-center mb-6">
            <Avatar className="h-24 w-24 mx-auto mb-3 border-4 border-white shadow-lg">
              {otherUser.avatar_url ? (
                <AvatarImage src={otherUser.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-2xl bg-green-100 text-green-800 font-semibold">
                {(displayName).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <Link href={`/profile/${otherUser.id}`} className="hover:underline">
              <h4 className="text-lg font-semibold">{displayName}</h4>
            </Link>

            {/* Rating — en dessous du nom, masqué si bloqué */}
            {!blocked && (
              <button
                type="button"
                onClick={() => setShowRatings(true)}
                className="flex items-center justify-center gap-1 mt-1 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">
                  {reviewStats ? reviewStats.avg.toFixed(1) : 'N/A'}
                </span>
                <span className="text-sm text-gray-500 underline underline-offset-2">
                  ({reviewStats ? reviewStats.count : 0} {t("profile.reviewsCount")})
                </span>
              </button>
            )}
          </div>

          {/* Tout le reste — masqué si bloqué */}
          {!blocked && (
            <>
              <Separator className="my-4" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("messages.memberSince")}</span>
                  <span className="font-medium">{memberSince}</span>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Section Bio */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
                <p className="text-gray-600 text-sm leading-relaxed break-words">
                  {otherUser.bio || t("messages.noBio")}
                </p>
              </div>

              {/* Other Services */}
              {userListings.length > 0 && (
                <>
                  <Separator className="my-4" />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{t("messages.otherServices")}</h4>
                      <Link href={`/profile/${otherUser.id}/listings`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                          {t("common.viewAll")}
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>

                    {listingsLoading ? (
                      <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userListings.map((listing) => (
                          <Link
                            key={listing.id}
                            href={`/serviceDetail/${listing.id}`}
                            className="block"
                          >
                            <div className="border rounded-xl shadow-sm bg-white overflow-hidden hover:shadow-md transition-all cursor-pointer">
                              <div className="aspect-video w-full overflow-hidden bg-gray-100">
                                {listing.image_url ? (
                                  <img
                                    src={listing.image_url}
                                    alt={listing.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Grid3x3 className="h-6 w-6 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <h5 className="font-semibold text-sm text-gray-900 line-clamp-1 flex-1">
                                    {listing.title}
                                  </h5>
                                  {listing.type === 'looking' ? (
                                    <Badge className="bg-gray-100 text-gray-600 text-[10px] border-0 shrink-0">
                                      {t("listings.looking")}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-700 text-[10px] border-0 shrink-0">
                                      {t("listings.offering")}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-green-700 font-bold text-sm mb-1">
                                  ${listing.price}
                                </p>
                                {(listing.location || listing.city) && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <MapPin className="h-3 w-3 mr-1 shrink-0" />
                                    <span className="line-clamp-1">{listing.location || listing.city}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        )}
      </div>

      {/* Bouton fixe en bas */}
      <div className="shrink-0 p-4 bg-gray-50 border-t">
        <Link href={`/profile/${otherUser.id}`}>
          <Button className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer">
            {t("messages.viewFullProfile")}
          </Button>
        </Link>
      </div>

      {/* Ratings modal */}
      {showRatings && otherUser.id && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-y-auto">
            <RatingsPage
              onClose={() => setShowRatings(false)}
              profileId={otherUser.id}
              displayName={displayName}
            />
          </div>
        </div>
      )}
    </div>
  );
}