"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStartConversation } from "@/hooks/useStartConversation";
import { useAuth } from "@/contexts/AuthContext";
import EditListingModal from "@/components/listings/EditListingModal";
import ServiceHero from "@/components/serviceDetail/ServiceHero";
import ServiceTitleCard from "@/components/serviceDetail/ServiceTitleCard";
import ServiceFaqReviews from "@/components/serviceDetail/ServiceFaqReviews";
import OwnerSidebar from "@/components/serviceDetail/OwnerSidebar";
import BookingSidebar from "@/components/serviceDetail/BookingSidebar";
import SimilarServices from "@/components/serviceDetail/SimilarServices";
import AdBanner from "@/components/AdBanner";
import BookingModal from "@/components/serviceDetail/BookingModal";
import LocationMapModal from "@/components/serviceDetail/LocationMapModal";
import { useTranslation } from "react-i18next";
import { getPublicServiceLocation, hasApproximateServiceLocation } from "@/lib/serviceLocation";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";

interface Service {
  id: string;
  user_id: string;
  type: "offer" | "looking";
  title: string;
  description: string;
  translations?: ServiceLikeWithI18n["translations"];
  category: string | null;
  category_id: number | null;
  subcategory: string | null;
  price: number;
  location: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  poster_type: string | null;
  availability: string | null;
  language: string | null;
  mobility: string | null;
  duration: string | null;
  urgency: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at: string;
  owner_name: string;
  owner_id: string;
  owner_avatar: string | null;
  owner_account_type: string | null;
  owner_province?: string | null;
  category_name: string | null;
  faq?: Array<{ question: string; answer: string }> | string | null;
  favorites_count?: number;
  is_one_time?: boolean;
  hide_exact_location?: boolean;
  /** Toujours `fixed` côté API (tarif horaire désactivé). */
  pricing_kind?: string;
}

interface SimilarService {
  id: string;
  title: string;
  price: number;
  location: string;
  address?: string | null;
  created_at: string;
  city?: string | null;
  hide_exact_location?: boolean;
  image_url: string | null;
  image_urls?: string[] | null;
  language?: string | null;
  translations?: ServiceLikeWithI18n["translations"];
}

