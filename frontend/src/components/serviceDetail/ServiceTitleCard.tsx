"use client";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Globe, Truck, Zap, Tag, Users } from "lucide-react";
import SaveShareActions from "@/components/serviceDetail/SaveShareActions";
import { useTranslation } from "react-i18next";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { resolveListingDescription, resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import { formatListingPriceLine, normalizePricingMode, parseListingPriceNum } from "@/lib/listingPrice";
import { formatDepositLabel, resolveDepositBaseAmount } from "@/lib/deposit";
import { cn } from "@/lib/utils";
import { formatListingCategoryLine } from "@/lib/listingTags";
import {
  formatAvailabilityLabel,
  formatMobilityLabel,
  formatSpokenLanguageLabel,
  formatUrgencyLabel,
} from "@/lib/formatServiceDetailFields";
interface Service {
  id: string;
  type: "offer" | "looking";
  title: string;
  description: string;
  translations?: ServiceLikeWithI18n["translations"];
  category_name: string | null;
  subcategory: string | null;
  listing_tags?: unknown;
  pricing_mode?: string | null;
  price: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  estimated_hours?: number | string | null;
  location: string;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean;
  /** Présent dans l’API ; non affiché (durée approximative masquée produit). */
  duration?: string | null;
  availability: string | null;
  language: string | null;
  mobility: string | null;
  urgency: string | null;
  is_one_time?: boolean;
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  completed_bookings_count?: number | string | null;
  owner_name: string;
  owner_id: string;
  owner_avatar: string | null;
  created_at: string;
}

interface Props {
  service: Service;
  favoritesCount: number;
  providerListingCount: number;
  onOpenMap: () => void;
  formatRelativeDate: (d: string) => string;
}

export default function ServiceTitleCard({
  service, favoritesCount, providerListingCount, onOpenMap, formatRelativeDate,
}: Props) {
  const { t, i18n } = useTranslation();
  const displayTitle = resolveListingTitle(service, i18n.language);
  const displayDescription = resolveListingDescription(service, i18n.language);
  const isQuotePricing = normalizePricingMode(service.pricing_mode) === "quote";
  const isHourly = normalizePricingMode(service.pricing_mode) === "hourly";
  const hourlyEstimatedHours = isHourly ? parseListingPriceNum(service.estimated_hours) : null;
  const depositBase = resolveDepositBaseAmount(service, null);
  const depositLabel =
    service.deposit_enabled && depositBase != null
      ? formatDepositLabel(t, service, depositBase)
      : "";
  const categoryLine = formatListingCategoryLine(service.category_name, service, t, " · ");
  const hasCategory = Boolean(service.category_name || service.subcategory || categoryLine);
  const clientsServed = (() => {
    const v = service.completed_bookings_count;
    if (v == null) return 0;
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    return Number.isFinite(n) ? n : 0;
  })();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
        <div className="min-w-0 flex-1">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              service.type === "offer" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            }`}>
              {service.type === "offer" ? t("listings.offering") : t("listings.looking")}
            </span>
            {service.is_one_time && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                <Tag className="h-3 w-3" />
                {t("post.oneTimeListing")}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900">{displayTitle}</h1>

          {hasCategory && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-2">{categoryLine}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-600">
            <button
              type="button"
              onClick={onOpenMap}
              className="cursor-pointer flex items-center gap-1 hover:text-green-700"
            >
              <MapPin className="h-4 w-4" />
              <span className="underline cursor-pointer">{getPublicServiceLocation(service)}</span>
            </button>
            <span>·</span>
            <span>{formatRelativeDate(service.created_at)}</span>
            {clientsServed > 0 && (
              <>
                <span>·</span>
                <span
                  className="inline-flex items-center gap-1"
                  title={t("listings.cardClientsServedTitle")}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t("listings.cardClientsServed", { count: clientsServed })}
                </span>
              </>
            )}
          </div>

          <SaveShareActions serviceId={service.id} title={displayTitle} ownerId={service.owner_id} />

          {favoritesCount > 0 && (
            <div className="text-sm text-gray-600 mt-2">
              {t("serviceDetail.favoritedBy")}{" "}
              <span className="font-semibold text-gray-900">
                {favoritesCount >= 1000 ? "1k+" : favoritesCount}
              </span>{" "}
              {t("serviceDetail.users")}
            </div>
          )}

          <div className="mt-4">
            <p className={cn(
              "text-green-700 font-bold leading-snug",
              isQuotePricing
                ? "text-lg sm:text-xl max-w-2xl text-green-800"
                : "text-2xl sm:text-3xl font-bold text-green-700"
            )}>
              {isHourly
                ? formatListingPriceLine(t, service)
                : formatListingPriceLine(t, service, "detail")}
            </p>
            {isHourly && hourlyEstimatedHours != null && hourlyEstimatedHours > 0 && (
              <>
                <hr className="border-gray-200 my-2 w-16" />
                <p className="text-sm text-gray-500">~{hourlyEstimatedHours} h {t("post.estimatedHoursLabel").toLowerCase()}</p>
              </>
            )}
          </div>
          {depositLabel && (
            <>
              <div className="mt-2 w-fit border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-800">{depositLabel}</p>
                <p className="mt-0.5 text-xs text-red-500">{t("deposit.nonRefundableNotice")}</p>
              </div>
            </>
          )}
        </div>

        {/* Provider mini-card */}
        <div className="w-full shrink-0 md:w-52 lg:w-56 md:pt-1">
          <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
            <Link
              href={`/profile/${service.owner_id}`}
              aria-label={t("serviceDetail.goToProfile", { name: service.owner_name })}
              className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              <Avatar className="w-16 h-16 mx-auto mb-3">
                {service.owner_avatar && (
                  <AvatarImage src={service.owner_avatar} alt="" />
                )}
                <AvatarFallback className="text-xl bg-green-100 text-green-800 font-semibold">
                  {service.owner_name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-green-700 group-hover:underline">
                {service.owner_name}
              </div>
            </Link>
            <div className="mt-2">
              <Link
                href={`/profile/${service.owner_id}/listings`}
                className="text-sm text-green-700 underline hover:text-green-800"
              >
                {t("profile.viewAllListingsCount", { count: providerListingCount })}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("serviceDetail.aboutService")}</h2>
        <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
          {displayDescription}
        </p>
      </div>

      {/* Extra details */}
      {(service.availability || service.language || service.mobility || service.urgency) && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("serviceDetail.detailsSection")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {service.availability && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="h-4 w-4 text-green-600 shrink-0" />
                <span><span className="font-medium">{t("serviceDetail.availability")}:</span> {formatAvailabilityLabel(service.availability, t)}</span>
              </div>
            )}
            {service.language && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Globe className="h-4 w-4 shrink-0 text-green-600" />
                <span><span className="font-medium">{t("serviceDetail.language")}:</span> {formatSpokenLanguageLabel(service.language, t)}</span>
              </div>
            )}
            {service.mobility && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Truck className="h-4 w-4 shrink-0 text-green-600" />
                <span><span className="font-medium">{t("serviceDetail.mobility")}:</span> {formatMobilityLabel(service.mobility, t)}</span>
              </div>
            )}
            {service.urgency && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Zap className="h-4 w-4 shrink-0 text-green-600" />
                <span><span className="font-medium">{t("serviceDetail.urgency")}:</span> {formatUrgencyLabel(service.urgency, t)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
