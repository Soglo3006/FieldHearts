"use client";
import { Trans, useTranslation } from "react-i18next";
import LegalSidebarNav from "@/components/legal/LegalSidebarNav";

export default function TrustSafetyPage() {
  const { t } = useTranslation();

  const sections = [
    { id: "commitment", label: t("trustSafetyPage.sections.commitment.title") },
    { id: "payments", label: t("trustSafetyPage.sections.payments.title") },
    { id: "disputes", label: t("trustSafetyPage.sections.disputes.title") },
    { id: "reviews", label: t("trustSafetyPage.sections.reviews.title") },
    { id: "responsibility", label: t("trustSafetyPage.sections.responsibility.title") },
    { id: "location", label: t("trustSafetyPage.sections.location.title") },
    { id: "prohibited", label: t("trustSafetyPage.sections.prohibited.title") },
    { id: "reporting", label: t("trustSafetyPage.sections.reporting.title") },
    { id: "disclaimer", label: t("trustSafetyPage.sections.disclaimer.title") },
    { id: "improvement", label: t("trustSafetyPage.sections.improvement.title") },
    { id: "contact", label: t("trustSafetyPage.sections.contact.title") },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">

      <div className="grid gap-10 lg:grid-cols-[16rem_1px_minmax(0,1fr)] lg:items-start">
        <LegalSidebarNav sections={sections} onNavigate={scrollTo} />

        <div className="hidden self-stretch bg-gray-200 lg:block" aria-hidden="true" />

        <div>
          {/* Header */}
          <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {t("trustSafetyPage.title")}
        </h1>
        <p className="text-gray-500 text-sm">{t("trustSafetyPage.lastUpdatedLabel")}<span className="font-semibold text-gray-900">{t("trustSafetyPage.lastUpdatedValue")}</span></p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          {t("trustSafetyPage.intro")}
        </p>
          </div>

          {/* Sections */}
          <div className="space-y-12 text-gray-700 text-sm leading-relaxed">

        <section id="commitment">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.commitment.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.commitment.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.commitment.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3">{t("trustSafetyPage.sections.commitment.note")}</p>
        </section>

        <section id="payments">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.payments.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.payments.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.payments.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-bold text-gray-900">
            {t("trustSafetyPage.sections.payments.warning")}
          </p>
        </section>

        <section id="disputes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.disputes.title")}
          </h2>
          <p className="mb-3 text-gray-900">{t("trustSafetyPage.sections.disputes.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><Trans i18nKey="trustSafetyPage.sections.disputes.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} /></li>
            <li><span className="font-semibold text-gray-900">{t("trustSafetyPage.sections.disputes.itemTwo")}</span></li>
            <li><span className="font-semibold text-gray-900">{t("trustSafetyPage.sections.disputes.itemThree")}</span></li>
          </ul>
          <p className="mt-3 text-gray-600">
            <Trans i18nKey="trustSafetyPage.sections.disputes.note" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
          </p>
        </section>

        <section id="reviews">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.reviews.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.reviews.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.reviews.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section id="responsibility">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.responsibility.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.responsibility.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{t("trustSafetyPage.sections.responsibility.itemOne")}</li>
            <li>{t("trustSafetyPage.sections.responsibility.itemTwo")}</li>
            <li><Trans i18nKey="trustSafetyPage.sections.responsibility.itemThree" components={{ strong: <span className="font-semibold text-gray-900" /> }} /></li>
            <li><Trans i18nKey="trustSafetyPage.sections.responsibility.itemFour" components={{ strong: <span className="font-semibold text-gray-900" /> }} /></li>
          </ul>
        </section>

        <section id="location">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.location.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.location.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.location.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}><span className="font-semibold text-gray-900">{item}</span></li>
            ))}
          </ul>
          <p className="mt-3"><Trans i18nKey="trustSafetyPage.sections.location.note" components={{ strong: <span className="font-semibold text-gray-900" /> }} /></p>
        </section>

        <section id="prohibited">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.prohibited.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.prohibited.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.prohibited.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}><span className="font-semibold text-gray-900">{item}</span></li>
            ))}
          </ul>
          <p className="mt-3"><Trans i18nKey="trustSafetyPage.sections.prohibited.note" components={{ strong: <span className="font-semibold text-gray-900" /> }} /></p>
        </section>

        <section id="reporting">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.reporting.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.reporting.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.reporting.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}><span className="font-semibold text-gray-900">{item}</span></li>
            ))}
          </ul>
        </section>

        <section id="disclaimer">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.disclaimer.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.disclaimer.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.disclaimer.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}><span className="font-semibold text-gray-900">{item}</span></li>
            ))}
          </ul>
          <p className="mt-3 font-semibold text-gray-900">{t("trustSafetyPage.sections.disclaimer.note")}</p>
        </section>

        <section id="improvement">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.improvement.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.improvement.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            {(t("trustSafetyPage.sections.improvement.items", { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("trustSafetyPage.sections.contact.title")}
          </h2>
          <p className="mb-3">{t("trustSafetyPage.sections.contact.intro")}</p>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">{t("trustSafetyPage.sections.contact.name")}</p>
            <p className="font-semibold text-gray-900">{t("trustSafetyPage.sections.contact.address")}</p>
          </div>
        </section>

      </div>
      </div>
    </div>
    </div>
  );
}
