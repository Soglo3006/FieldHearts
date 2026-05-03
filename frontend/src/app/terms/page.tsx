"use client";

import { Trans, useTranslation } from "react-i18next";
import LegalSidebarNav from "@/components/legal/LegalSidebarNav";

export default function TermsOfServicePage() {
  const { t } = useTranslation();

  const sections = [
    { id: "nature", label: t("termsPage.sections.nature.title") },
    { id: "responsibilities", label: t("termsPage.sections.responsibilities.title") },
    { id: "payments", label: t("termsPage.sections.payments.title") },
    { id: "wallet", label: t("termsPage.sections.wallet.title") },
    { id: "withdrawals", label: t("termsPage.sections.withdrawals.title") },
    { id: "disputes", label: t("termsPage.sections.disputes.title") },
    { id: "partial", label: t("termsPage.sections.partial.title") },
    { id: "reviews", label: t("termsPage.sections.reviews.title") },
    { id: "advertising", label: t("termsPage.sections.advertising.title") },
    { id: "liability", label: t("termsPage.sections.liability.title") },
    { id: "prohibited", label: t("termsPage.sections.prohibited.title") },
    { id: "financial-risks", label: t("termsPage.sections.financialRisks.title") },
    { id: "safety", label: t("termsPage.sections.safety.title") },
    { id: "modifications", label: t("termsPage.sections.modifications.title") },
    { id: "governing-law", label: t("termsPage.sections.governingLaw.title") },
    { id: "contact", label: t("termsPage.sections.contact.title") },
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
          <div className="mb-10">
            <h1 className="mb-3 text-4xl font-bold text-gray-900">{t("termsPage.title")}</h1>
            <p className="text-sm text-gray-500">
              {t("termsPage.lastUpdatedLabel")}
              <span className="font-semibold text-gray-900">{t("termsPage.lastUpdatedValue")}</span>
            </p>
            <p className="mt-4 leading-relaxed text-gray-600">
              <Trans i18nKey="termsPage.intro" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
            </p>
          </div>

          <div className="space-y-12 text-sm leading-relaxed text-gray-700">
            <section id="nature">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.nature.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("termsPage.sections.nature.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="responsibilities">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.responsibilities.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.responsibilities.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(["itemOne", "itemTwo", "itemThree"] as const).map((itemKey) => (
                  <li key={itemKey}>
                    <span className="font-semibold text-gray-900">{t(`termsPage.sections.responsibilities.${itemKey}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">{t("termsPage.sections.responsibilities.note")}</p>
            </section>

            <section id="payments">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.payments.title")}</h2>
              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-800">{t("termsPage.sections.payments.buyerFeesTitle")}</h3>
                  <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                    <li>
                      <Trans i18nKey="termsPage.sections.payments.buyerFeeItem" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                    </li>
                    <li>{t("termsPage.sections.payments.buyerFeeNote")}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-gray-800">{t("termsPage.sections.payments.escrowTitle")}</h3>
                  <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                    {(t("termsPage.sections.payments.escrowItems", { returnObjects: true }) as string[]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section id="wallet">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.wallet.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.wallet.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <span className="font-medium text-gray-700">{t("termsPage.sections.wallet.pendingLabel")}</span> - {t("termsPage.sections.wallet.pendingDesc")}
                </li>
                <li>
                  <span className="font-medium text-gray-700">{t("termsPage.sections.wallet.approvedLabel")}</span> - {t("termsPage.sections.wallet.approvedDesc")}
                </li>
                <li>
                  <span className="font-medium text-gray-700">{t("termsPage.sections.wallet.otherLabel")}</span> - {t("termsPage.sections.wallet.otherDesc")}
                </li>
              </ul>
            </section>

            <section id="withdrawals">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.withdrawals.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>{t("termsPage.sections.withdrawals.itemOne")}</li>
                <li>
                  <Trans i18nKey="termsPage.sections.withdrawals.itemTwo" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>
                  <Trans i18nKey="termsPage.sections.withdrawals.itemThree" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
              </ul>
            </section>

            <section id="disputes">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.disputes.title")}</h2>
              <ul className="mb-4 ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>{t("termsPage.sections.disputes.itemOne")}</li>
                <li>
                  <Trans i18nKey="termsPage.sections.disputes.itemTwo" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>{t("termsPage.sections.disputes.itemThree")}</li>
              </ul>
              <div className="mt-4">
                <p className="mb-2 font-bold text-gray-900">{t("termsPage.sections.disputes.refundPolicyTitle")}</p>
                <ul className="ml-2 list-inside list-disc space-y-1 text-gray-700">
                  {(t("termsPage.sections.disputes.refundPolicyItems", { returnObjects: true }) as string[]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="partial">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.partial.title")}</h2>
              <p>{t("termsPage.sections.partial.paragraph")}</p>
            </section>

            <section id="reviews">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.reviews.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("termsPage.sections.reviews.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="advertising">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.advertising.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("termsPage.sections.advertising.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="liability">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.liability.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.liability.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("termsPage.sections.liability.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 font-semibold text-gray-900">{t("termsPage.sections.liability.note")}</p>
            </section>

            <section id="prohibited">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.prohibited.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.prohibited.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(["itemOne", "itemTwo", "itemThree"] as const).map((itemKey) => (
                  <li key={itemKey}>
                    <span className="font-semibold text-gray-900">{t(`termsPage.sections.prohibited.${itemKey}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                <Trans i18nKey="termsPage.sections.prohibited.note" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
              </p>
            </section>

            <section id="financial-risks">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.financialRisks.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.financialRisks.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <Trans i18nKey="termsPage.sections.financialRisks.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>
                  <Trans i18nKey="termsPage.sections.financialRisks.itemTwo" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>
                  <Trans i18nKey="termsPage.sections.financialRisks.itemThree" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
              </ul>
            </section>

            <section id="safety">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.safety.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.safety.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(["itemOne", "itemTwo", "itemThree"] as const).map((itemKey) => (
                  <li key={itemKey}>
                    <span className="font-semibold text-gray-900">{t(`termsPage.sections.safety.${itemKey}`)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="modifications">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.modifications.title")}</h2>
              <p>
                <Trans i18nKey="termsPage.sections.modifications.paragraph" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
              </p>
            </section>

            <section id="governing-law">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.governingLaw.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.governingLaw.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(["itemOne", "itemTwo"] as const).map((itemKey) => (
                  <li key={itemKey}>
                    <span className="font-semibold text-gray-900">{t(`termsPage.sections.governingLaw.${itemKey}`)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="contact">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("termsPage.sections.contact.title")}</h2>
              <p className="mb-3">{t("termsPage.sections.contact.intro")}</p>
              <p>
                <a href="mailto:support@uneden.ca" className="text-green-700 hover:underline font-medium">
                  {t("footer.supportEmail")}
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}