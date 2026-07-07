"use client";

import { Trans, useTranslation } from "react-i18next";
import LegalSidebarNav from "@/components/legal/LegalSidebarNav";

export default function PaymentTermsPage() {
  const { t } = useTranslation();

  const sections = [
    { id: "nature", label: t("paymentTermsPage.sections.nature.title") },
    { id: "process", label: t("paymentTermsPage.sections.process.title") },
    { id: "buyer-fees", label: t("paymentTermsPage.sections.buyerFees.title") },
    { id: "provider-fees", label: t("paymentTermsPage.sections.providerFees.title") },
    { id: "wallet", label: t("paymentTermsPage.sections.wallet.title") },
    { id: "dispute-period", label: t("paymentTermsPage.sections.disputePeriod.title") },
    { id: "disputes", label: t("paymentTermsPage.sections.disputes.title") },
    { id: "partial", label: t("paymentTermsPage.sections.partial.title") },
    { id: "withdrawals", label: t("paymentTermsPage.sections.withdrawals.title") },
    { id: "withdrawal-fees", label: t("paymentTermsPage.sections.withdrawalFees.title") },
    { id: "payment-methods", label: t("paymentTermsPage.sections.paymentMethods.title") },
    { id: "taxes", label: t("paymentTermsPage.sections.taxes.title") },
    { id: "delays", label: t("paymentTermsPage.sections.delays.title") },
    { id: "fraud", label: t("paymentTermsPage.sections.fraud.title") },
    { id: "advertising", label: t("paymentTermsPage.sections.advertising.title") },
    { id: "changes", label: t("paymentTermsPage.sections.changes.title") },
    { id: "disclaimer", label: t("paymentTermsPage.sections.disclaimer.title") },
    { id: "contact", label: t("paymentTermsPage.sections.contact.title") },
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
            <h1 className="mb-3 text-4xl font-bold text-gray-900">{t("paymentTermsPage.title")}</h1>
            <p className="text-sm text-gray-500">
              {t("paymentTermsPage.lastUpdatedLabel")}
              <span className="font-semibold text-gray-900">{t("paymentTermsPage.lastUpdatedValue")}</span>
            </p>
            <p className="mt-4 leading-relaxed text-gray-600">{t("paymentTermsPage.intro")}</p>
          </div>

          <div className="space-y-12 text-sm leading-relaxed text-gray-700">
            <section id="nature">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.nature.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("paymentTermsPage.sections.nature.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="process">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.process.title")}</h2>
              <ul className="mb-3 ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>{t("paymentTermsPage.sections.process.itemOne")}</li>
                <li>
                  {t("paymentTermsPage.sections.process.itemTwo")}
                  <ul className="ml-6 mt-1 list-inside space-y-1 text-gray-500">
                    {(t("paymentTermsPage.sections.process.subitems", { returnObjects: true }) as string[]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              </ul>
              <p className="text-sm font-bold text-gray-900">{t("paymentTermsPage.sections.process.note")}</p>
            </section>

            <section id="buyer-fees">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.buyerFees.title")}</h2>
              <p className="mb-3">{t("paymentTermsPage.sections.buyerFees.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.buyerFees.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>{t("paymentTermsPage.sections.buyerFees.itemTwo")}</li>
              </ul>
              <div className="mt-3 max-w-md">
                <p className="mb-1 text-sm font-bold text-gray-900">{t("paymentTermsPage.sections.buyerFees.calculationTitle")}</p>
                <div className="space-y-1 text-sm text-gray-900">
                  <div className="flex items-center justify-between gap-4">
                    <span>{t("paymentTermsPage.sections.buyerFees.calcServiceLabel")}</span>
                    <span className="font-medium">$100.00</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{t("paymentTermsPage.sections.buyerFees.calcFeeLabel")}</div>
                      <div className="text-xs text-red-500">{t("payment.nonRefundable")}</div>
                    </div>
                    <span className="font-semibold">$5.00</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t("paymentTermsPage.sections.buyerFees.calcTaxesLabel")}</span>
                    <span className="font-medium">{t("paymentTermsPage.sections.buyerFees.calcVariableLabel")}</span>
                  </div>
                  <div className="mt-1 border-t border-gray-300 pt-1">
                    <div className="flex items-center justify-between gap-4 font-bold text-black">
                      <span>{t("paymentTermsPage.sections.buyerFees.calcTotalLabel")}</span>
                      <span>{t("paymentTermsPage.sections.buyerFees.calcTotalValue")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="provider-fees">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.providerFees.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.providerFees.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>{t("paymentTermsPage.sections.providerFees.itemTwo")}</li>
              </ul>
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950/90">
                {t("wallet.commissionPromoNotice")}
              </p>
            </section>

            <section id="wallet">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.wallet.title")}</h2>
              <p className="mb-3">{t("paymentTermsPage.sections.wallet.intro")}</p>
              <div className="space-y-3">
                {(["pending", "approved", "other"] as const).map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{t(`paymentTermsPage.sections.wallet.${key}Label`)}</p>
                      <p className="mt-0.5 text-xs text-gray-600">{t(`paymentTermsPage.sections.wallet.${key}Desc`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="dispute-period">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.disputePeriod.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.disputePeriod.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>{t("paymentTermsPage.sections.disputePeriod.itemTwo")}</li>
              </ul>
            </section>

            <section id="disputes">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.disputes.title")}</h2>
              <p className="mb-3 text-gray-900">{t("paymentTermsPage.sections.disputes.intro")}</p>
              <ul className="mb-4 ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(["itemOne", "itemTwo", "itemThree"] as const).map((itemKey) => (
                  <li key={itemKey}>
                    <span className="font-semibold text-gray-900">{t(`paymentTermsPage.sections.disputes.${itemKey}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 max-w-md">
                <p className="mb-1 text-sm font-bold text-gray-900">{t("paymentTermsPage.sections.disputes.refundPolicyTitle")}</p>
                <ul className="mb-3 ml-2 list-inside list-disc space-y-1 text-sm text-gray-900">
                  {(t("paymentTermsPage.sections.disputes.refundPolicyItems", { returnObjects: true }) as string[]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs font-bold text-gray-900">{t("paymentTermsPage.sections.disputes.refundPolicyNote")}</p>
              </div>
            </section>

            <section id="partial">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.partial.title")}</h2>
              <p>{t("paymentTermsPage.sections.partial.paragraph")}</p>
            </section>

            <section id="withdrawals">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.withdrawals.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.withdrawals.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.withdrawals.itemTwo" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.withdrawals.itemThree" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
              </ul>
            </section>

            <section id="withdrawal-fees">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.withdrawalFees.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.withdrawalFees.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>{t("paymentTermsPage.sections.withdrawalFees.itemTwo")}</li>
              </ul>
              <div className="mt-3 max-w-md">
                <p className="mb-1 text-sm font-bold text-gray-900">{t("paymentTermsPage.sections.withdrawalFees.exampleTitle")}</p>
                <div className="space-y-1 text-sm text-gray-900">
                  <div className="flex items-center justify-between gap-4">
                    <span>{t("paymentTermsPage.sections.withdrawalFees.exampleApprovedLabel")}</span>
                    <span className="font-medium">$100.00</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">{t("paymentTermsPage.sections.withdrawalFees.exampleCommissionLabel")}</span>
                    <span className="font-semibold">-$5.00</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>{t("paymentTermsPage.sections.withdrawalFees.exampleOtherFeesLabel")}</span>
                    <span className="font-medium">{t("paymentTermsPage.sections.withdrawalFees.exampleVariableLabel")}</span>
                  </div>
                  <div className="mt-1 border-t border-gray-300 pt-1">
                    <div className="flex items-center justify-between gap-4 font-bold text-black">
                      <span>{t("paymentTermsPage.sections.withdrawalFees.exampleReceiveLabel")}</span>
                      <span>{t("paymentTermsPage.sections.withdrawalFees.exampleReceiveValue")}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950/90">
                  {t("paymentTermsPage.sections.withdrawalFees.examplePromoNotice")}
                </p>
              </div>
            </section>

            <section id="payment-methods">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.paymentMethods.title")}</h2>
              <p className="mb-3">{t("paymentTermsPage.sections.paymentMethods.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("paymentTermsPage.sections.paymentMethods.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="taxes">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.taxes.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("paymentTermsPage.sections.taxes.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="delays">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.delays.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.delays.itemOne" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
                <li>
                  <Trans i18nKey="paymentTermsPage.sections.delays.itemTwo" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
                </li>
              </ul>
            </section>

            <section id="fraud">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.fraud.title")}</h2>
              <p className="mb-3">{t("paymentTermsPage.sections.fraud.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("paymentTermsPage.sections.fraud.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="advertising">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.advertising.title")}</h2>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(t("paymentTermsPage.sections.advertising.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="changes">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.changes.title")}</h2>
              <p>
                <Trans i18nKey="paymentTermsPage.sections.changes.paragraph" components={{ strong: <span className="font-semibold text-gray-900" /> }} />
              </p>
            </section>

            <section id="disclaimer">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.disclaimer.title")}</h2>
              <p className="mb-3">{t("paymentTermsPage.sections.disclaimer.intro")}</p>
              <ul className="ml-2 list-inside list-disc space-y-2 text-gray-600">
                {(["itemOne", "itemTwo", "itemThree"] as const).map((itemKey) => (
                  <li key={itemKey}>
                    <span className="font-semibold text-gray-900">{t(`paymentTermsPage.sections.disclaimer.${itemKey}`)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="contact">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t("paymentTermsPage.sections.contact.title")}</h2>
              <p className="mb-3">{t("paymentTermsPage.sections.contact.intro")}</p>
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