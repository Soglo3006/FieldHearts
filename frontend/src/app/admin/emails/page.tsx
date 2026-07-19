"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminPortal } from "@/lib/auth";
import { adminApiHeaders } from "@/lib/adminStepUp";
import { Spinner } from "@/components/ui/Spinner";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

type RecipientType = "all_users" | "manual";

export default function AdminEmailsPage() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const { t } = useTranslation();
  const [allowed, setAllowed] = useState(false);

  const [recipientType, setRecipientType] = useState<RecipientType>("all_users");
  const [manualEmail, setManualEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [headerVariant, setHeaderVariant] = useState("standard");
  const [message, setMessage] = useState("");
  const [footerVariant, setFooterVariant] = useState("standard");

  const [sending, setSending] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!canAccessAdminPortal(user)) { router.replace("/"); return; }
    setAllowed(true);
  }, [user, loading, router]);

  const handleSend = async () => {
    if (!session?.access_token) return;
    setResultMessage(null);
    setErrorMessage(null);

    if (!subject.trim()) { setErrorMessage(t("admin.emails.subjectRequired")); return; }
    if (!message.trim()) { setErrorMessage(t("admin.emails.messageRequired")); return; }
    if (recipientType === "manual" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail.trim())) {
      setErrorMessage(t("admin.emails.invalidEmail"));
      return;
    }

    const confirmMsg =
      recipientType === "all_users" ? t("admin.emails.confirmAllUsers") : t("admin.emails.confirmManual");
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/emails/send-custom`, {
        method: "POST",
        headers: {
          ...adminApiHeaders(session.access_token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientType,
          manualEmail: recipientType === "manual" ? manualEmail.trim() : undefined,
          subject,
          message,
          headerVariant,
          footerVariant,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || t("admin.emails.sendError"));
        return;
      }
      setResultMessage(t("admin.emails.sendSuccess", { sent: data.sent, total: data.total }));
    } catch {
      setErrorMessage(t("admin.emails.sendError"));
    } finally {
      setSending(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <main className="max-w-3xl mx-auto p-5">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t("admin.emails.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("admin.emails.subtitle")}</p>
        </div>

        <Card className="p-6 space-y-5">
          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("admin.emails.recipientLabel")}</label>
            <Select value={recipientType} onValueChange={(v) => setRecipientType(v as RecipientType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_users">{t("admin.emails.recipientAllUsers")}</SelectItem>
                <SelectItem value="manual">{t("admin.emails.recipientManual")}</SelectItem>
              </SelectContent>
            </Select>
            {recipientType === "manual" && (
              <Input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder={t("admin.emails.manualEmailPlaceholder")}
                className="mt-2"
              />
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("admin.emails.subjectLabel")}</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("admin.emails.subjectPlaceholder")} />
          </div>

          {/* Header */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("admin.emails.headerLabel")}</label>
            <Select value={headerVariant} onValueChange={setHeaderVariant}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t("admin.emails.headerStandard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("admin.emails.messageLabel")}</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("admin.emails.messagePlaceholder")}
              className="min-h-48"
            />
          </div>

          {/* Footer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("admin.emails.footerLabel")}</label>
            <Select value={footerVariant} onValueChange={setFooterVariant}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t("admin.emails.footerStandard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          {resultMessage && <p className="text-sm text-green-700">{resultMessage}</p>}

          <div className="pt-1">
            <Button onClick={handleSend} disabled={sending} className="bg-green-700 hover:bg-green-800 text-white gap-2">
              <Send className="h-4 w-4" />
              {sending ? t("admin.emails.sending") : t("admin.emails.sendButton")}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
