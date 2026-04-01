export type BookingStatus = "pending" | "accepted" | "active" | "completed" | "cancelled" | "rejected";

interface BookingBase {
  id: string;
  service_id: string;
  client_id: string;
  worker_id: string;
  status: BookingStatus;
  created_at: string;
  title: string;
  price: string | number;
  image_url: string | null;
  image_urls?: string[] | null;
  category: string | null;
  service_location: string | null;
  has_reviewed: boolean;
  has_dispute: boolean;
  payment_status: string | null;
  completed_by_worker: boolean;
  completed_by_client: boolean;
  client_description: string | null;
  service_type?: "offer" | "looking";
  is_one_time?: boolean;
  worker_note?: string | null;
  custom_price?: number | null;
  last_modified_at?: string | null;
  modified_fields?: string[] | null;
  cancel_requested_by?: string | null;
  cancel_reason?: string | null;
  tax_rate?: number | null;
  worker_province?: string | null;
  client_province?: string | null;
  completed_at?: string | null;
}

export interface ReceivedBooking extends BookingBase {
  client_name: string;
}

export interface SentBooking extends BookingBase {
  worker_name: string;
}

export const STATUS_CONFIG: Record<BookingStatus, { label: string; bar: string; badge: string }> = {
  pending:   { label: "En attente", bar: "bg-yellow-400",  badge: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  accepted:  { label: "Acceptée",   bar: "bg-green-500",  badge: "bg-green-100 text-green-800 border-green-200" },
  active:    { label: "Active",     bar: "bg-green-500",  badge: "bg-green-100 text-green-800 border-green-200" },
  completed: { label: "Terminée",   bar: "bg-green-500",  badge: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Annulée",    bar: "bg-red-400",    badge: "bg-red-100 text-red-700 border-red-200" },
  rejected:  { label: "Refusée",    bar: "bg-red-400",    badge: "bg-red-100 text-red-700 border-red-200" },
};

export function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("fr-CA", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

export const BOOKING_GROUPS = [
  { label: "Demandes", statuses: ["pending"] as BookingStatus[] },
  { label: "Active",   statuses: ["accepted", "active"] as BookingStatus[] },
  { label: "Fermées",  statuses: ["cancelled", "rejected"] as BookingStatus[] },
] as const;
