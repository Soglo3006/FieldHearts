"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star, MapPin, MessageCircle, Grid3x3, Settings,
  Ellipsis, UserStar, Users, Ban,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { resolveUnedenAvatarUrl } from "@/lib/userDisplay";

interface ProfileUser {
  avatar?: string;
  city?: string;
  province?: string;
  team_size?: string;
  stats?: {
    average_rating?: number;
    total_reviews?: number;
  };
}

interface Props {
  profileUser: ProfileUser;
  displayName: string;
  displayTitle: string;
  isPerson: boolean;
  isCompany: boolean;
  isOwner: boolean;
  isBlocked: boolean;
  isBlockedByOther: boolean;
  blockLoading: boolean;
  profileId: string;
  listingsCount: number;
  sendMessageLoading: boolean;
  onSendMessage: () => void;
  onSettings: () => void;
  onEllipsis: () => void;
  onRatings: () => void;
  onUnblock: () => void;
}

export default function ProfileHeader({
  profileUser, displayName, displayTitle, isPerson, isCompany,
  isOwner, isBlocked, isBlockedByOther, blockLoading,
  profileId, listingsCount, sendMessageLoading,
  onSendMessage, onSettings, onEllipsis, onRatings, onUnblock,
}: Props) {
  const { t } = useTranslation();
  const avatarUrl = resolveUnedenAvatarUrl(profileUser.avatar);
  return (
    <Card className="p-4 sm:p-8 mb-4 sm:mb-8">
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center">
        <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-lg">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
          <AvatarFallback className="text-2xl bg-green-100 text-green-800 font-semibold">{displayName.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{displayName}</h1>
            {isCompany && (
              <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-2 py-0.5 rounded-full">
                {t("profile.companyBadge")}
              </Badge>
            )}
          </div>

          <p className="text-base sm:text-lg text-gray-600 mb-3">{displayTitle || t("profile.serviceProvider")}</p>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            {profileUser.stats && (
              <button
                type="button"
                onClick={onRatings}
                className="flex items-center gap-1 hover:opacity-75 transition-opacity cursor-pointer"
              >
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-lg">
                  {profileUser.stats.average_rating?.toFixed(1) || "N/A"}
                </span>
                <span className="text-gray-500 underline underline-offset-2">({profileUser.stats.total_reviews || 0} {t("profile.reviewsCount")})</span>
              </button>
            )}
            {profileUser.city && profileUser.province && (
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{profileUser.city}, {profileUser.province}</span>
              </div>
            )}
            {isCompany && profileUser.team_size && (
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="h-4 w-4" />
                <span>{profileUser.team_size} {t("settings.employees")}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {isOwner ? (
              <>
                <Link href="/messages">
                  <Button className="bg-green-700 hover:bg-green-800 text-white gap-2 cursor-pointer">
                    <MessageCircle className="h-4 w-4" />
                    {t("profile.viewMessages")}
                  </Button>
                </Link>
                <Button variant="outline" className="gap-2 cursor-pointer" onClick={onRatings}>
                  <UserStar className="h-4 w-4" />
                  {t("profile.viewRatings")}
                </Button>
                <Button variant="outline" className="gap-2 cursor-pointer" onClick={onSettings}>
                  <Settings className="h-4 w-4" />
                  {t("header.settings")}
                </Button>
              </>
            ) : isBlocked ? (
              <Button
                variant="outline"
                className="gap-2 cursor-pointer border-green-600 text-green-600 hover:bg-green-50"
                onClick={onUnblock}
                disabled={blockLoading}
              >
                {blockLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("profile.unblocking")}
                  </>
                ) : (
                  <><Ban className="h-4 w-4" />{t("settings.unblock")}</>
                )}
              </Button>
            ) : (
              <>
                {!isBlockedByOther && (
                  <Button
                    onClick={onSendMessage}
                    disabled={sendMessageLoading}
                    className="bg-green-700 hover:bg-green-800 text-white gap-2 cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {sendMessageLoading ? t("common.loading") : t("profile.sendMessage")}
                  </Button>
                )}
                <Button variant="outline" className="gap-2 cursor-pointer" onClick={onRatings}>
                  <UserStar className="h-4 w-4" />
                  {t("profile.viewRatings")}
                </Button>
                <Link href={isOwner ? "/my-listings" : `/profile/${profileId}/listings`}>
                  <Button variant="outline" className="gap-2 cursor-pointer">
                    <Grid3x3 className="h-4 w-4" />
                    {t("profile.viewAllListingsCount", { count: listingsCount })}
                  </Button>
                </Link>
                <Button variant="outline" className="gap-2 cursor-pointer" onClick={onEllipsis}>
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
