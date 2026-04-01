"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

type AboutMissionCard = {
  title: string;
  text: string;
};

export default function AboutPage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const [expandedBios, setExpandedBios] = useState({
    georges: false,
    alexandre: false,
  });
  const missionCards = t("aboutPage.missionCards", { returnObjects: true }) as AboutMissionCard[];

  const georgesBio = t("aboutPage.team.georges.bio");
  const alexandreBio = t("aboutPage.team.alexandre.bio");

  const toggleBio = (person: "georges" | "alexandre") => {
    setExpandedBios((current) => ({
      ...current,
      [person]: !current[person],
    }));
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="relative min-h-105 overflow-hidden px-4 py-20 text-center sm:py-24">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?q=80&w=1800&auto=format&fit=crop"
            alt={t("aboutPage.heroImageAlt")}
            fill
            priority
            quality={90}
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-green-800/65" />
        <div className="absolute inset-0 bg-linear-to-b from-green-900/20 via-green-900/35 to-green-900/55" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-4">
            {t("aboutPage.eyebrow")}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white max-w-3xl mx-auto leading-tight mb-6">
            {t("aboutPage.heroTitle")}
          </h1>
          <p className="text-green-100 text-base max-w-2xl mx-auto">
            {t("aboutPage.heroSubtitle")}
          </p>
        </div>
      </div>

        {/* Mission section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {missionCards.map((item) => (
            <div
              key={item.title}
              className="relative overflow-hidden rounded-2xl border border-green-100/80 bg-linear-to-b from-white to-green-50/50 p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-green-100/70"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-green-600/60" />
              <h3 className="font-bold text-gray-900 text-xl mb-3 text-center">{item.title}</h3>
              <div className="h-px w-14 bg-green-200 mb-4 mx-auto" />
              <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
          </div>
        </div>

        {/* Paragraph 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-12 mb-20">
          <div className="lg:w-1/2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t("aboutPage.whoWeAre.title")}
            </h2>
            <div className="h-px w-14 bg-green-200 mb-5" />
            <p className="text-gray-600 leading-relaxed">
              {t("aboutPage.whoWeAre.paragraph")}
            </p>
          </div>
          <div className="lg:w-1/2 w-full">
            <div className="rounded-2xl overflow-hidden bg-green-50 aspect-video flex items-center justify-center border border-green-100">
              <Image
                src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=800&q=80"
                alt={t("aboutPage.whoWeAre.imageAlt")}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Paragraph 2 */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12 mb-24">
          <div className="lg:w-1/2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 lg:text-right">
              {t("aboutPage.whatDrivesUs.title")}
            </h2>
            <div className="h-px w-14 bg-green-200 mb-5 lg:ml-auto" />
            <p className="text-gray-600 leading-relaxed">
              {t("aboutPage.whatDrivesUs.paragraph")}
            </p>
          </div>
          <div className="lg:w-1/2 w-full">
            <div className="rounded-2xl overflow-hidden aspect-video">
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80"
                alt={t("aboutPage.whatDrivesUs.imageAlt")}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Team section */}
        <div className="border-t border-gray-100 pt-16">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-2">
            {t("aboutPage.team.eyebrow")}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {t("aboutPage.team.title")}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* Georges */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
              <div className="relative aspect-4/3 overflow-hidden bg-gray-200">
                <Image
                  src="/team/george.png"
                  alt="Georges Rychel Moung"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-top"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    t.nextElementSibling?.removeAttribute("style");
                  }}
                />
                <div className="absolute inset-0 hidden h-full w-full items-center justify-center bg-green-900/10">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-green-200 mx-auto mb-3 flex items-center justify-center text-4xl">
                      GR
                    </div>
                    <p className="text-xs text-gray-400">{t("aboutPage.team.photoComingSoon")}</p>
                  </div>
                </div>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-bold text-gray-900">Georges Rychel Moung</h3>
                <p className="text-green-700 text-sm font-semibold mt-0.5 mb-4">
                  {t("aboutPage.team.georges.role")}
                </p>
                <p className={`text-gray-600 text-sm leading-relaxed ${expandedBios.georges ? "" : "line-clamp-6"}`}>
                  {georgesBio}
                </p>
                <button
                  type="button"
                  onClick={() => toggleBio("georges")}
                  className="mt-4 text-sm font-semibold text-green-700 transition-colors hover:text-green-800"
                >
                  {expandedBios.georges
                    ? t("aboutPage.team.showLess")
                    : t("aboutPage.team.readMore")}
                </button>
              </div>
            </div>

            {/* Alexandre */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
              <div className="relative aspect-4/3 overflow-hidden bg-gray-200">
                <Image
                  src="/team/alexandre.jpg"
                  alt="Alexandre Soglo Booh Louha"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-top"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    t.nextElementSibling?.removeAttribute("style");
                  }}
                />
                <div className="w-full h-full absolute inset-0 hidden items-center justify-center bg-green-900/10">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-green-200 mx-auto mb-3 flex items-center justify-center text-4xl">
                      AB
                    </div>
                    <p className="text-xs text-gray-400">{t("aboutPage.team.photoComingSoon")}</p>
                  </div>
                </div>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-bold text-gray-900">Alexandre Soglo Booh Louha</h3>
                <p className="text-green-700 text-sm font-semibold mt-0.5 mb-4">
                  {t("aboutPage.team.alexandre.role")}
                </p>
                <p className={`text-gray-600 text-sm leading-relaxed ${expandedBios.alexandre ? "" : "line-clamp-6"}`}>
                  {alexandreBio}
                </p>
                <button
                  type="button"
                  onClick={() => toggleBio("alexandre")}
                  className="mt-4 text-sm font-semibold text-green-700 transition-colors hover:text-green-800"
                >
                  {expandedBios.alexandre
                    ? t("aboutPage.team.showLess")
                    : t("aboutPage.team.readMore")}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom CTA */}
        {!loading && !session && (
          <div className="mt-20 bg-green-900 rounded-2xl p-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              {t("aboutPage.cta.title")}
            </h3>
            <p className="text-green-200 text-sm mb-6 max-w-md mx-auto">
              {t("aboutPage.cta.description")}
            </p>
            <a
              href="/register"
              className="inline-block bg-white text-green-900 font-semibold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors"
            >
              {t("aboutPage.cta.button")}
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
