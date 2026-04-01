"use client";
import { useTranslation } from "react-i18next";
import LegalSidebarNav from "@/components/legal/LegalSidebarNav";

const sections = [
  { id: "nature", en: "1. Nature of Payments", fr: "1. Nature des paiements" },
  { id: "process", en: "2. Payment Process", fr: "2. Processus de paiement" },
  { id: "buyer-fees", en: "3. Buyer Fees", fr: "3. Frais acheteur" },
  { id: "wallet", en: "4. Wallet System", fr: "4. Système de portefeuille" },
  { id: "dispute-period", en: "5. Dispute Period", fr: "5. Période de litige" },
  { id: "disputes", en: "6. Disputes & Refunds", fr: "6. Litiges et remboursements" },
  { id: "partial", en: "7. Partial Payments", fr: "7. Paiements partiels" },
  { id: "withdrawals", en: "8. Withdrawals", fr: "8. Retraits" },
  { id: "withdrawal-fees", en: "9. Withdrawal Fees", fr: "9. Frais de retrait" },
  { id: "payment-methods", en: "10. Payment Methods", fr: "10. Méthodes de paiement" },
  { id: "taxes", en: "11. Taxes", fr: "11. Taxes" },
  { id: "delays", en: "12. Delays & Processing Times", fr: "12. Délais de traitement" },
  { id: "fraud", en: "13. Fraud & Misuse", fr: "13. Fraude et abus" },
  { id: "advertising", en: "14. Advertising & Future Features", fr: "14. Publicité et futures fonctionnalités" },
  { id: "changes", en: "15. Changes to Payment Terms", fr: "15. Modifications" },
  { id: "disclaimer", en: "16. Disclaimer", fr: "16. Limitation de responsabilité" },
  { id: "contact", en: "17. Contact", fr: "17. Contact" },
];

