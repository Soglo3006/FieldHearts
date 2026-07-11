"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStartConversation } from "@/hooks/useStartConversation";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceDetailBooking } from "@/hooks/useServiceDetailBooking";
import EditListingModal from "@/components/listings/EditListingModal";
import ServiceHero from "@/components/serviceDetail/ServiceHero";
import ServiceTitleCard from "@/components/serviceDetail/ServiceTitleCard";
import ServiceFaqReviews from "@/components/serviceDetail/ServiceFaqReviews";
import OwnerSidebar from "@/components/serviceDetail/OwnerSidebar";
import BookingSidebar from "@/components/serviceDetail/BookingSidebar";
import SimilarServices from "@/components/serviceDetail/SimilarServices";
import AdBanner from "@/components/AdBanner";
import BookingModal from "@/components/serviceDetail/BookingModal";
import CompleteProfileModal from "@/components/profile/CompleteProfileModal";
import { useBuyerTaxLocation } from "@/hooks/useBuyerTaxLocation";
import LocationMapModal from "@/components/serviceDetail/LocationMapModal";
import ServiceDetailSkeleton from "./ServiceDetailSkeleton";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getServiceLocationEntries, hasApproximateServiceLocation } from "@/lib/serviceLocation";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import {
  estimateBaseAmountForTotals,
  estimateMaxBaseAmountForTotals,
  formatListingPriceLine,
  normalizePricingMode,
  parseListingPriceNum,
} from "@/lib/listingPrice";

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
  pricing_mode?: string | null;
  price: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  estimated_hours?: number | string | null;
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
  client_tax_province?: string | null;
  category_name: string | null;
  listing_tags?: unknown;
  faq?: Array<{ question: string; answer: string }> | string | null;
  favorites_count?: number;
  is_one_time?: boolean;
  hide_exact_location?: boolean;
  is_public?: boolean;
  locations?: Array<{ address?: string; city?: string; lat?: number; lng?: number; location?: string }>;
  deposit_enabled?: boolean;
  deposit_type?: string | null;
  deposit_value?: number | string | null;
  completed_bookings_count?: number | string | null;
  is_active?: boolean;
  completion_summary?: {
    completed_at?: string | null;
    completed_by_worker?: boolean;
    completed_by_client?: boolean;
    client_name?: string | null;
    worker_name?: string | null;
  } | null;
}

interface SimilarService {
  id: string;
  title: string;
  pricing_mode?: string | null;
  price: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  address?: string | null;
  created_at: string;
  city?: string | null;
  hide_exact_location?: boolean;
  image_url: string | null;
  image_urls?: string[] | null;
  language?: string | null;
  translations?: ServiceLikeWithI18n["translations"];
  category?: string | null;
  category_name?: string | null;
  subcategory?: string | null;
  listing_tags?: unknown;
  review_count?: number | string | null;
  average_rating?: number | string | null;
  completed_bookings_count?: number | string | null;
}

type ServiceDetailClientProps = {
  initialService?: Service | null;
};

