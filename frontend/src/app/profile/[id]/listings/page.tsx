"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { Grid3x3, MapPin, ArrowLeft } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import AppImage from "@/components/ui/AppImage";
import { useTranslation } from "react-i18next";
import { resolveListingTitle, type ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
import ListingLangPills from "@/components/ui/ListingLangPills";
import { getPublicServiceLocation } from "@/lib/serviceLocation";
import { formatListingPriceLine } from "@/lib/listingPrice";

interface Service extends ServiceLikeWithI18n {
  id: string;
  type: "offer" | "looking";
  title: string;
  price: string | number | null;
  pricing_mode?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  owner_name: string;
}

export default function UserListingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const [listings, setListings] = useState<Service[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [blockResolved, setBlockResolved] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);

  useEffect(() => {
    if (!id || authLoading) return;

    if (!user || user.id === id) {
      setBlockedByMe(false);
      setBlockResolved(true);
      return;
    }

    let cancelled = false;
    setBlockResolved(false);
    setBlockedByMe(false);
    (async () => {
      const { data } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_user_id", id)
        .maybeSingle();
      if (cancelled) return;
      setBlockedByMe(!!data);
      setBlockResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

  useEffect(() => {
    if (!blockResolved || !user || user.id === id || !blockedByMe) return;
    router.replace(`/profile/${id}`);
  }, [blockResolved, blockedByMe, user, id, router]);

  useEffect(() => {
    if (!id) return;
    const guestOrOwner = !user || user.id === id;
    if (!guestOrOwner && !blockResolved) return;
    if (user && user.id !== id && blockedByMe) return;

    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/user/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setListings(data);
          if (data.length > 0) setOwnerName(data[0].owner_name ?? "");
        } else {
          setListings([]);
          setOwnerName("");
        }
      })
      .catch(() => {
        setListings([]);
        setOwnerName("");
      })
      .finally(() => setLoading(false));
  }, [id, blockResolved, user, blockedByMe]);

  const viewingOtherWhileLoggedIn = Boolean(user && id && user.id !== id);
  const blockPending = viewingOtherWhileLoggedIn && !blockResolved;
  const redirecting = Boolean(blockResolved && user && id && user.id !== id && blockedByMe);

  if (authLoading || blockPending || redirecting) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/profile/${id}`} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {ownerName ? `${ownerName} · ${t("profile.listings")}` : t("profile.listings")}
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-xl shadow-sm bg-white animate-pulse overflow-hidden">
                <div className="w-full aspect-video bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Grid3x3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">{t("profile.noListings")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((s) => {
              const thumb = s.image_urls?.[0] ?? s.image_url;
              const resolved = resolveListingTitle(s, i18n.language);
              return (
                <div key={s.id} className="border rounded-xl shadow-sm bg-white flex flex-col overflow-hidden hover:shadow-lg transition-all">
                  <Link href={`/serviceDetail/${s.id}`} className="block">
                    <AspectRatio ratio={16 / 9}>
                      <div className="relative h-full w-full">
                        <ListingLangPills service={s} />
                        {thumb ? (
                          <AppImage
                            src={thumb}
                            alt={resolved}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Grid3x3 className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </AspectRatio>
                  </Link>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start gap-2 mb-1">
                      <Link href={`/serviceDetail/${s.id}`} className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-1 hover:text-green-700 transition-colors">
                          {resolved}
                        </h3>
                      </Link>
                      {s.type === "looking" && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs flex-shrink-0 border-0">{t("listings.looking")}</Badge>
                      )}
                    </div>

                    <p className="text-green-700 font-bold text-lg mb-2">{formatListingPriceLine(t, s)}</p>

                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="line-clamp-1">{getPublicServiceLocation(s)}</span>
                    </div>

                    {s.category && (
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {s.category}
                        {s.subcategory && ` • ${s.subcategory}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
