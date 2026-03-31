"use client";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Globe, Truck, Zap, Tag } from "lucide-react";
import SaveShareActions from "@/components/serviceDetail/SaveShareActions";
import { useTranslation } from "react-i18next";

interface Service {
  id: string;
  type: "offer" | "looking";
  title: string;
  description: string;
  category_name: string | null;
  subcategory: string | null;
  price: number;
  location: string;
  city?: string | null;
  duration: string | null;
  availability: string | null;
  language: string | null;
  mobility: string | null;
  urgency: string | null;
  is_one_time?: boolean;
  owner_name: string;
  owner_id: string;
  owner_avatar: string | null;
  created_at: string;
}

interface Props {
  service: Service;
  price: number;
  favoritesCount: number;
  providerListingCount: number;
  onOpenMap: () => void;
  formatRelativeDate: (d: string) => string;
}

export default function ServiceTitleCard({
  service, price, favoritesCount, providerListingCount, onOpenMap, formatRelativeDate,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex-1">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              service.type === "offer" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            }`}>
              {service.type === "offer" ? t("listings.offering") : t("listings.looking")}
            </span>
            {service.category_name && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                {service.category_name}
                {service.subcategory && ` · ${service.subcategory}`}
              </span>
            )}
            {service.is_one_time && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                <Tag className="h-3 w-3" />
                {t("post.oneTimeListing")}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-600">
            <button
              type="button"
              onClick={onOpenMap}
              className="cursor-pointer flex items-center gap-1 hover:text-green-700"
            >
              <MapPin className="h-4 w-4" />
              <span className="underline cursor-pointer">{service.city ?? service.location}</span>
            </button>
            <span>·</span>
            <span>{formatRelativeDate(service.created_at)}</span>
          </div>

          <SaveShareActions serviceId={service.id} title={service.title} />

          {favoritesCount > 0 && (
            <div className="text-sm text-gray-600 mt-2">
              {t("serviceDetail.favoritedBy")}{" "}
              <span className="font-semibold text-gray-900">
                {favoritesCount >= 1000 ? "1k+" : favoritesCount}
              </span>{" "}
              {t("serviceDetail.users")}
            </div>
          )}

          <p className="text-3xl font-extrabold text-green-700 mt-4">
            ${price}
            {service.duration && (
              <span className="text-base font-normal text-gray-500 ml-1">
                / {service.duration}
              </span>
            )}
          </p>
        </div>

        {/* Provider mini-card */}
        <div className="w-full shrink-0 md:w-48">
          <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
            <Link href={`/profile/${service.owner_id}`} className="group block">
              <Avatar className="w-16 h-16 mx-auto mb-3">
                {service.owner_avatar && (
                  <AvatarImage src={service.owner_avatar} alt={service.owner_name} />
                )}
                <AvatarFallback className="text-xl bg-green-100 text-green-800 font-semibold">
                  {service.owner_name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="font-semibold text-gray-900 text-sm leading-tight">{service.owner_name}</div>
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
          {service.description}
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
                <span><span className="font-medium">{t("serviceDetail.availability")}:</span> {service.availability}</span>
              </div>
            )}
            {service.language && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Globe className="h-4 w-4 shrink-0 text-green-600" />
                <span><span className="font-medium">{t("serviceDetail.language")}:</span> {service.language}</span>
              </div>
            )}
            {service.mobility && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Truck className="h-4 w-4 shrink-0 text-green-600" />
                <span><span className="font-medium">{t("serviceDetail.mobility")}:</span> {service.mobility}</span>
              </div>
            )}
            {service.urgency && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Zap className="h-4 w-4 shrink-0 text-green-600" />
                <span><span className="font-medium">{t("serviceDetail.urgency")}:</span> {service.urgency}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
