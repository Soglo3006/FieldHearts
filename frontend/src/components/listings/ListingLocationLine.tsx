"use client";

import { MapPin } from "lucide-react";
import { resolveListingLocationDisplay } from "@/lib/serviceLocation";

interface Props {
  service: Parameters<typeof resolveListingLocationDisplay>[0];
  searchLat?: number | null;
  searchLng?: number | null;
  searchText?: string | null;
  className?: string;
}

export default function ListingLocationLine({
  service,
  searchLat,
  searchLng,
  searchText,
  className = "flex items-center justify-between text-xs text-gray-500 mt-auto",
}: Props) {
  const { label, extraCount } = resolveListingLocationDisplay(service, {
    searchLat: searchLat ?? undefined,
    searchLng: searchLng ?? undefined,
    searchText: searchText ?? undefined,
  });

  if (!label) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-1 min-w-0">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="line-clamp-1">{label}</span>
      </div>
      {extraCount > 0 && (
        <span className="ml-2 shrink-0 text-gray-400 font-medium">+{extraCount}</span>
      )}
    </div>
  );
}
