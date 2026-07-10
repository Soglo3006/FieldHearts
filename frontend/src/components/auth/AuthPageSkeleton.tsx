import { Skeleton } from "@/components/ui/skeleton";

type AuthPageSkeletonProps = {
  showSocial?: boolean;
  showLanguageToggle?: boolean;
};

export default function AuthPageSkeleton({
  showSocial = true,
  showLanguageToggle = true,
}: AuthPageSkeletonProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {showLanguageToggle && (
        <div className="absolute top-4 right-4">
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <Skeleton className="mb-6 h-9 w-28 rounded-md" />

        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-2 text-center pb-4">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto h-4 w-56" />
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />

            {showSocial && (
              <>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-px flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-px flex-1" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </>
            )}

            <Skeleton className="mx-auto h-4 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthCallbackContent() {
  return (
    <div className="text-center space-y-4 w-full max-w-sm mx-auto">
      <Skeleton className="mx-auto h-12 w-12 rounded-full" />
      <Skeleton className="mx-auto h-6 w-48" />
      <Skeleton className="mx-auto h-4 w-64" />
    </div>
  );
}

export function AuthCallbackSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <AuthCallbackContent />
    </div>
  );
}

export function ChooseTypeSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="absolute top-4 right-4">
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <Skeleton className="mb-6 h-9 w-28 rounded-md" />
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center space-y-2">
            <Skeleton className="mx-auto h-8 w-56" />
            <Skeleton className="mx-auto h-4 w-72" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompleteProfilSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 pt-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>

      <div className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56 sm:h-8 sm:w-72" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0" />
                <Skeleton className="h-3 w-full max-w-12 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-64 mx-auto sm:mx-0" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
      </main>
    </div>
  );
}
