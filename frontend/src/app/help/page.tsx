"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { HelpFaq, type HelpFaqItem } from "@/components/help/HelpFaq";
import {
  HelpAudienceSection,
  type HelpTopicSection,
} from "@/components/help/HelpAudienceSection";

/** Support / centre d'aide — conseillère avec casque, prête à aider */
const HELP_HERO_IMAGE =
  "https://images.unsplash.com/photo-1563986768609-322da135588a?w=1800&q=80&auto=format&fit=crop";

export default function HelpPage() {
  const { t } = useTranslation();

  const providerSections = t("helpPage.providerSections", { returnObjects: true }) as HelpTopicSection[];
  const clientSections = t("helpPage.clientSections", { returnObjects: true }) as HelpTopicSection[];
  const faqItems = t("helpPage.faq", { returnObjects: true }) as HelpFaqItem[];

  return (
    <div className="flex flex-1 flex-col bg-white">
      <section className="relative overflow-hidden border-b border-green-900/20">
        <div className="relative min-h-[280px] px-4 py-16 text-center sm:min-h-[340px] sm:py-24 md:min-h-[380px]">
          <div className="absolute inset-0">
            <Image
              src={HELP_HERO_IMAGE}
              alt={t("helpPage.heroImageAlt")}
              fill
              priority
              sizes="100vw"
              quality={85}
              className="object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-green-800/60" aria-hidden />
          <div className="absolute inset-0 bg-linear-to-b from-green-900/25 via-green-900/40 to-green-900/55" aria-hidden />

          <div className="relative z-10 mx-auto max-w-4xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-100">
              {t("helpPage.eyebrow")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl">
              {t("helpPage.heroTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-green-100 sm:text-base">
              {t("helpPage.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-5 text-sm font-medium text-green-800 transition-colors hover:bg-green-50"
              >
                {t("helpPage.contactCta")}
              </Link>
              <Link
                href="/trust-safety"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/90 bg-transparent px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                {t("footer.trustSafety")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
        <HelpAudienceSection
          browseTitle={t("helpPage.browseTitle")}
          providerSections={Array.isArray(providerSections) ? providerSections : []}
          clientSections={Array.isArray(clientSections) ? clientSections : []}
        />
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-12 sm:py-16">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{t("helpPage.faqTitle")}</h2>
        <p className="mb-8 text-sm text-gray-600">{t("helpPage.faqSubtitle")}</p>

        {Array.isArray(faqItems) && faqItems.length > 0 ? <HelpFaq items={faqItems} /> : null}
      </section>

      <section className="flex flex-1 flex-col border-t border-gray-100 bg-gray-50/90">
        <div className="mx-auto w-full max-w-3xl px-4 pt-12 pb-10 sm:px-6 sm:pt-14 sm:pb-12">
          <h3 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {t("helpPage.moreQuestions")}
          </h3>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">{t("helpPage.moreQuestionsSubtitle")}</p>
          <Link
            href="/contact"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-green-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-green-800"
          >
            {t("helpPage.contactCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
