"use client";

import { MapPin, Clock, Grid3x3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTranslatedCategoryTrail } from "@/lib/categories";
import AppImage from "@/components/ui/AppImage";

interface ListingCardProps {
    title?: string;
    price?: number;
    location?: string;
    postedTime?: string;
    imageUrl?: string;
    completedCount?: number;
    category?: string;
    subcategory?: string;
}

export default function ListingCard({
    title = "Service Listing",
    price = 0,
    location = "",
    postedTime = "",
    imageUrl,
    completedCount,
    category,
    subcategory,
    }: ListingCardProps) {
    const { t } = useTranslation();
    const formatCompleted = (n?: number) => {
        if (!n || n <= 0) return "";
        if (n >= 1000) return " (1k+)";
        return ` (${n})`;
    };
    return (
        <div className="cursor-pointer bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col sm:flex-row">
        <div className="w-full h-40 sm:w-40 sm:h-full shrink-0 overflow-hidden bg-gray-100">
            {imageUrl ? (
                            <div className="relative h-full w-full min-h-40">
                                <AppImage
                                    src={imageUrl}
                                    alt={title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, 160px"
                                    className="object-cover"
                                />
                            </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Grid3x3 className="h-10 w-10 text-gray-300" />
              </div>
            )}
        </div>
        <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-brand-green transition-colors cursor-pointer line-clamp-1">
                {title}
                <span className="text-gray-500 font-normal">{formatCompleted(completedCount)}</span>
            </h3>
            {(category || subcategory) && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                    {formatTranslatedCategoryTrail(category, subcategory, t)}
                </p>
            )}
            <p className="text-xl font-bold text-brand-green text-green-700 mt-1">
                {Number(price).toFixed(2)} $
            </p>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
            <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{location}</span>
            </div>
            <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{postedTime}</span>
            </div>
            </div>
        </div>
        </div>
    );
    }
