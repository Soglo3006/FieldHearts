"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SupportModal({ open, onClose }: SupportModalProps) {
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setSuccess(null);
    if (!user) {
      setError(t("support.notSignedIn"));
      return;
    }
    if (!description.trim()) {
      setError(t("support.describeIssue"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subject, category, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("support.error"));
      }
      setSuccess(t("support.success"));
      setSubject("");
      setCategory("");
      setDescription("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t("support.title")}</h3>
          <button className="cursor-pointer text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {t("support.subtitle")}
        </p>

        <div className="space-y-3">
          <Input placeholder={t("support.subjectPlaceholder")} value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input placeholder={t("support.categoryPlaceholder")} value={category} onChange={(e) => setCategory(e.target.value)} />
          <Textarea placeholder={t("support.messagePlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {success && <div className="mt-3 text-sm text-green-700">{success}</div>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={loading} className="bg-green-700 text-white hover:bg-green-800 cursor-pointer">
            {loading ? t("support.sending") : t("support.send")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
