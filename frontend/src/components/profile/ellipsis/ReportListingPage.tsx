"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface Listing { id: string; title: string; price: string | number; image_url?: string | null; }

interface Props {
  profileId: string;
  displayName: string;
  userListings: Listing[];
  onClose: () => void;
}

export default function ReportListingPage({ profileId, displayName, userListings, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedListingId, setSelectedListingId] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedListingId || !reason || !details.trim()) { toast.error(t("report.fillAllFields")); return; }
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/listing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ listing_id: selectedListingId, reported_user_id: profileId, reason, description: details }),
      });
      if (!response.ok) throw new Error("Failed to submit");
      setSuccess(true);
    } catch {
      toast.error(t("report.failedSubmit"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-7 w-7 text-green-700" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{t("report.received")}</h3>
        <p className="text-sm text-gray-600">{t("report.receivedListingDesc")}</p>
        <Button className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer" onClick={onClose}>
          {t("report.close")}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <p className="text-sm text-gray-600">{t("report.selectListingToReport", { name: displayName })}</p>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">{t("report.listing")}</label>
        {userListings.length === 0 ? (
          <p className="text-sm text-gray-500 italic">{t("report.noListings")}</p>
        ) : (
          <Select value={selectedListingId} onValueChange={setSelectedListingId}>
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder={t("report.selectListing")} />
            </SelectTrigger>
            <SelectContent>
              {userListings.map((listing) => (
                <SelectItem key={listing.id} value={listing.id} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    {listing.image_url && <img src={listing.image_url} className="w-6 h-6 rounded object-cover" />}
                    <span className="truncate max-w-[250px]">{listing.title}</span>
                    <span className="text-gray-400 text-xs">${listing.price}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">{t("report.reason")}</label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder={t("report.selectReason")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="misleading" className="cursor-pointer">{t("report.misleading")}</SelectItem>
            <SelectItem value="price" className="cursor-pointer">{t("report.wrongPrice")}</SelectItem>
            <SelectItem value="illegal" className="cursor-pointer">{t("report.illegal")}</SelectItem>
            <SelectItem value="offensive" className="cursor-pointer">{t("report.offensive")}</SelectItem>
            <SelectItem value="scam" className="cursor-pointer">{t("report.scam")}</SelectItem>
            <SelectItem value="other" className="cursor-pointer">{t("report.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">{t("report.details")}</label>
        <Textarea
          placeholder={t("report.listingDetailPlaceholder")}
          className="min-h-[120px] resize-none"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>

      <Button
        className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer"
        onClick={handleSubmit}
        disabled={loading || !selectedListingId || !reason || !details.trim()}
      >
        {loading ? t("report.submitting") : t("report.submit")}
      </Button>
    </div>
  );
}
