import { Skeleton } from "@/components/ui/skeleton";

export default function PostSkeleton() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 space-y-3">
            <Skeleton className="mx-auto h-10 w-72 max-w-full rounded-lg" />
            <Skeleton className="mx-auto h-5 w-96 max-w-full rounded" />
          </div>

          <div className="flex gap-4 mb-6">
            <Skeleton className="h-14 flex-1 rounded-xl" />
            <Skeleton className="h-14 flex-1 rounded-xl" />
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="aspect-video w-full max-w-md rounded-xl" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>

            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