export default function PaymentTermsPage() {
  const { i18n } = useTranslation();
  const isFr = i18n.language === "fr";

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">

      <div className="grid gap-10 lg:grid-cols-[16rem_1px_minmax(0,1fr)] lg:items-start">
        <LegalSidebarNav sections={sections} isFr={isFr} onNavigate={scrollTo} />

        <div className="hidden self-stretch bg-gray-200 lg:block" aria-hidden="true" />

        <div>
          <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {isFr ? "Conditions de paiement" : "Payment Terms"}
        </h1>
        <p className="text-gray-500 text-sm">{isFr ? "Dernière mise à jour : " : "Last Updated: "}<span className="font-semibold text-gray-900">{isFr ? "Avril 2026" : "April 2026"}</span></p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          {isFr
            ? "Les présentes conditions de paiement régissent toutes les transactions financières effectuées sur la plateforme Uneden. En utilisant Uneden, vous acceptez ces conditions."
            : "These Payment Terms govern all financial transactions conducted on the Uneden platform. By using Uneden, you agree to these Payment Terms."}
        </p>
          </div>

          <div className="space-y-12 text-gray-700 text-sm leading-relaxed">

        <section id="nature">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "1. Nature des paiements" : "1. Nature of Payments"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Uneden est une plateforme qui facilite les transactions entre utilisateurs sans être elle-même le fournisseur direct des services." : "Uneden is a platform that facilitates transactions between users without itself being the direct provider of services."}</li>
            <li>{isFr ? "Les paiements, retenues, déblocages, ajustements et versements peuvent être gérés via la plateforme et ses prestataires de paiement." : "Payments, holds, releases, adjustments, and payouts may be managed through the platform and its payment providers."}</li>
          </ul>
        </section>

        <section id="process">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "2. Processus de paiement" : "2. Payment Process"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2 mb-3">
            <li>{isFr ? "Les clients paient généralement les services d'avance via la plateforme." : "Clients generally pay for services in advance through the platform."}</li>
            <li>
              {isFr ? "Les paiements peuvent être retenus jusqu'à :" : "Payments may be held until:"}
              <ul className="list-inside mt-1 ml-6 space-y-1 text-gray-500">
                <li>{isFr ? "— La réalisation du service," : "— The service is completed,"}</li>
                <li>{isFr ? "— Une autre résolution de la réservation, ou" : "— Another booking resolution, or"}</li>
                <li>{isFr ? "— La fin d'un litige ou d'un examen de risque" : "— The end of a dispute or risk review"}</li>
              </ul>
            </li>
          </ul>
          <p className="font-bold text-gray-900 text-sm">
            {isFr
              ? "Il est strictement interdit de détourner hors plateforme une transaction initiée sur Uneden pour éviter les frais, protections ou vérifications."
              : "Users are strictly prohibited from moving a platform-originated transaction off-platform to avoid fees, protections, or review."}
          </p>
        </section>

        <section id="buyer-fees">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "3. Frais acheteur" : "3. Buyer Fees"}
          </h2>
          <p className="mb-3">{isFr ? "En plus du prix du service :" : "In addition to the service price:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Des frais de service de <span className="font-semibold text-gray-900">5 %</span> sont généralement appliqués à chaque transaction</> : <>A <span className="font-semibold text-gray-900">5%</span> buyer service fee is generally applied to each transaction</>}</li>
            <li>{isFr ? "Les taxes applicables et certains frais de traitement tiers peuvent aussi être ajoutés selon le contexte." : "Applicable taxes and certain third-party processing costs may also be added depending on context."}</li>
          </ul>
          <div className="mt-3 max-w-md">
            <p className="mb-1 text-sm font-bold text-gray-900">{isFr ? "Exemple de calcul" : "Calculation example"}</p>
            <div className="space-y-1 text-sm text-gray-900">
              <div className="flex items-center justify-between gap-4">
                <span>{isFr ? "Service" : "Service"}</span>
                <span className="font-medium">$100.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">{isFr ? "Frais acheteur (5 %)" : "Buyer fee (5%)"}</span>
                <span className="font-semibold">$5.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{isFr ? "Taxes et autres frais applicables" : "Taxes and other applicable charges"}</span>
                <span className="font-medium">{isFr ? "Variables" : "Variable"}</span>
              </div>
              <div className="mt-1 border-t border-gray-300 pt-1">
                <div className="flex items-center justify-between gap-4 font-bold text-black">
                  <span>Total</span>
                  <span>$105 + {isFr ? "charges variables" : "variable charges"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="wallet">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "4. Système de portefeuille" : "4. Wallet System"}
          </h2>
          <p className="mb-3">{isFr ? "Chaque utilisateur dispose d'un portefeuille numérique pouvant inclure :" : "Each user has a digital wallet that may include:"}</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">{isFr ? "Solde en attente" : "Pending Balance"}</p>
                <p className="mt-0.5 text-xs text-gray-600">{isFr ? "Fonds encore soumis à examen, retenue ou litige" : "Funds still subject to review, hold, or dispute"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">{isFr ? "Solde approuvé" : "Approved Balance"}</p>
                <p className="mt-0.5 text-xs text-gray-600">{isFr ? "Fonds généralement disponibles pour retrait" : "Funds generally available for withdrawal"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">{isFr ? "Autres ajustements" : "Other Adjustments"}</p>
                <p className="mt-0.5 text-xs text-gray-600">{isFr ? "Réserves, corrections, retenues ou renversements appliqués si nécessaire" : "Reserves, corrections, holds, or reversals applied if needed"}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="dispute-period">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "5. Période de litige" : "5. Dispute Period"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Pour une réservation terminée, un litige doit généralement être ouvert dans les <span className="font-semibold text-gray-900">3 jours</span> suivant la fin.</> : <>For a completed booking, a dispute generally must be opened within <span className="font-semibold text-gray-900">3 days</span> of completion.</>}</li>
            <li>{isFr ? "Pendant cette période, les fonds peuvent demeurer en attente ou faire l'objet d'un examen." : "During this period, funds may remain pending or under review."}</li>
          </ul>
        </section>

        <section id="disputes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "6. Litiges et remboursements" : "6. Disputes & Refunds"}
          </h2>
          <p className="mb-3 text-gray-900">{isFr ? "En cas de litige :" : "If a dispute is filed:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2 mb-4">
            <li><span className="font-semibold text-gray-900">{isFr ? "Les deux parties peuvent soumettre des preuves, messages, photos ou autres éléments utiles" : "Both parties may submit evidence, messages, photos, or other relevant information"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Une réservation en cours peut être redirigée vers un litige plutôt que d'être annulée automatiquement" : "An in-progress booking may be redirected to dispute review rather than cancelled automatically"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Uneden examine le dossier et peut décider d'un remboursement, crédit, renversement partiel ou d'aucun ajustement" : "Uneden reviews the file and may decide on a refund, credit, partial reversal, or no adjustment"}</span></li>
          </ul>
          <div className="mt-3 max-w-md">
            <p className="mb-1 text-sm font-bold text-gray-900">{isFr ? "Politique de remboursement" : "Refund Policy"}</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 ml-2 mb-3">
              <li>{isFr ? "Les décisions sont prises au cas par cas selon les preuves, délais, messages et informations disponibles." : "Outcomes are decided case by case based on evidence, timing, messages, and available information."}</li>
              <li>{isFr ? "Les frais de transaction, frais de prestataire de paiement, taxes, coûts administratifs ou montants similaires peuvent demeurer non remboursables." : "Transaction fees, payment-provider fees, taxes, administrative costs, or similar amounts may remain non-refundable."}</li>
              <li>{isFr ? "Uneden peut suspendre le déblocage des fonds, créer une réserve temporaire ou ajuster les montants si nécessaire." : "Uneden may pause release of funds, create a temporary reserve, or adjust amounts if necessary."}</li>
            </ul>
            <p className="mt-1 text-xs font-bold text-gray-900">
              {isFr ? "Les décisions finales de plateforme peuvent être appliquées selon le dossier disponible." : "Final platform decisions may be applied based on the record available."}
            </p>
          </div>
        </section>

        <section id="partial">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "7. Paiements partiels" : "7. Partial Payments"}
          </h2>
          <p>{isFr ? "Certains services peuvent nécessiter des dépôts, matériaux, déplacements ou autres coûts particuliers. Ces conditions doivent être clairement convenues entre les utilisateurs avant le début du travail." : "Some services may require deposits, materials, travel, or other special costs. These terms must be clearly agreed between users before work begins."}</p>
        </section>

        <section id="withdrawals">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "8. Retraits" : "8. Withdrawals"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>
              {isFr ? (
                <>
                  Les retraits ne peuvent généralement être effectués que sur le <span className="font-semibold text-gray-900">solde approuvé</span>
                </>
              ) : (
                <>
                  Withdrawals generally may only be requested from the <span className="font-semibold text-gray-900">approved balance</span>
                </>
              )}
            </li>
            <li>
              {isFr ? (
                <>
                  Les retraits sont généralement disponibles une fois toutes les <span className="font-semibold text-gray-900">2 semaines (14 jours)</span>
                </>
              ) : (
                <>
                  Withdrawals are generally available once every <span className="font-semibold text-gray-900">14 days</span>
                </>
              )}
            </li>
            <li>
              {isFr ? (
                <>
                  Les nouveaux utilisateurs peuvent être soumis à une période d&apos;attente avant le <span className="font-semibold text-gray-900">premier retrait</span>
                </>
              ) : (
                <>
                  New users may be subject to a waiting period before their <span className="font-semibold text-gray-900">first withdrawal</span>
                </>
              )}
            </li>
          </ul>
        </section>

        <section id="withdrawal-fees">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "9. Frais de retrait" : "9. Withdrawal Fees"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Une commission de <span className="font-semibold text-gray-900">20 %</span> peut être appliquée sur les retraits</> : <>A <span className="font-semibold text-gray-900">20%</span> commission may be applied to withdrawals</>}</li>
            <li>{isFr ? "Des frais bancaires, de versement, de vérification ou de conformité peuvent aussi être déduits lorsqu'ils s'appliquent." : "Banking, payout, verification, or compliance-related costs may also be deducted where applicable."}</li>
          </ul>
          <div className="mt-3 max-w-md">
            <p className="mb-1 text-sm font-bold text-gray-900">{isFr ? "Exemple de retrait" : "Withdrawal example"}</p>
            <div className="space-y-1 text-sm text-gray-900">
              <div className="flex items-center justify-between gap-4">
                <span>{isFr ? "Solde approuvé" : "Approved balance"}</span>
                <span className="font-medium">$100.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">{isFr ? "Commission Uneden (20 %)" : "Uneden commission (20%)"}</span>
                <span className="font-semibold">−$20.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{isFr ? "Autres frais possibles" : "Other possible charges"}</span>
                <span className="font-medium">{isFr ? "Variables" : "Variable"}</span>
              </div>
              <div className="mt-1 border-t border-gray-300 pt-1">
                <div className="flex items-center justify-between gap-4 font-bold text-black">
                  <span>{isFr ? "Vous recevez" : "You receive"}</span>
                  <span>{isFr ? "$80.00 moins frais variables" : "$80.00 less variable charges"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="payment-methods">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "10. Méthodes de paiement" : "10. Payment Methods"}
          </h2>
          <p className="mb-3">{isFr ? "Les paiements peuvent être traités via des fournisseurs tiers (ex. : Stripe). Les utilisateurs acceptent que :" : "Payments may be processed through third-party providers (e.g., Stripe). Users agree that:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Le traitement des paiements et versements peut entraîner des frais, délais, retenues ou règles propres aux fournisseurs tiers." : "Payment and payout processing may involve fees, delays, holds, or rules imposed by third-party providers."}</li>
            <li>{isFr ? "Des vérifications d'identité, fiscales, bancaires ou d'entreprise peuvent être exigées avant certains paiements ou retraits." : "Identity, tax, banking, or business verification may be required before certain payments or withdrawals."}</li>
          </ul>
        </section>

        <section id="taxes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "11. Taxes" : "11. Taxes"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Les taxes sont calculées selon la localisation, le contexte du service ou les obligations légales applicables." : "Taxes are calculated based on location, service context, or applicable legal requirements."}</li>
            <li>{isFr ? "Les utilisateurs demeurent responsables de leurs obligations fiscales et déclaratives applicables." : "Users remain responsible for their applicable tax and reporting obligations."}</li>
          </ul>
        </section>

        <section id="delays">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "12. Délais de traitement" : "12. Delays & Processing Times"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Les paiements, remboursements, déblocages et retraits peuvent prendre du temps à être <span className="font-semibold text-gray-900">traités</span>.</> : <>Payments, refunds, releases, and withdrawals may take time to be <span className="font-semibold text-gray-900">processed</span>.</>}</li>
            <li>{isFr ? <>Des délais peuvent survenir en raison des systèmes bancaires, des jours fériés, de problèmes techniques ou des <span className="font-semibold text-gray-900">vérifications de conformité</span>.</> : <>Delays may occur due to banking systems, holidays, technical issues, or <span className="font-semibold text-gray-900">compliance checks</span>.</>}</li>
          </ul>
        </section>

        <section id="fraud">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "13. Fraude et abus" : "13. Fraud & Misuse"}
          </h2>
          <p className="mb-3">{isFr ? "Uneden se réserve le droit de :" : "Uneden reserves the right to:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Suspendre des paiements, retenir des fonds ou créer des réserves en cas de fraude, abus, activité non autorisée ou risque de rétrofacturation." : "Suspend payments, hold funds, or create reserves in cases of fraud, abuse, unauthorized activity, or chargeback risk."}</li>
            <li>{isFr ? "Limiter, bloquer ou fermer des comptes violant les règles de la plateforme." : "Limit, block, or close accounts that violate platform rules."}</li>
            <li>{isFr ? "Renverser certains montants ou exiger le remboursement de sommes dues à la plateforme lorsque nécessaire." : "Reverse certain amounts or require repayment of sums owed to the platform where necessary."}</li>
          </ul>
        </section>

        <section id="advertising">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "14. Publicité et futures fonctionnalités" : "14. Advertising & Future Features"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "La plateforme peut inclure des publicités, placements commandités ou outils promotionnels payants." : "The platform may include advertisements, sponsored placements, or paid promotional tools."}</li>
            <li>{isFr ? "De nouvelles fonctionnalités de paiement, promotion ou versement peuvent être introduites avec des règles additionnelles lorsqu'elles seront lancées." : "New payment, promotion, or payout features may be introduced with additional rules when launched."}</li>
          </ul>
        </section>

        <section id="changes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "15. Modifications des conditions de paiement" : "15. Changes to Payment Terms"}
          </h2>
          <p>{isFr ? <>Uneden se réserve le droit de modifier les présentes conditions de paiement <span className="font-semibold text-gray-900">de temps à autre</span>. L&apos;utilisation continue de la plateforme après l&apos;entrée en vigueur d&apos;une mise à jour signifie que vous acceptez la version révisée dans la mesure permise par la loi.</> : <>Uneden reserves the right to modify these Payment Terms <span className="font-semibold text-gray-900">from time to time</span>. Continued use of the platform after changes take effect means you accept the revised version to the extent permitted by law.</>}</p>
        </section>

        <section id="disclaimer">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "16. Limitation de responsabilité" : "16. Disclaimer"}
          </h2>
          <p className="mb-3">{isFr ? "Uneden agit uniquement en tant qu'intermédiaire et n'est pas responsable de :" : "Uneden acts only as an intermediary and is not responsible for:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "La qualité ou l'exécution des services fournis par les utilisateurs" : "The quality or performance of services provided by users"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Les litiges, retards, pertes financières ou incidents liés aux interactions entre utilisateurs ou aux prestataires tiers" : "Disputes, delays, financial losses, or incidents arising from user interactions or third-party providers"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Les pertes indirectes, accessoires ou consécutives liées à l'utilisation de la plateforme" : "Indirect, incidental, or consequential losses related to platform use"}</span></li>
          </ul>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "17. Contact" : "17. Contact"}
          </h2>
          <p className="mb-3">{isFr ? "Pour toute question, contactez-nous :" : "For any questions, contact us:"}</p>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">Uneden</p>
            <p className="font-semibold text-gray-900">391 Sauvé Street, Repentigny, Quebec, Canada</p>
          </div>
        </section>

      </div>
      </div>
      </div>
    </div>
  );
}