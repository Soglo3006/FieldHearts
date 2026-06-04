"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type HelpArticleLink = { title: string; href: string };

export type HelpTopicSection = {
  iconKey: string;
  title: string;
  seeAllHref: string;
  articles: HelpArticleLink[];
};

const TOPIC_DIVIDER = "border-green-600/35";

function topicCellBorderClass(index: number, total: number) {
  return cn(
    // Mobile — trait horizontal entre chaque bloc
    index < total - 1 && `border-b ${TOPIC_DIVIDER} pb-10`,
    // Tablette (2 col.) — traits verticaux et horizontaux entre rangées
    index % 2 !== 1 && `md:border-r ${TOPIC_DIVIDER} lg:border-r-0`,
    index < total - 2 && `md:border-b ${TOPIC_DIVIDER} md:pb-10`,
    // Desktop (3 col.) — traits verticaux uniquement
    "lg:border-b-0 lg:pb-0",
    index % 3 !== 2 && `lg:border-r ${TOPIC_DIVIDER}`,
  );
}

function HelpTopicColumn({
  section,
  seeAllLabel,
}: {
  section: HelpTopicSection;
  seeAllLabel: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center text-center">
      <div className="mb-2 flex min-h-[2.75rem] w-full items-end justify-center px-2 sm:min-h-[3rem] md:min-h-[3.25rem]">
        <h3 className="text-base font-bold leading-snug text-gray-900">{section.title}</h3>
      </div>
      <ul className="mb-5 flex w-full max-w-xs flex-1 flex-col items-center gap-2.5 px-2 sm:mb-6">
        {section.articles.map((article) => (
          <li key={article.href + article.title}>
            <Link
              href={article.href}
              className="text-sm text-gray-600 transition-colors hover:text-green-800 hover:underline"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex w-full justify-center px-2 pb-1">
        <Link
          href={section.seeAllHref}
          className="inline-flex items-center justify-center rounded-md border border-gray-900 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
        >
          {seeAllLabel}
        </Link>
      </div>
    </div>
  );
}

function TopicsGrid({
  sections,
  seeAllLabel,
}: {
  sections: HelpTopicSection[];
  seeAllLabel: string;
}) {
  const total = sections.length;

  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:gap-y-14">
      {sections.map((section, index) => (
        <div
          key={section.iconKey + section.title}
          className={cn(
            "flex h-full min-w-0 flex-col px-4 pt-8 first:pt-0 sm:px-5 md:px-6 lg:px-6 lg:pt-0",
            topicCellBorderClass(index, total),
          )}
        >
          <HelpTopicColumn section={section} seeAllLabel={seeAllLabel} />
        </div>
      ))}
    </div>
  );
}

type HelpAudienceSectionProps = {
  browseTitle: string;
  providerSections: HelpTopicSection[];
  clientSections: HelpTopicSection[];
};

type Audience = "providers" | "clients";

function AudiencePanel({
  audience,
  activeAudience,
  sections,
  seeAllLabel,
}: {
  audience: Audience;
  activeAudience: Audience;
  sections: HelpTopicSection[];
  seeAllLabel: string;
}) {
  const isActive = audience === activeAudience;

  return (
    <div
      className={cn(
        "col-start-1 row-start-1 w-full transition-all duration-300 ease-in-out",
        isActive
          ? "relative z-10 translate-x-0 opacity-100"
          : cn(
              "pointer-events-none absolute inset-x-0 top-0 z-0 opacity-0",
              audience === "providers"
                ? "-translate-x-8 sm:-translate-x-12"
                : "translate-x-8 sm:translate-x-12",
            ),
      )}
      aria-hidden={!isActive}
      inert={!isActive ? true : undefined}
    >
      <TopicsGrid sections={sections} seeAllLabel={seeAllLabel} />
    </div>
  );
}

export function HelpAudienceSection({
  browseTitle,
  providerSections,
  clientSections,
}: HelpAudienceSectionProps) {
  const { t } = useTranslation();
  const [audience, setAudience] = useState<Audience>("providers");
  const seeAllLabel = t("helpPage.seeAllArticles");

  const selectAudience = (next: Audience) => {
    if (next !== audience) setAudience(next);
  };

  return (
    <div className="text-center">
      <h2 className="mb-6 text-xl font-bold text-gray-900 sm:mb-8 sm:text-2xl">{browseTitle}</h2>

      <div className="mb-8 flex justify-center sm:mb-10">
        <div className="inline-flex max-w-full flex-wrap justify-center gap-0.5 sm:gap-2">
          <button
            type="button"
            onClick={() => selectAudience("providers")}
            className={cn(
              "cursor-pointer px-3 pb-3 text-xs font-semibold transition-colors duration-300 sm:px-6 sm:text-sm md:text-base",
              audience === "providers"
                ? "border-b-2 border-green-700 text-gray-900"
                : "border-b-2 border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            {t("helpPage.tabs.providers")}
          </button>
          <button
            type="button"
            onClick={() => selectAudience("clients")}
            className={cn(
              "cursor-pointer px-3 pb-3 text-xs font-semibold transition-colors duration-300 sm:px-6 sm:text-sm md:text-base",
              audience === "clients"
                ? "border-b-2 border-green-700 text-gray-900"
                : "border-b-2 border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            {t("helpPage.tabs.clients")}
          </button>
        </div>
      </div>

      <div className="relative grid w-full overflow-hidden">
        <AudiencePanel
          audience="providers"
          activeAudience={audience}
          sections={providerSections}
          seeAllLabel={seeAllLabel}
        />
        <AudiencePanel
          audience="clients"
          activeAudience={audience}
          sections={clientSections}
          seeAllLabel={seeAllLabel}
        />
      </div>
    </div>
  );
}
