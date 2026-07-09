import WalletSkeleton from "@/components/wallet/WalletSkeleton";

export default function WalletLoading() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <WalletSkeleton />
      </main>
    </div>
  );
}
