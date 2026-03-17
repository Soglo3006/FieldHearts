"use client";

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Grid3x3, Settings, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from "@/components/ui/Spinner";

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
}

export function ProfileSidebar({ otherUser, onClose, onOpenSettings, isBlocked, isBlockedByOther }: ProfileSidebarProps) {
  const { t, i18n } = useTranslation();
  const [userListings, setUserListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false)
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number } | null>(null);

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
        console.error('Error fetching user listings:', err);
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
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('target_id', otherUser.id);

      if (!data || data.length === 0) {
        setReviewStats(null);
        return;
      }

      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setReviewStats({ avg: Math.round(avg * 10) / 10, count: data.length });
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
        <div className="py-4 w-full">
          {/* Avatar + Nom — toujours visible */}
          <div className="text-center mb-6">
            <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-white shadow-lg">
              {otherUser.avatar_url ? (
                <AvatarImage src={otherUser.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-2xl">
                {(displayName).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <Link href={`/profile/${otherUser.id}`} className="hover:underline">
              <h4 className="text-lg font-semibold mb-2">{displayName}</h4>
            </Link>

            {/* Rating — masqué si bloqué */}
            {!blocked && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">
                  {reviewStats ? reviewStats.avg : 'N/A'}
                </span>
                <span className="text-sm text-gray-500">
                  ({t("messages.reviewsCount", { count: reviewStats ? reviewStats.count : 0 })})
                </span>
              </div>
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
                      <Link href={`/profile/${otherUser.id}`}>
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
                            <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex gap-3">
                                {listing.image_url ? (
                                  <img
                                    src={listing.image_url}
                                    alt={listing.title}
                                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Grid3x3 className="h-6 w-6 text-gray-300" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">
                                    {listing.title}
                                  </h5>
                                  <p className="text-green-700 font-semibold text-sm mb-1">
                                    ${listing.price}
                                  </p>
                                  {listing.type === 'looking' && (
                                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                                      {t("listings.looking")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Card>
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
      </div>

      {/* Bouton fixe en bas */}
      <div className="shrink-0 p-4 bg-gray-50 border-t">
        <Link href={`/profile/${otherUser.id}`}>
          <Button className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer">
            {t("messages.viewFullProfile")}
          </Button>
        </Link>
      </div>
    </div>
  );
}