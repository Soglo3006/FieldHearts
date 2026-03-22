"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface Props {
  profileId: string;
  displayName: string;
  onClose: () => void;
}

export default function ReportUserPage({ profileId, displayName, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason || !details.trim()) { toast.error(t("report.fillAllFields")); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id, reported_user_id: profileId,
        reason, description: details, status: "pending",
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      toast.error(t("report.failedSubmit"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-green-700" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{t("report.received")}</h3>
        <p className="text-gray-600">
          {t("report.receivedUserDesc", { name: displayName })}
        </p>
        <Button className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer" onClick={onClose}>
          {t("report.close")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <p className="text-gray-600">{t("report.tellUsWhy", { name: displayName })}</p>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">{t("report.reason")}</label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder={t("report.selectReason")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inappropriate" className="cursor-pointer">{t("report.inappropriate")}</SelectItem>
            <SelectItem value="fraud" className="cursor-pointer">{t("report.fraud")}</SelectItem>
            <SelectItem value="harassment" className="cursor-pointer">{t("report.harassment")}</SelectItem>
            <SelectItem value="spam" className="cursor-pointer">{t("report.spam")}</SelectItem>
            <SelectItem value="fake" className="cursor-pointer">{t("report.fake")}</SelectItem>
            <SelectItem value="other" className="cursor-pointer">{t("report.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">{t("report.details")}</label>
        <Textarea
          placeholder={t("report.detailsPlaceholder")}
          className="min-h-[120px] resize-none"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>
      <Button
        className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer"
        onClick={handleSubmit}
        disabled={loading || !reason || !details.trim()}
      >
        {loading ? t("report.submitting") : t("report.submit")}
      </Button>
    </Card>
  );
}
