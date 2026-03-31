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
          {/* Header */}
          <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {isFr ? "Conditions de paiement" : "Payment Terms"}
        </h1>
        <p className="text-gray-500 text-sm">{isFr ? "Dernière mise à jour : " : "Last Updated: "}<span className="font-semibold text-gray-900">{isFr ? "Mars 2026" : "March 2026"}</span></p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          {isFr
            ? "Les présentes conditions de paiement régissent toutes les transactions financières effectuées sur la plateforme Uneden. En utilisant Uneden, vous acceptez ces conditions."
            : "These Payment Terms govern all financial transactions conducted on the Uneden platform. By using Uneden, you agree to these Payment Terms."}
        </p>
          </div>

          {/* Sections */}
          <div className="space-y-12 text-gray-700 text-sm leading-relaxed">

        <section id="nature">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "1. Nature des paiements" : "1. Nature of Payments"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Uneden est une plateforme qui facilite les transactions entre utilisateurs (clients et prestataires)." : "Uneden is a platform that facilitates transactions between users (clients and service providers)."}</li>
            <li>{isFr ? "Tous les paiements sont traités via la plateforme et gérés par un système de séquestre sécurisé." : "All payments are processed through the platform and managed using a secure escrow system."}</li>
          </ul>
        </section>

        <section id="process">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "2. Processus de paiement" : "2. Payment Process"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2 mb-3">
            <li>{isFr ? "Les clients doivent payer les services d'avance via la plateforme." : "Clients must pay for services in advance through the platform."}</li>
            <li>
              {isFr ? "Les paiements sont conservés en séquestre jusqu'à :" : "Payments are held in escrow until:"}
              <ul className="list-inside mt-1 ml-6 space-y-1 text-gray-500">
                <li>{isFr ? "— La réalisation du service, ou" : "— The service is completed, or"}</li>
                <li>{isFr ? "— La résolution d'un litige" : "— A dispute is resolved"}</li>
              </ul>
            </li>
          </ul>
          <p className="font-bold text-gray-900 text-sm">
            {isFr
              ? "Il est strictement interdit d'effectuer des transactions en dehors de la plateforme."
              : "Users are strictly prohibited from completing transactions outside the platform."}
          </p>
        </section>

        <section id="buyer-fees">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "3. Frais acheteur" : "3. Buyer Fees"}
          </h2>
          <p className="mb-3">{isFr ? "En plus du prix du service :" : "In addition to the service price:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Des frais de service de <span className="font-semibold text-gray-900">5 %</span> sont appliqués à chaque transaction</> : <>A <span className="font-semibold text-gray-900">5%</span> buyer service fee is applied to each transaction</>}</li>
            <li>{isFr ? "Les taxes applicables sont ajoutées en fonction de la province de l'acheteur" : "Applicable taxes are added based on the buyer's location"}</li>
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
                <span>{isFr ? "Taxes (selon province)" : "Taxes (by province)"}</span>
                <span className="font-medium">{isFr ? "Variable" : "Variable"}</span>
              </div>
              <div className="mt-1 border-t border-gray-300 pt-1">
                <div className="flex items-center justify-between gap-4 font-bold text-black">
                  <span>Total</span>
                  <span>$105 + taxes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="wallet">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "4. Système de portefeuille" : "4. Wallet System"}
          </h2>
          <p className="mb-3">{isFr ? "Chaque utilisateur dispose d'un portefeuille numérique contenant :" : "Each user has a digital wallet containing:"}</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">{isFr ? "Solde en attente" : "Pending Balance"}</p>
                <p className="mt-0.5 text-xs text-gray-600">{isFr ? "Fonds pouvant encore faire l'objet d'un litige" : "Funds that may still be disputed"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">{isFr ? "Solde approuvé" : "Approved Balance"}</p>
                <p className="mt-0.5 text-xs text-gray-600">{isFr ? "Fonds disponibles pour retrait" : "Funds available for withdrawal"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">{isFr ? "Solde total" : "Total Balance"}</p>
                <p className="mt-0.5 text-xs text-gray-600">{isFr ? "Somme de tous les fonds" : "Sum of all funds"}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="dispute-period">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "5. Période de litige" : "5. Dispute Period"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Les utilisateurs disposent de <span className="font-semibold text-gray-900">3 jours</span> après la réalisation du service pour ouvrir un litige</> : <>Users have up to <span className="font-semibold text-gray-900">3 days</span> after service completion to open a dispute</>}</li>
            <li>{isFr ? "Pendant cette période, les fonds restent dans le solde en attente" : "During this period, funds remain in the pending balance"}</li>
          </ul>
        </section>

        <section id="disputes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "6. Litiges et remboursements" : "6. Disputes & Refunds"}
          </h2>
          <p className="mb-3 text-gray-900">{isFr ? "En cas de litige :" : "If a dispute is filed:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2 mb-4">
            <li><span className="font-semibold text-gray-900">{isFr ? "Les deux parties peuvent soumettre des preuves (messages, photos, etc.)" : "Both parties may submit evidence (messages, photos, etc.)"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Uneden examine le dossier et détermine l'issue" : "Uneden reviews the case and determines the outcome"}</span></li>
          </ul>
          <div className="mt-3 max-w-md">
            <p className="mb-1 text-sm font-bold text-gray-900">{isFr ? "Politique de remboursement" : "Refund Policy"}</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 ml-2 mb-3">
              <li>{isFr ? <>Remboursement maximum : <span className="font-semibold">50 %</span> du montant de la transaction</> : <>Maximum refund: <span className="font-semibold">50%</span> of the transaction amount</>}</li>
              <li>{isFr ? "Le montant restant est alloué au prestataire" : "The remaining amount is allocated to the service provider"}</li>
            </ul>
            <div className="space-y-1 text-sm text-gray-900">
              <div className="flex items-center justify-between gap-4">
                <span>{isFr ? "Montant payé" : "Amount paid"}</span>
                <span className="font-medium">$50.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">{isFr ? "Remboursement client (max)" : "Client refund (max)"}</span>
                <span className="font-semibold">$25.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{isFr ? "Prestataire reçoit" : "Worker receives"}</span>
                <span className="font-medium">$25.00</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-700">
              <span className="font-bold">{isFr ? "Exemple : " : "Example: "}</span>
              {isFr ? "Montant payé = 50 $ -> remboursement maximum client = 25 $, prestataire = 25 $." : "Amount paid = $50 -> maximum client refund = $25, worker = $25."}
            </p>
            <p className="mt-1 text-xs font-bold text-gray-900">
              {isFr ? "Toutes les décisions sont définitives." : "All decisions are final."}
            </p>
          </div>
        </section>

        <section id="partial">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "7. Paiements partiels" : "7. Partial Payments"}
          </h2>
          <p>{isFr ? "Certains services peuvent nécessiter des paiements partiels d'avance (ex. : matériaux). Ces conditions doivent être clairement convenues entre les utilisateurs avant le début du travail." : "Some services may require partial upfront payments (e.g., materials). These conditions must be clearly agreed upon between users before work begins."}</p>
        </section>

        <section id="withdrawals">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "8. Retraits" : "8. Withdrawals"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>
              {isFr ? (
                <>
                  Les retraits ne peuvent être effectués que sur le <span className="font-semibold text-gray-900">solde approuvé</span>
                </>
              ) : (
                <>
                  Users may request withdrawal of funds from their <span className="font-semibold text-gray-900">approved balance</span> only
                </>
              )}
            </li>
            <li>
              {isFr ? (
                <>
                  Les retraits peuvent être demandés une fois toutes les <span className="font-semibold text-gray-900">2 semaines (14 jours)</span>
                </>
              ) : (
                <>
                  Withdrawals can be requested once every <span className="font-semibold text-gray-900">14 days</span>
                </>
              )}
            </li>
            <li>
              {isFr ? (
                <>
                  Les nouveaux utilisateurs doivent attendre <span className="font-semibold text-gray-900">14 jours</span> après la <span className="font-semibold text-gray-900">création de leur compte</span> avant le <span className="font-semibold text-gray-900">premier retrait</span>
                </>
              ) : (
                <>
                  New users must wait <span className="font-semibold text-gray-900">14 days</span> after <span className="font-semibold text-gray-900">account creation</span> before their <span className="font-semibold text-gray-900">first withdrawal</span>
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
            <li>{isFr ? <>Une commission de <span className="font-semibold text-gray-900">20 %</span> est appliquée sur tous les retraits</> : <>A <span className="font-semibold text-gray-900">20%</span> commission fee is applied to all withdrawals</>}</li>
            <li>{isFr ? "Le montant restant est transféré sur le compte bancaire de l'utilisateur" : "The remaining amount is transferred to the user's bank account"}</li>
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
              <div className="mt-1 border-t border-gray-300 pt-1">
                <div className="flex items-center justify-between gap-4 font-bold text-black">
                  <span>{isFr ? "Vous recevez" : "You receive"}</span>
                  <span>$80.00</span>
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
            <li>{isFr ? "Le traitement des paiements peut entraîner des frais ou délais tiers" : "Payment processing may involve third-party fees or delays"}</li>
            <li>{isFr ? "Uneden n'est pas responsable des problèmes causés par des fournisseurs tiers" : "Uneden is not responsible for issues caused by third-party providers"}</li>
          </ul>
        </section>

        <section id="taxes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "11. Taxes" : "11. Taxes"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Les taxes sont calculées en fonction de la province de l'acheteur" : "Taxes are calculated based on the buyer's location"}</li>
            <li>{isFr ? "Les utilisateurs sont responsables de leurs obligations fiscales applicables" : "Users are responsible for any applicable tax obligations"}</li>
          </ul>
        </section>

        <section id="delays">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "12. Délais de traitement" : "12. Delays & Processing Times"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Les retraits et transactions peuvent prendre du temps à être <span className="font-semibold text-gray-900">traités</span></> : <>Withdrawals and transactions may take time to be <span className="font-semibold text-gray-900">processed</span></>}</li>
            <li>{isFr ? <>Des délais peuvent survenir en raison des systèmes bancaires ou des <span className="font-semibold text-gray-900">exigences de vérification</span></> : <>Delays may occur due to banking systems or <span className="font-semibold text-gray-900">verification requirements</span></>}</li>
          </ul>
        </section>

        <section id="fraud">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "13. Fraude et abus" : "13. Fraud & Misuse"}
          </h2>
          <p className="mb-3">{isFr ? "Uneden se réserve le droit de :" : "Uneden reserves the right to:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Suspendre ou retenir des fonds en cas de fraude suspectée" : "Suspend or withhold funds in cases of suspected fraud"}</li>
            <li>{isFr ? "Annuler des transactions si nécessaire" : "Reverse transactions when necessary"}</li>
            <li>{isFr ? "Limiter ou bloquer les comptes violant les règles de la plateforme" : "Limit or block accounts that violate platform rules"}</li>
          </ul>
        </section>

        <section id="advertising">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "14. Publicité et futures fonctionnalités" : "14. Advertising & Future Features"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "La plateforme peut inclure des publicités (ex. : Google Ads)" : "The platform may include advertisements (e.g., Google Ads)"}</li>
            <li>{isFr ? "Des fonctionnalités de promotion payante pour les annonces peuvent être introduites" : "Paid promotional features for listings may be introduced"}</li>
          </ul>
        </section>

        <section id="changes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "15. Modifications des conditions de paiement" : "15. Changes to Payment Terms"}
          </h2>
          <p>{isFr ? <>Uneden se réserve le droit de modifier les présentes conditions de paiement <span className="font-semibold text-gray-900">à tout moment</span>, <span className="font-semibold text-gray-900">sans préavis préalable</span>.</> : <>Uneden reserves the right to modify these Payment Terms <span className="font-semibold text-gray-900">at any time</span> <span className="font-semibold text-gray-900">without prior notice</span>.</>}</p>
        </section>

        <section id="disclaimer">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "16. Limitation de responsabilité" : "16. Disclaimer"}
          </h2>
          <p className="mb-3">{isFr ? "Uneden agit uniquement en tant qu'intermédiaire et n'est pas responsable de :" : "Uneden acts only as an intermediary and is not responsible for:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "La qualité des services fournis" : "The quality of services"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Les litiges entre utilisateurs au-delà de la résolution de la plateforme" : "User disputes beyond platform resolution"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Les pertes financières résultant des interactions entre utilisateurs" : "Financial losses resulting from user interactions"}</span></li>
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
