import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function WalletTransactionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <CardContent className="pt-5 pb-5 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </CardContent>
  );
}

export function WalletSummaryListSkeleton() {
  return (
    <div className="px-5 py-4 space-y-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function WalletModalListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="px-5 py-4 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-5 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function WalletBankAccountSkeleton({
  variant = "card",
}: {
  variant?: "card" | "inline";
}) {
  const body = (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-2">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );

  if (variant === "inline") {
    return <div className="py-2">{body}</div>;
  }

  return (
    <Card className="gap-0 border-green-100 py-0 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        {body}
      </CardContent>
    </Card>
  );
}

function WalletTransactionHistorySkeleton() {
  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5 space-y-2.5">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
        <div className="mt-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-40" />
          <div className="space-y-1 text-right">
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>
      </CardHeader>
      <Separator />
      <WalletTransactionListSkeleton />
    </Card>
  );
}

export default function WalletSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />

      <WalletBankAccountSkeleton />

      <Card className="shadow-md overflow-hidden border-green-100">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-green-700/15 to-green-800/15 px-5 py-4">
            <Skeleton className="h-3 w-28 mb-2" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-full max-w-[10rem]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="pt-4 pb-4 px-4 sm:pt-5 sm:pb-5 sm:px-5 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-5">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardContent>
      </Card>

      <WalletTransactionHistorySkeleton />
    </div>
  );
}
