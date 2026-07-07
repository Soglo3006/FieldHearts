import CalendarSkeleton from "@/components/calendar/CalendarSkeleton";

export default function CalendarLoading() {
  return (
    <div className="min-h-screen bg-white">
      <CalendarSkeleton />
    </div>
  );
}
