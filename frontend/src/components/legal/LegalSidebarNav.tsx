"use client";

interface LegalSection {
  id: string;
  label?: string;
  labelFr?: string;
  en?: string;
  fr?: string;
}

interface LegalSidebarNavProps {
  sections: LegalSection[];
  isFr: boolean;
  onNavigate: (id: string) => void;
}

export default function LegalSidebarNav({ sections, isFr, onNavigate }: LegalSidebarNavProps) {
  const getLabel = (section: LegalSection) => {
    if (isFr) {
      return section.labelFr ?? section.fr ?? section.label ?? section.en ?? section.id;
    }

    return section.label ?? section.en ?? section.labelFr ?? section.fr ?? section.id;
  };

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
                {getLabel(section)}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="mb-12 lg:hidden">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {isFr ? "Table des matières" : "Table of Contents"}
        </p>
        <ol className="space-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onNavigate(section.id)}
                className="text-left text-sm text-green-700 hover:text-green-900 hover:underline"
              >
                {getLabel(section)}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 border-t border-gray-200" />
      </div>
    </>
  );
}