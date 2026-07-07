import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function BookingCardSkeleton() {
  return (
    <div className="border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden">
      <div className="relative">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200" />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Skeleton className="h-4 flex-1 rounded" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-3 w-2/3 rounded mb-2" />
        <Skeleton className="h-6 w-24 rounded mb-1" />
        <Skeleton className="h-3 w-full rounded mb-1" />
        <Skeleton className="h-3 w-20 rounded mb-3" />
        <Skeleton className="h-3 w-28 rounded mb-3" />
        <div className="mt-auto pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function BookingsGroupHeaderSkeleton() {
  return (
    <div className="mb-3 flex items-center justify-center gap-2">
      <Skeleton className="h-3 w-36 rounded" />
      <Skeleton className="h-5 w-14 rounded-md" />
    </div>
  );
}

export function BookingsListSkeleton({
  sections = 2,
  cardsPerSection = 3,
}: {
  sections?: number;
  cardsPerSection?: number;
}) {
  return (
    <div className="space-y-8">
      {Array.from({ length: sections }).map((_, index) => (
        <div key={index}>
          {index > 0 && <div className="border-t border-gray-200 mb-8" aria-hidden />}
          <BookingsGroupHeaderSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: cardsPerSection }).map((__, cardIndex) => (
              <BookingCardSkeleton key={cardIndex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingsTabsSkeleton({ activeIndex = 0 }: { activeIndex?: number }) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="px-4 py-2.5">
          <Skeleton
            className={cn(
              "h-4 rounded",
              index === 0 && "w-24",
              index === 1 && "w-16",
              index === 2 && "w-14",
              activeIndex === index && "opacity-100",
            )}
          />
        </div>
      ))}
    </div>
  );
}

export default function BookingsSkeleton({
  showTitle = true,
  showTabs = true,
  activeTabIndex = 0,
}: {
  showTitle?: boolean;
  showTabs?: boolean;
  activeTabIndex?: number;
}) {
  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {showTitle && <Skeleton className="h-7 sm:h-8 w-48 rounded mb-4 sm:mb-6" />}
      {showTabs && <BookingsTabsSkeleton activeIndex={activeTabIndex} />}
      <BookingsListSkeleton />
    </main>
  );
}
