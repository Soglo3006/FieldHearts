import BookingsSkeleton from "@/components/bookings/BookingsSkeleton";

export default function BookingsLoading() {
  return (
    <div className="min-h-screen bg-white">
      <BookingsSkeleton />
    </div>
  );
}
