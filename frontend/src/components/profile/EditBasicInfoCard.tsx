"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Building2, User, Briefcase, Users } from "lucide-react";
import ProfilePictureUploader from "@/components/profile/ProfilePicture";

interface FormData {
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  city: string;
  province: string;
  skills: string[];
  languages: (string | { language: string; proficiency: string })[];
  fullName: string;
  profession: string;
  companyName: string;
  industry: string;
  teamSize: string;
}

interface Props {
  formData: FormData;
  accountType: "person" | "company";
  onChange: (patch: Partial<FormData>) => void;
}

export default function EditBasicInfoCard({ formData, accountType, onChange }: Props) {
  const { t } = useTranslation();
  const [newSkill, setNewSkill] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const isPerson = accountType === "person";
  const displayName = isPerson ? formData.fullName : formData.companyName;

  const handleAddSkill = () => {
    const skill = newSkill.trim();
    if (!skill || formData.skills.includes(skill)) return;
    onChange({ skills: [...formData.skills, skill] });
    setNewSkill("");
  };

  const handleAddLanguage = () => {
    const lang = newLanguage.trim();
    if (!lang || formData.languages.includes(lang)) return;
    onChange({ languages: [...formData.languages, lang] });
    setNewLanguage("");
  };

  return (
    <Card className="p-6 sm:p-8 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        {isPerson ? (
          <><User className="h-5 w-5 text-green-700" /> {t("profileEdit.personalInfo")}</>
        ) : (
          <><Building2 className="h-5 w-5 text-green-700" /> {t("profileEdit.companyInfo")}</>
        )}
      </h2>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <Label className="text-base font-medium text-gray-900 mb-3 block">
            {isPerson ? t("profileEdit.profilePicture") : t("profileEdit.companyLogo")}
          </Label>
          <ProfilePictureUploader
            currentProfilePicture={formData.avatar}
            userName={displayName}
            onProfileChange={(pic) => onChange({ avatar: pic })}
            size="xl"
            showLabel={true}
          />
        </div>

        {/* Name */}
        {isPerson ? (
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-base font-medium text-gray-900">
              {t("profileEdit.fullName")} <span className="text-red-500">*</span>
            </Label>
            <Input id="fullName" type="text" value={formData.fullName} placeholder={t("profileEdit.fullName")}
              onChange={(e) => onChange({ fullName: e.target.value })} className="h-12" />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-base font-medium text-gray-900">
              {t("profileEdit.companyName")} <span className="text-red-500">*</span>
            </Label>
            <Input id="companyName" type="text" value={formData.companyName} placeholder="Acme Corporation"
              onChange={(e) => onChange({ companyName: e.target.value })} className="h-12" />
          </div>
        )}

        {/* Email (disabled) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-medium text-gray-900">
            {t("profileEdit.email")} <span className="text-red-500">*</span>
          </Label>
          <Input id="email" type="email" value={formData.email} disabled className="h-12 bg-gray-50 cursor-not-allowed" />
          <p className="text-xs text-gray-500">{t("profileEdit.emailCantChange")}</p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-medium text-gray-900">
            {t("profileEdit.phoneNumber")} <span className="text-red-500">*</span>
          </Label>
          <Input id="phone" type="tel" value={formData.phone} placeholder="+1 (555) 123-4567"
            onChange={(e) => onChange({ phone: e.target.value })} className="h-12" />
        </div>

        {/* City + Province */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-base font-medium text-gray-900">
              {t("profileEdit.city")} <span className="text-red-500">*</span>
            </Label>
            <Input id="city" type="text" placeholder="Toronto" value={formData.city}
              onChange={(e) => onChange({ city: e.target.value })} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province" className="text-base font-medium text-gray-900">
              {t("profileEdit.province")} <span className="text-red-500">*</span>
            </Label>
            <Input id="province" type="text" placeholder="Ontario" value={formData.province}
              onChange={(e) => onChange({ province: e.target.value })} className="h-12" />
          </div>
        </div>

        {/* Profession / Industry */}
        {isPerson ? (
          <div className="space-y-2">
            <Label htmlFor="profession" className="text-base font-medium text-gray-900 flex items-center gap-2">
                {t("profileEdit.profession")}
            </Label>
            <Input id="profession" type="text" value={formData.profession}
              placeholder="Software Developer, Plumber, Electrician..."
              onChange={(e) => onChange({ profession: e.target.value })} className="h-12" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-base font-medium text-gray-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" /> {t("profileEdit.industry")}
              </Label>
              <Input id="industry" type="text" value={formData.industry}
                placeholder="Construction, IT Services, Manufacturing..."
                onChange={(e) => onChange({ industry: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSize" className="text-base font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" /> {t("profile.teamSize")}
              </Label>
              <Input id="teamSize" type="text" value={formData.teamSize}
                placeholder="1-10, 11-50, 51-200..."
                onChange={(e) => onChange({ teamSize: e.target.value })} className="h-12" />
            </div>
          </>
        )}

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-base font-medium text-gray-900">
            {isPerson ? t("profileEdit.shortBio") : t("profileEdit.companyDescription")}
          </Label>
          <Textarea id="bio" value={formData.bio}
            placeholder={isPerson ? t("profileEdit.bioPersonPlaceholder") : t("profileEdit.bioCompanyPlaceholder")}
            onChange={(e) => onChange({ bio: e.target.value })}
            className="min-h-32 resize-none" maxLength={500} />
          <p className="text-xs text-gray-500">{formData.bio.length} / 500 {t("profileEdit.characters")}</p>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">
            {isPerson ? t("profileEdit.skills") : t("profile.servicesOffered")}
          </Label>
          <div className="flex gap-2">
            <Input type="text" placeholder={isPerson ? t("profileEdit.addSkill") : t("profileEdit.addService")} value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
              className="h-10" />
            <Button onClick={handleAddSkill} variant="outline" size="sm" className="gap-1 h-auto cursor-pointer">
              <Plus className="h-4 w-4" /> {t("profileEdit.add")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.skills.map((skill, i) => (
              <Badge key={i} variant="secondary" className="bg-green-100 text-green-700 pl-3 pr-2 py-1.5 text-sm">
                {skill}
                <button onClick={() => onChange({ skills: formData.skills.filter((s) => s !== skill) })}
                  className="ml-2 hover:text-red-600 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">
            {isPerson ? t("profileEdit.languagesSpoken") : t("profileEdit.languagesSupportedLabel")}
          </Label>
          <div className="flex gap-2">
            <Input type="text" placeholder={t("profileEdit.addLanguagePlaceholder")} value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddLanguage()}
              className="h-10" />
            <Button onClick={handleAddLanguage} variant="outline" size="sm" className="gap-1 h-auto cursor-pointer">
              <Plus className="h-4 w-4" /> {t("profileEdit.add")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.languages.map((lang, i) => {
              const text = typeof lang === "string" ? lang : `${lang.language} (${lang.proficiency})`;
              return (
                <Badge key={i} variant="secondary" className="bg-green-100 text-green-700 pl-3 pr-2 py-1.5 text-sm">
                  {text}
                  <button onClick={() => onChange({ languages: formData.languages.filter((l) => l !== lang) })}
                    className="ml-2 hover:text-red-600 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
