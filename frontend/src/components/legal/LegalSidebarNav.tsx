"use client";

import { useTranslation } from "react-i18next";

interface LegalSection {
  id: string;
  label: string;
}

interface LegalSidebarNavProps {
  sections: LegalSection[];
  onNavigate: (id: string) => void;
}

export default function LegalSidebarNav({ sections, onNavigate }: LegalSidebarNavProps) {
  const { t } = useTranslation();

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:self-start">
        <div className="lg:sticky lg:top-24">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-green-100 hover:text-green-800"
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="mb-12 lg:hidden">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t("legalNav.tableOfContents")}
        </p>
        <ol className="space-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onNavigate(section.id)}
                className="text-left text-sm text-green-700 hover:text-green-900 hover:underline"
              >
                {section.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 border-t border-gray-200" />
      </div>
    </>
  );
}