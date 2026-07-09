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
  return (
    <div className="min-h-screen bg-white text-black">
      <main className="flex-1">
        <div className="relative overflow-hidden bg-green-800/20 px-4 py-16 sm:py-32 md:py-40">
          <div className="relative z-10 mx-auto max-w-2xl space-y-3 text-center">
            <Skeleton className="mx-auto h-8 w-64 sm:h-10 sm:w-80" />
            <Skeleton className="mx-auto h-5 w-56 sm:w-72" />
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-5">
          <div className="mb-6 max-w-xl space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-3 w-4/5" />
          </div>

          <Skeleton className="mb-5 h-8 w-48" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <HomeListingGridSkeleton
              count={9}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 lg:col-span-3"
            />

            <div className="hidden space-y-6 lg:col-span-1 lg:block">
              <Skeleton className="w-full rounded-xl" style={{ minHeight: 300 }} />
              <Skeleton className="w-full rounded-xl" style={{ minHeight: 250 }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
