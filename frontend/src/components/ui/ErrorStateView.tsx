"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateViewProps = {
  title: string;
  description: string;
  tryAgainLabel: string;
  goHomeLabel: string;
  onRetry: () => void;
  homeHref?: string;
};

export function ErrorStateView({
  title,
  description,
  tryAgainLabel,
  goHomeLabel,
  onRetry,
  homeHref = "/",
}: ErrorStateViewProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-green-50/40 px-4 py-12">
      <div
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-green-200/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-0 h-64 w-64 rounded-full bg-slate-200/40 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-col items-center">
        <Link
          href="/"
          className="mb-8 text-2xl font-bold tracking-tight text-green-800 transition-colors hover:text-green-900"
        >
          Uneden
        </Link>

        <div className="w-full rounded-2xl border border-gray-200/90 bg-white/90 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
              <AlertCircle className="h-7 w-7 text-slate-600" strokeWidth={1.75} />
            </div>
          </div>

          <h1 className="text-center text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            {title}
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-gray-600">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              className="h-10 w-full cursor-pointer bg-green-700 text-white hover:bg-green-800 sm:w-auto sm:min-w-[140px]"
              onClick={onRetry}
            >
              {tryAgainLabel}
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full cursor-pointer border-gray-300 text-gray-800 hover:bg-gray-50 sm:w-auto sm:min-w-[140px]"
              asChild
            >
              <Link href={homeHref}>{goHomeLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
