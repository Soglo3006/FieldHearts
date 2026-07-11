"use client";

import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeListingCardSkeleton() {
  return (
    <div className="border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-3 w-4/5 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

export function HomeListingGridSkeleton({
  count = 9,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <HomeListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function HomeSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white text-black">
      <main className="flex-1">
        <div
          className="relative overflow-hidden px-4 py-16 sm:py-32 md:py-40"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1600&q=80')`,
            backgroundPosition: "center center",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-green-800/60" />
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h1 className="mb-3 text-2xl font-bold text-white drop-shadow-md sm:text-3xl md:text-4xl">
              {t("home.heroTitle").split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </h1>
            <p className="text-sm text-green-100 sm:text-base">{t("home.heroSubtitle")}</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-5">
          <h2 className="mb-5 text-2xl font-bold">{t("home.recentlyAdded")}</h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <HomeListingGridSkeleton
              count={9}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 lg:col-span-3"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
