import { Skeleton } from "@/components/ui/skeleton";

function SimilarServiceCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-1 flex-col space-y-2 p-3">
        <Skeleton className="h-4 w-4/5 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <Skeleton className="h-4 w-1/3 rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

export default function ServiceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white text-black">
      <main className="max-w-7xl mx-auto p-3 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-3 lg:items-start">
          {/* Main column */}
          <section className="order-1 space-y-6 lg:col-span-2">
            {/* Hero carousel */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <Skeleton className="aspect-video w-full rounded-xl" />
            </div>

            {/* Title + provider card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
                  <Skeleton className="h-4 w-2/3 max-w-md rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-4 w-40 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-36 rounded" />
                </div>

                <div className="w-full shrink-0 md:w-52 lg:w-56">
                  <div className="rounded-xl border border-gray-100 bg-white p-4 text-center space-y-3">
                    <Skeleton className="mx-auto h-16 w-16 rounded-full" />
                    <Skeleton className="mx-auto h-4 w-28 rounded" />
                    <Skeleton className="mx-auto h-4 w-32 rounded" />
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3 border-t border-gray-100 pt-6">
                <Skeleton className="h-6 w-40 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>

              <div className="mt-6 space-y-3 border-t border-gray-100 pt-6">
                <Skeleton className="h-6 w-32 rounded" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                </div>
              </div>
            </div>

            {/* FAQ / reviews */}
            <div className="rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-6 w-24 rounded" />
                <div className="space-y-2 rounded-lg border border-gray-100 p-4">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-5/6 rounded" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-6 w-28 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="order-2 space-y-6 lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <Skeleton className="h-6 w-40 rounded" />
              <div className="rounded-lg border border-gray-100 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>

            <Skeleton className="min-h-[250px] w-full rounded-2xl" />
          </aside>

          {/* Similar services */}
          <div className="order-3 space-y-4 lg:col-span-2">
            <Skeleton className="h-6 w-44 rounded" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SimilarServiceCardSkeleton />
              <SimilarServiceCardSkeleton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
