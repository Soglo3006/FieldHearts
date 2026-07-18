"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import EditBasicInfoCard from "@/components/profile/EditBasicInfoCard";
import EditPortfolioCard from "@/components/profile/EditPortfolioCard";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "react-i18next";

interface FormData {
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  skills: string[];
  languages: (string | { language: string; proficiency: string })[];
  portfolio: { id: number; image: string; title: string }[];
  fullName: string;
  profession: string;
  companyName: string;
  industry: string;
  teamSize: string;
}

const EMPTY_FORM: FormData = {
  email: "", phone: "", avatar: "", bio: "", address: "", city: "", province: "", postalCode: "",
  skills: [], languages: [], portfolio: [],
  fullName: "", profession: "",
  companyName: "", industry: "", teamSize: "",
};

export default function EditProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, session, loading: authLoading } = useAuth();

  const [accountType, setAccountType] = useState<"person" | "company">("person");
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [initialData, setInitialData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isPerson = accountType === "person";
  const isCompany = accountType === "company";

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!session?.access_token) return;
    if (initialData !== null) return; // already loaded — don't overwrite user's edits on token refresh
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(t("profileEdit.failedLoadProfile"));
        const data = await res.json();
        setAccountType(data.account_type || "person");

        const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v || []);
        const profile: FormData = {
          email: data.email || "",
          phone: data.phone || "",
          avatar: data.avatar || "",
          bio: data.bio || "",
          address: data.address || "",
          city: data.city || "",
          province: data.province || "",
          postalCode: data.postal_code || "",
          skills: parse(data.skills),
          languages: parse(data.languages),
          portfolio: parse(data.portfolio),
          fullName: data.full_name || "",
          profession: data.profession || "",
          companyName: data.company_name || "",
          industry: data.industry || "",
          teamSize: data.team_size || "",
        };
        setFormData(profile);
        setInitialData(JSON.parse(JSON.stringify(profile)));
      } catch {
        toast.error(t("profile.loadError"));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [session?.access_token, initialData, t]);

  const patch = (update: Partial<FormData>) => setFormData((p) => ({ ...p, ...update }));

  const handleSave = async () => {
    if (!session?.access_token) return;
    setSaving(true);
    try {
      const payload = {
        email: formData.email,
        full_name: formData.fullName,
        phone: formData.phone,
        avatar: formData.avatar,
        bio: formData.bio,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        skills: formData.skills,
        languages: formData.languages,
        portfolio: formData.portfolio,
        account_type: accountType,
        ...(isPerson && { profession: formData.profession }),
        ...(isCompany && { company_name: formData.companyName, industry: formData.industry, team_size: formData.teamSize }),
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed to update profile"); }
      router.push(`/profile/${user?.id}`);
    } catch {
      toast.error(t("profileEdit.failedSaveProfile"));
      setSaving(false);
    }
  };

  const isFormValid = () => {
    const base = !!formData.phone.trim() && !!formData.address.trim() && !!formData.city.trim() && !!formData.province.trim() && !!formData.postalCode.trim();
    return isPerson ? base && !!formData.fullName.trim() : base && !!formData.companyName.trim();
  };

  const isUnchanged = JSON.stringify(formData) === JSON.stringify(initialData);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <Link href="/"><span className="hover:text-green-700 cursor-pointer">{t("notFound.goHome")}</span></Link>
              <ChevronRight className="h-4 w-4 mx-1" />
              <Link href={`/profile/${user?.id}`}>
                <span className="hover:text-green-700 cursor-pointer">
                  {isPerson ? t("profile.yourProfile") : t("profile.yourCompanyProfile")}
                </span>
              </Link>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="text-green-700 font-medium">{t("common.edit")}</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                {isPerson ? t("profile.editProfile") : t("profileEdit.editCompanyProfile")}
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              {isPerson ? t("profileEdit.updatePersonalInfo") : t("profileEdit.updateCompanyInfo")}
            </p>
          </div>

          <EditBasicInfoCard formData={formData} accountType={accountType} onChange={patch} />

          <EditPortfolioCard
            portfolio={formData.portfolio}
            isPerson={isPerson}
            onAdd={(item) => patch({ portfolio: [...formData.portfolio, item] })}
            onUpdate={(item) => patch({ portfolio: formData.portfolio.map((portfolioItem) => portfolioItem.id === item.id ? item : portfolioItem) })}
            onRemove={(id) => patch({ portfolio: formData.portfolio.filter((p) => p.id !== id) })}
          />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto order-2 sm:order-1 cursor-pointer" onClick={() => router.back()}>
              {t("common.cancel")}
            </Button>
            <Button
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white order-1 sm:order-2 cursor-pointer"
              onClick={handleSave}
              disabled={!isFormValid() || isUnchanged || saving}
            >
              {saving ? t("profileEdit.saving") : t("profileEdit.saveChanges")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
