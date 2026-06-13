import { Suspense } from "react";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={null}>
        <CalendarPageClient />
      </Suspense>
    </div>
  );
}
