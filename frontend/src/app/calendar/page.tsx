import { Suspense } from "react";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import CalendarSkeleton from "@/components/calendar/CalendarSkeleton";

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarPageClient />
      </Suspense>
    </div>
  );
}