export default function ServiceDetailClient() {
  const { t, i18n } = useTranslation();

  function formatRelativeDate(dateStr: string): string {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (minutes < 5) return t("home.justNow");
      if (minutes < 60) return t("home.minutesAgo", { minutes });
      if (hours < 24) return t("home.hoursAgo", { hours });
      if (days === 1) return t("home.yesterday");
      if (days < 7) return t("home.daysAgo", { days });
      return t("home.weeksAgo", { weeks: Math.floor(days / 7) });
    } catch {
      return dateStr;
    }
  }
  const params = useParams();
  const serviceId = params.id as string;


  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [similarServices, setSimilarServices] = useState<SimilarService[]>([]);
  const [providerListingCount, setProviderListingCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const { startConversation, loading: contactLoading } = useStartConversation();
  const { user, session } = useAuth();
  const router = useRouter();

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingState, setBookingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingErrorMsg, setBookingErrorMsg] = useState("");
  const [existingBookingStatus, setExistingBookingStatus] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    const fetchAll = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${serviceId}`);
        if (!res.ok) { setError(true); return; }
        const data: Service = await res.json();
        setService(data);
        setFavoritesCount(typeof data.favorites_count === "number" ? data.favorites_count : 0);

        const rawFaq = data.faq;
        if (Array.isArray(rawFaq)) {
          setFaqs(rawFaq.filter((x) => x?.question && x?.answer));
        } else if (typeof rawFaq === "string") {
          try {
            const parsed = JSON.parse(rawFaq);
            if (Array.isArray(parsed)) setFaqs(parsed.filter((x) => x?.question && x?.answer));
          } catch {}
        }

        if (data.owner_id) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/user/${data.owner_id}`)
            .then((r) => r.json())
            .then((list) => setProviderListingCount(Array.isArray(list) ? list.length : 0))
            .catch(() => {});
        }

        if (user && session?.access_token) {
          const endpoint = data.type === "looking" ? "received-bookings" : "my-bookings";
          try {
            const br = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${endpoint}`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const bookings: Array<{ service_id: string; status: string }> = await br.json();
            const active = bookings.find(
              (b) => b.service_id === data.id && b.status !== "cancelled" && b.status !== "rejected"
            );
            if (active) setExistingBookingStatus(active.status);
          } catch {}
        }

        const similarUrl = data.category_id
          ? `${process.env.NEXT_PUBLIC_API_URL}/services?category=${data.category_id}`
          : `${process.env.NEXT_PUBLIC_API_URL}/services`;
        fetch(similarUrl)
          .then((r) => r.json())
          .then((list: SimilarService[]) => setSimilarServices(list.filter((s) => s.id !== data.id).slice(0, 2)))
          .catch(() => {});
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [serviceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black">
        <main className="max-w-7xl mx-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start animate-pulse">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-gray-200 aspect-video w-full" />
              <div className="bg-gray-100 rounded-2xl p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="bg-gray-100 rounded-2xl p-6 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-2xl p-6 space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-11 bg-gray-200 rounded-xl w-full mt-4" />
                <div className="h-11 bg-gray-200 rounded-xl w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-white text-black">
        <main className="max-w-7xl mx-auto p-5">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("serviceDetail.serviceNotFound")}</h1>
            <p className="text-gray-600 mb-6">{t("serviceDetail.serviceNotFoundDesc")}</p>
            <Link href="/listings">
              <Button className="bg-green-700 text-white hover:bg-green-800">{t("serviceDetail.backToListings")}</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const price = Number(service.price);
  const displayTitle = resolveListingTitle(service, i18n.language);
  const providerFirstName = service.owner_account_type === "company"
    ? (service.owner_name ?? "Provider")
    : (service.owner_name?.split(" ")[0] ?? "Provider");
  const isOwner = !!user && user.id === service.user_id;

  const handleOwnerDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${service.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) router.push("/my-listings");
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleBookingRequest = () => {
    if (!user) { router.push(`/login?redirect=/serviceDetail/${serviceId}`); return; }
    setBookingState("idle");
    setBookingNote("");
    setShowBookingModal(true);
  };

  const submitBooking = async () => {
    setBookingState("loading");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ service_id: service.id, client_description: bookingNote || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBookingErrorMsg(data.message || t("serviceDetail.bookingError"));
        setBookingState("error");
        return;
      }
      setExistingBookingStatus("pending");
      setBookingState("success");
    } catch {
      setBookingErrorMsg(t("serviceDetail.bookingError"));
      setBookingState("error");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <main className="max-w-7xl mx-auto p-3 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 lg:items-start">
          {/* Main content */}
          <section className="lg:col-span-2 space-y-6 order-1">
            <ServiceHero
              images={service.image_urls?.length ? service.image_urls : service.image_url ? [service.image_url] : []}
              title={displayTitle}
              listingForLangPills={service}
            />
            <ServiceTitleCard
              service={service}
              price={price}
              favoritesCount={favoritesCount}
              providerListingCount={providerListingCount}
              onOpenMap={() => setIsMapOpen(true)}
              formatRelativeDate={formatRelativeDate}
            />
            <ServiceFaqReviews faqs={faqs} />
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6 order-2">
            {isOwner ? (
              <OwnerSidebar
                confirmDelete={confirmDelete}
                deleting={deleting}
                onEdit={() => setShowEditModal(true)}
                onDelete={handleOwnerDelete}
                onCancelDelete={() => setConfirmDelete(false)}
              />
            ) : (
              <BookingSidebar
                serviceType={service.type}
                price={price}
                ownerId={service.owner_id}
                workerProvince={service.owner_province}
                providerFirstName={providerFirstName}
                availability={service.availability}
                language={service.language}
                mobility={service.mobility}
                existingBookingStatus={existingBookingStatus}
                contactLoading={contactLoading}
                onBookingRequest={handleBookingRequest}
                onContact={() => startConversation(String(service.owner_id), `/serviceDetail/${serviceId}`)}
              />
            )}

            {/* Ad */}
            <AdBanner slot="SERVICE_DETAIL_SIDEBAR_SLOT" format="vertical" style={{ minHeight: 250 }} />
          </aside>

          <SimilarServices services={similarServices} />
        </div>
      </main>

      {showEditModal && service && session?.access_token && (
        <EditListingModal
          service={service}
          accessToken={session.access_token}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setService((prev) =>
              prev ? { ...prev, ...updated, price: Number(updated.price) } satisfies Service : prev
            );
            setShowEditModal(false);
          }}
        />
      )}

      {showBookingModal && (
        <BookingModal
          state={bookingState}
          note={bookingNote}
          errorMsg={bookingErrorMsg}
          price={price}
          serviceTitle={displayTitle}
          providerFirstName={providerFirstName}
          workerProvince={service.owner_province}
          onNoteChange={setBookingNote}
          onSubmit={submitBooking}
          onClose={() => setShowBookingModal(false)}
          onMessageProvider={() => {
            setShowBookingModal(false);
            startConversation(String(service.owner_id), `/serviceDetail/${serviceId}`);
          }}
        />
      )}

      {isMapOpen && (
        <LocationMapModal
          location={getPublicServiceLocation(service)}
          lat={service.hide_exact_location ? null : service.latitude}
          lng={service.hide_exact_location ? null : service.longitude}
          isApproximate={hasApproximateServiceLocation(service)}
          onClose={() => setIsMapOpen(false)}
        />
      )}
    </div>
  );
}
