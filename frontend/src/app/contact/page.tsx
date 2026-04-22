"use client";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

type ContactSubject = { value: string; label: string };
type ContactFeature = { title: string; desc: string };

export default function ContactPage() {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", subject: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: sbError } = await supabase.from("contact_submissions").insert({
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      subject: form.subject,
      message: form.message,
    });
    if (sbError) {
      setError(t("contactPage.error"));
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  };

  const subjects = t("contactPage.subjects", { returnObjects: true }) as ContactSubject[];
  const features = t("contactPage.features", { returnObjects: true }) as ContactFeature[];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto border-2 border-green-700 rounded-2xl overflow-hidden shadow-sm bg-white grid grid-cols-1 lg:grid-cols-2">

        {/* Left panel */}
        <div className="bg-green-800 px-10 py-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-green-700">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              {t("contactPage.heroTitle")}
            </h1>
            <p className="text-green-200 text-sm mb-12 leading-relaxed">
              {t("contactPage.heroSubtitle")}
            </p>

            <div className="space-y-8">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300 shrink-0 mt-1.5" />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{f.title}</p>
                    <p className="text-green-200 text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right panel — form */}
        <div className="px-8 py-12 flex items-center justify-center bg-white">
          <div className="w-full max-w-lg">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("contactPage.successTitle")}
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  {t("contactPage.successMessage")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSubmitted(false); setForm({ firstName: "", lastName: "", email: "", subject: "", message: "" }); }}
                  className="cursor-pointer"
                >
                  {t("contactPage.sendAnother")}
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {t("contactPage.formTitle")}
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  {t("contactPage.formSubtitle")}
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* First + Last name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">
                        {t("contactPage.firstNameLabel")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        required
                        placeholder={t("contactPage.firstNamePlaceholder")}
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">
                        {t("contactPage.lastNameLabel")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        required
                        placeholder={t("contactPage.lastNamePlaceholder")}
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      {t("contactPage.emailLabel")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder={t("contactPage.emailPlaceholder")}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">
                      {t("contactPage.subjectLabel")} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      required
                      value={form.subject}
                      onValueChange={(val) => setForm({ ...form, subject: val })}
                    >
                      <SelectTrigger id="subject" className="w-full">
                        <SelectValue placeholder={t("contactPage.subjectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="message">
                      {t("contactPage.messageLabel")} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      required
                      rows={5}
                      placeholder={t("contactPage.messagePlaceholder")}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 text-center">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !form.subject}
                    className="cursor-pointer w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 h-12"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : t("contactPage.submit")}
                  </Button>

                  <p className="text-xs text-gray-400 text-center">
                    <Trans
                      i18nKey="contactPage.privacyNotice"
                      components={{
                        link: <a href="/privacy-policy" title={t("footer.privacyPolicy")} aria-label={t("footer.privacyPolicy")} className="text-green-600 hover:underline" />,
                      }}
                    />
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
