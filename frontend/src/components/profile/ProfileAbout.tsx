"use client";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import { languageLabels, proficiencyLabels } from "@/components/onboarding/onboardingTypes";
import { getLanguageCode } from "@/lib/locale";

interface ProfileUser {
  bio?: string;
  team_size?: string;
  profession?: string;
  industry?: string;
}

interface Props {
  profileUser: ProfileUser;
  isPerson: boolean;
  isCompany: boolean;
  skills: string[];
  languages: (string | { language: string; proficiency: string })[];
  memberSince: string;
}

export default function ProfileAbout({ profileUser, isPerson, isCompany, skills, languages, memberSince }: Props) {
  const { t, i18n } = useTranslation();
  const langCode = getLanguageCode(i18n.language);
  if (!profileUser.bio) return null;

  return (
    <Card className="p-6 mb-8 overflow-hidden">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {isPerson ? t("profile.aboutMe") : t("profile.aboutCompany")}
      </h2>
      <p className="text-gray-700 leading-relaxed mb-6 break-all">{profileUser.bio}</p>
      <Separator className="my-4" />

      <div className="grid md:grid-cols-2 gap-6">
        {skills.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {isPerson ? t("profile.skills") : t("profile.servicesOffered")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary" className="bg-green-100 text-green-700">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {languages.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {isPerson ? t("profile.languagesISpeak") : t("profile.languagesSupported")}
            </h3>
            <p className="text-gray-700">
              {languages
                .map((item) =>
                  typeof item === "string"
                    ? item
                    : `${languageLabels[item.language]?.[langCode] ?? item.language} (${proficiencyLabels[item.proficiency]?.[langCode] ?? item.proficiency})`
                )
                .join(", ")}
            </p>
          </div>
        )}

        {isCompany && profileUser.team_size && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t("profile.teamSize")}</h3>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <p className="text-gray-700">{profileUser.team_size}</p>
            </div>
          </div>
        )}

        {isPerson && profileUser.profession && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t("profileEdit.profession")}</h3>
            <p className="text-gray-700">{profileUser.profession}</p>
          </div>
        )}

        {isCompany && profileUser.industry && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t("profileEdit.industry")}</h3>
            <p className="text-gray-700">{profileUser.industry}</p>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">
            {isPerson ? t("profile.member") : t("profile.establishedOn")}
          </h3>
          <p className="text-gray-700">{memberSince}</p>
        </div>
      </div>
    </Card>
  );
}
