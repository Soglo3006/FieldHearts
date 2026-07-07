import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>

          <div className="border border-gray-200 rounded-2xl p-6 mb-6 flex gap-6 items-start">
            <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full shrink-0" />
            <div className="flex-1 space-y-3 pt-1">
              <Skeleton className="h-7 w-48 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <div className="flex flex-wrap gap-2 pt-1">
                <Skeleton className="h-9 w-36 rounded-lg" />
                <Skeleton className="h-9 w-36 rounded-lg" />
                <Skeleton className="h-9 w-36 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-6 mb-6 space-y-3">
            <Skeleton className="h-6 w-28 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>

          <ProfileListingsGridSkeleton />
        </div>
      </main>
    </div>
  );
}

export function ProfileListingsGridSkeleton({
  count = 3,
  embedded = false,
}: {
  count?: number;
  embedded?: boolean;
}) {
  const grid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );

  if (embedded) return grid;

  return (
    <div className="border border-gray-200 rounded-2xl p-6">
      <Skeleton className="h-6 w-28 rounded mb-4" />
      {grid}
    </div>
  );
}

export function ProfileReviewsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 bg-white space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ProfileListingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-8 w-56 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl shadow-sm bg-white overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
