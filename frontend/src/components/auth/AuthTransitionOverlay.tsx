"use client";

import { Spinner } from "@/components/ui/Spinner";

type AuthTransitionOverlayProps = {
  message: string;
};

export function AuthTransitionOverlay({ message }: AuthTransitionOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-white">
      <Spinner size="lg" />
      <p className="text-sm font-medium text-gray-600">{message}</p>
    </div>
  );
}