export default function ServiceDetailClient({ initialService = null }: ServiceDetailClientProps) {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const serviceId = params.id as string;


  const [service, setService] = useState<Service | null>(initialService);
  const [loading, setLoading] = useState(!initialService);
  const [error, setError] = useState(false);
  const [similarServices, setSimilarServices] = useState<SimilarService[]>([]);
  const [providerListingCount, setProviderListingCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(
    typeof initialService?.favorites_count === "number" ? initialService.favorites_count : 0,
  );
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapLocationIndex, setMapLocationIndex] = useState(0);

  const { startConversation, loading: contactLoading } = useStartConversation();
  const { user, session } = useAuth();
  const router = useRouter();

  const [existingBookingStatus, setExistingBookingStatus] = useState<string | null>(null);
  const [showTaxLocationModal, setShowTaxLocationModal] = useState(false);
  const buyerTaxLocation = useBuyerTaxLocation();

  const canOpenBooking = useCallback(() => {
    if (!service || service.type === "looking") return true;
    if (buyerTaxLocation.loading) return false;
    return buyerTaxLocation.isComplete;
  }, [service, buyerTaxLocation.loading, buyerTaxLocation.isComplete]);

  const onBookingBlocked = useCallback(() => {
    setShowTaxLocationModal(true);
  }, []);

  const {
    showBookingModal,
    setShowBookingModal,
    bookingState,
    setBookingState,
    bookingNote,
    setBookingNote,
    bookingErrorMsg,
    setBookingErrorMsg,
    handleBookingRequest,
  } = useServiceDetailBooking({
    serviceId,
    canOpenBooking,
    onBookingBlocked,
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [bookingEstimatedHours, setBookingEstimatedHours] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const serviceMatchesRoute =
    !!service && String(service.id) === String(serviceId);

  useEffect(() => {
    if (!serviceId) return;

    const initialMatches =
      !!initialService && String(initialService.id) === String(serviceId);

    if (initialMatches) {
      setService(initialService);
      setError(false);
      setLoading(false);
      setFavoritesCount(
        typeof initialService.favorites_count === "number" ? initialService.favorites_count : 0,
      );
      return;
    }

    setService((current) =>
      current && String(current.id) === String(serviceId) ? current : null,
    );
    setLoading(true);
    setError(false);
  }, [serviceId, initialService]);

  useEffect(() => {
    if (!serviceId) return;

    const applyFaqs = (data: Service) => {
      const rawFaq = data.faq;
      if (Array.isArray(rawFaq)) {
        setFaqs(rawFaq.filter((x) => x?.question && x?.answer));
      } else if (typeof rawFaq === "string") {
        try {
          const parsed = JSON.parse(rawFaq);
          if (Array.isArray(parsed)) setFaqs(parsed.filter((x) => x?.question && x?.answer));
        } catch {}
      }
    };

    const loadSupplementary = (data: Service) => {
      const ownerHeaders: HeadersInit = {};
      if (session?.access_token) {
        ownerHeaders.Authorization = `Bearer ${session.access_token}`;
      }
      if (data.owner_id) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/user/${data.owner_id}`, { headers: ownerHeaders })
          .then((r) => r.json())
          .then((list) => setProviderListingCount(Array.isArray(list) ? list.length : 0))
          .catch(() => {});
      }

      if (user && session?.access_token) {
        const endpoint = data.type === "looking" ? "received-bookings" : "my-bookings";
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${endpoint}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((bookings: Array<{ service_id: string; status: string }>) => {
            const active = bookings.find(
              (b) => b.service_id === data.id && b.status !== "cancelled" && b.status !== "rejected",
            );
            if (active) setExistingBookingStatus(active.status);
          })
          .catch(() => {});
      }

      const similarUrl = data.category_id
        ? `${process.env.NEXT_PUBLIC_API_URL}/services?category=${data.category_id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/services`;
      fetch(similarUrl)
        .then((r) => r.json())
        .then((json: SimilarService[] | { data?: SimilarService[] }) => {
          const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
          setSimilarServices(list.filter((s) => s.id !== data.id).slice(0, 2));
        })
        .catch(() => {});
    };

    const fetchAll = async () => {
      try {
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const shouldRefetch =
          !service || String(service.id) !== String(serviceId) || !!session?.access_token;
        let data = service;

        if (shouldRefetch) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${serviceId}`, { headers });
          if (!res.ok) {
            setError(true);
            return;
          }
          data = await res.json();
          if (!data) {
            setError(true);
            return;
          }
          setService(data);
          setBookingEstimatedHours("");
          setFavoritesCount(typeof data.favorites_count === "number" ? data.favorites_count : 0);
          applyFaqs(data);
        } else if (data) {
          applyFaqs(data);
        }

        if (data) loadSupplementary(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [serviceId, session?.access_token, user]);

  if (!serviceMatchesRoute || loading) {
    return <ServiceDetailSkeleton />;
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

  const displayPriceLabel = formatListingPriceLine(t, service);
  const estimatedTotalBase = estimateBaseAmountForTotals(service);
  const estimatedTotalBaseMax = estimateMaxBaseAmountForTotals(service);
  const displayTitle = resolveListingTitle(service, i18n.language);
  const providerIsCompany = service.owner_account_type === "company";
  const providerFirstName = providerIsCompany
    ? (service.owner_name ?? "")
    : (service.owner_name?.split(/\s+/)[0] ?? "");
  const providerShortName = providerFirstName || t("serviceDetail.anonymousProvider");
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

  const submitBooking = async () => {
    setBookingState("loading");
    try {
      const body: Record<string, unknown> = {
        service_id: service.id,
        client_description: bookingNote || null,
      };
      if (normalizePricingMode(service.pricing_mode) === "hourly" && bookingEstimatedHours.trim()) {
        const hours = Number(bookingEstimatedHours);
        if (Number.isFinite(hours) && hours > 0) body.estimated_hours = hours;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
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
              favoritesCount={favoritesCount}
              providerListingCount={providerListingCount}
              onOpenMap={(index) => {
                setMapLocationIndex(index ?? 0);
                setIsMapOpen(true);
              }}
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
                completionSummary={
                  service.is_active === false ? service.completion_summary ?? null : null
                }
              />
            ) : (
              <BookingSidebar
                serviceType={service.type}
                displayPriceLabel={displayPriceLabel}
                estimatedTotalBase={estimatedTotalBase}
                estimatedTotalBaseMax={estimatedTotalBaseMax}
                providerFirstName={providerShortName}
                providerIsCompany={providerIsCompany}
                pricingMode={service.pricing_mode}
                serviceEstimatedHours={parseListingPriceNum(service.estimated_hours)}
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
              prev ? { ...prev, ...updated } satisfies Service : prev
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
          serviceType={service.type}
          displayPriceLabel={displayPriceLabel}
          estimatedTotalBase={estimatedTotalBase}
          estimatedTotalBaseMax={estimatedTotalBaseMax}
          serviceTitle={displayTitle}
          providerFirstName={providerShortName}
          workerProvince={service.owner_province}
          clientTaxProvince={service.client_tax_province}
          onNoteChange={setBookingNote}
          pricingMode={service.pricing_mode}
          hourlyRate={normalizePricingMode(service.pricing_mode) === "hourly" ? Number(service.price) : null}
          estimatedHours={bookingEstimatedHours}
          onEstimatedHoursChange={setBookingEstimatedHours}
          onSubmit={submitBooking}
          onClose={() => setShowBookingModal(false)}
          onMessageProvider={() => {
            setShowBookingModal(false);
            startConversation(String(service.owner_id), `/serviceDetail/${serviceId}`);
          }}
        />
      )}

      {isMapOpen && service && (() => {
        const mapEntries = getServiceLocationEntries(service);
        const active = mapEntries[mapLocationIndex] ?? mapEntries[0];
        if (!active) return null;
        return (
          <LocationMapModal
            location={active.label}
            lat={active.lat}
            lng={active.lng}
            isApproximate={hasApproximateServiceLocation(service)}
            onClose={() => setIsMapOpen(false)}
          />
        );
      })()}

      <CompleteProfileModal
        open={showTaxLocationModal}
        onClose={() => setShowTaxLocationModal(false)}
        titleKey="serviceDetail.taxLocationRequired"
        descKey="serviceDetail.taxLocationRequiredDesc"
      />
    </div>
  );
}
