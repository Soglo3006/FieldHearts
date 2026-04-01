"use client";
import { useTranslation } from "react-i18next";
import LegalSidebarNav from "@/components/legal/LegalSidebarNav";

const sections = [
  { id: "nature", en: "1. Nature of the Platform", fr: "1. Nature de la plateforme" },
  { id: "responsibilities", en: "2. User Responsibilities", fr: "2. Responsabilités des utilisateurs" },
  { id: "payments", en: "3. Payments & Fees", fr: "3. Paiements et frais" },
  { id: "wallet", en: "4. Wallet System", fr: "4. Système de portefeuille" },
  { id: "withdrawals", en: "5. Withdrawals", fr: "5. Retraits" },
  { id: "disputes", en: "6. Disputes & Refunds", fr: "6. Litiges et remboursements" },
  { id: "partial", en: "7. Partial Payments", fr: "7. Paiements partiels" },
  { id: "reviews", en: "8. Reviews & Ratings", fr: "8. Avis et évaluations" },
  { id: "advertising", en: "9. Advertising", fr: "9. Publicité" },
  { id: "liability", en: "10. Liability Disclaimer", fr: "10. Limitation de responsabilité" },
  { id: "prohibited", en: "11. Prohibited Activities", fr: "11. Activités interdites" },
  { id: "financial-risks", en: "12. Financial & Payment Risks", fr: "12. Risques financiers" },
  { id: "safety", en: "13. Safety Warning", fr: "13. Avertissement de sécurité" },
  { id: "modifications", en: "14. Modifications", fr: "14. Modifications" },
  { id: "governing-law", en: "15. Governing Law", fr: "15. Droit applicable" },
  { id: "contact", en: "16. Contact", fr: "16. Contact" },
];

export default function TermsOfServicePage() {
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
          {isFr ? "Conditions d'utilisation" : "Terms of Service"}
        </h1>
        <p className="text-gray-500 text-sm">{isFr ? "Dernière mise à jour : " : "Last Updated: "}<span className="font-semibold text-gray-900">{isFr ? "Avril 2026" : "April 2026"}</span></p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          {isFr
            ? <>En utilisant Uneden, vous <span className="font-semibold text-gray-900">acceptez</span> les présentes conditions d&apos;utilisation. Veuillez les lire attentivement avant d&apos;utiliser la plateforme.</>
            : <>By using Uneden, you <span className="font-semibold text-gray-900">agree</span> to these Terms of Service. Please read them carefully before using the platform.</>}
        </p>
          </div>

          <div className="space-y-12 text-gray-700 text-sm leading-relaxed">

        <section id="nature">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "1. Nature de la plateforme" : "1. Nature of the Platform"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Uneden est une place de marché technologique mettant en relation des utilisateurs, facilitant les échanges, les réservations et les paiements sur la plateforme." : "Uneden is a technology marketplace connecting users and facilitating communication, bookings, and payments through the platform."}</li>
            <li>{isFr ? "Nous ne fournissons pas nous-mêmes les services affichés et nous n'agissons pas comme employeur, entrepreneur, assureur, garant ou conseiller professionnel des utilisateurs." : "We do not directly provide the listed services and we do not act as employer, contractor, insurer, guarantor, or professional advisor for users."}</li>
          </ul>
        </section>

        <section id="responsibilities">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "2. Responsabilités des utilisateurs" : "2. User Responsibilities"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs s'engagent à :" : "Users agree to:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Fournir des informations exactes, à jour et complètes" : "Provide accurate, current, and complete information"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Respecter les autres utilisateurs et utiliser la plateforme de bonne foi" : "Respect other users and use the platform in good faith"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Clarifier l'étendue, les délais et les conditions pratiques avant le début du travail" : "Clarify scope, timing, and practical requirements before work begins"}</span></li>
          </ul>
          <p className="mt-3">{isFr ? "Les utilisateurs demeurent responsables de vérifier la crédibilité, la conformité et la pertinence des autres parties avant de s'engager." : "Users remain responsible for verifying the credibility, compliance, and suitability of other parties before engaging."}</p>
        </section>

        <section id="payments">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "3. Paiements et frais" : "3. Payments & Fees"}
          </h2>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "a. Frais acheteur" : "a. Buyer Fees"}</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>{isFr ? <>Une commission de <span className="font-semibold text-gray-900">5 %</span> est généralement ajoutée à chaque transaction</> : <>A <span className="font-semibold text-gray-900">5%</span> fee is generally added to each transaction</>}</li>
                <li>{isFr ? "Des taxes applicables ainsi que certains frais de traitement tiers peuvent aussi s'appliquer selon le contexte de la transaction." : "Applicable taxes and certain third-party processing costs may also apply depending on the transaction context."}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "b. Système de séquestre (escrow)" : "b. Escrow System"}</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>{isFr ? "Les paiements sont généralement retenus jusqu'à la réalisation du service, à une autre résolution de la réservation ou au traitement d'un litige." : "Payments are generally held until service completion, another booking resolution, or dispute handling."}</li>
                <li>{isFr ? "Les utilisateurs ne doivent pas détourner hors de la plateforme une transaction initiée sur Uneden pour éviter les frais, protections ou vérifications de la plateforme." : "Users must not move platform-originated transactions outside Uneden to avoid fees, protections, or platform review."}</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="wallet">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "4. Système de portefeuille" : "4. Wallet System"}
          </h2>
          <p className="mb-3">{isFr ? "Chaque utilisateur dispose d'un portefeuille pouvant contenir :" : "Each user has a wallet that may contain:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-medium text-gray-700">{isFr ? "Solde en attente" : "Pending balance"}</span> — {isFr ? "montants pouvant encore être examinés, retenus ou contestés" : "amounts that may still be reviewed, held, or disputed"}</li>
            <li><span className="font-medium text-gray-700">{isFr ? "Solde approuvé" : "Approved balance"}</span> — {isFr ? "montants généralement admissibles au retrait" : "amounts generally eligible for withdrawal"}</li>
            <li><span className="font-medium text-gray-700">{isFr ? "Autres ajustements" : "Other adjustments"}</span> — {isFr ? "réserves, corrections, renversements ou retenues pouvant être appliqués si nécessaire" : "reserves, corrections, reversals, or holds that may be applied if needed"}</li>
          </ul>
        </section>

        <section id="withdrawals">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "5. Retraits" : "5. Withdrawals"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Seuls les soldes approuvés sont généralement admissibles au retrait." : "Only approved balances are generally eligible for withdrawal."}</li>
            <li>{isFr ? <>Les retraits sont généralement disponibles tous les <span className="font-semibold text-gray-900">14 jours</span>, et de nouveaux comptes peuvent être soumis à une période d&apos;attente initiale.</> : <>Withdrawals are generally available every <span className="font-semibold text-gray-900">14 days</span>, and new accounts may be subject to an initial waiting period.</>}</li>
            <li>{isFr ? <>Une commission de retrait de <span className="font-semibold text-gray-900">20 %</span> peut s&apos;appliquer, en plus de certains frais bancaires, de versement ou de conformité lorsqu&apos;ils doivent être déduits.</> : <>A <span className="font-semibold text-gray-900">20%</span> withdrawal commission may apply, in addition to banking, payout, or compliance costs where they must be deducted.</>}</li>
          </ul>
        </section>

        <section id="disputes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "6. Litiges et remboursements" : "6. Disputes & Refunds"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2 mb-4">
            <li>{isFr ? "Avant le début du travail, certaines réservations peuvent être annulées directement. Une réservation en cours peut cependant être redirigée vers un litige au lieu d'être annulée automatiquement." : "Before work begins, some bookings may be cancelled directly. An in-progress booking may instead be redirected to dispute review rather than cancelled automatically."}</li>
            <li>{isFr ? <>Pour une réservation terminée, un litige doit généralement être ouvert dans les <span className="font-semibold text-gray-900">3 jours</span> suivant la fin, sauf décision différente d&apos;Uneden.</> : <>For a completed booking, a dispute generally must be opened within <span className="font-semibold text-gray-900">3 days</span> of completion, unless Uneden determines otherwise.</>}</li>
            <li>{isFr ? "Après examen, un remboursement, un crédit, un renversement partiel ou aucun ajustement peut être accordé selon les informations disponibles." : "After review, a refund, credit, partial reversal, or no adjustment at all may be granted depending on the information available."}</li>
          </ul>
          <div className="mt-4">
            <p className="font-bold text-gray-900 mb-2">{isFr ? "Politique de remboursement" : "Refund Policy"}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
              <li>{isFr ? "Les décisions sont prises au cas par cas selon les messages, preuves, délais et données disponibles sur la plateforme." : "Outcomes are determined case by case based on messages, evidence, timelines, and platform records."}</li>
              <li>{isFr ? "Les frais de transaction, frais de prestataire de paiement, taxes ou montants administratifs peuvent demeurer non remboursables et être déduits lorsqu'applicable." : "Transaction fees, payment-provider fees, taxes, or administrative amounts may remain non-refundable and may be deducted where applicable."}</li>
              <li>{isFr ? "Uneden peut suspendre le déblocage des fonds, demander des preuves complémentaires et rendre une décision finale de plateforme." : "Uneden may pause release of funds, request additional evidence, and make a final platform decision."}</li>
            </ul>
          </div>
        </section>

        <section id="partial">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "7. Paiements partiels" : "7. Partial Payments"}
          </h2>
          <p>{isFr ? "Certains services peuvent nécessiter des dépôts, des matériaux, des achats personnalisés, des déplacements ou d'autres coûts préapprouvés. Ces conditions doivent être clairement convenues entre les utilisateurs avant le début du travail." : "Some services may require deposits, materials, custom purchases, travel, or other pre-approved costs. These terms must be clearly agreed between users before work begins."}</p>
        </section>

        <section id="reviews">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "8. Avis et évaluations" : "8. Reviews & Ratings"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Les utilisateurs peuvent laisser des avis et échanger des messages liés à l'activité sur la plateforme." : "Users may leave reviews and exchange messages related to platform activity."}</li>
            <li>{isFr ? "Uneden peut modérer, retirer ou conserver certains contenus lorsque cela est nécessaire pour la sécurité, l'application des règles ou la conformité légale." : "Uneden may moderate, remove, or retain certain content where necessary for safety, policy enforcement, or legal compliance."}</li>
          </ul>
        </section>

        <section id="advertising">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "9. Publicité" : "9. Advertising"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "La plateforme peut afficher des annonces, placements commandités ou outils promotionnels payants, maintenant ou à l'avenir." : "The platform may display advertisements, sponsored placements, or paid promotional tools now or in the future."}</li>
            <li>{isFr ? "Des fonctionnalités promotionnelles additionnelles peuvent être introduites avec des règles spécifiques lorsqu'elles seront lancées." : "Additional promotional features may be introduced with their own specific rules when launched."}</li>
          </ul>
        </section>

        <section id="liability">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "10. Limitation de responsabilité" : "10. Liability Disclaimer"}
          </h2>
          <p className="mb-3">{isFr ? "Dans la mesure permise par la loi, Uneden n'est pas responsable de :" : "To the extent permitted by law, Uneden is not liable for:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "La qualité, l'exécution ou les résultats des services fournis par les utilisateurs" : "The quality, performance, or results of services provided by users"}</li>
            <li>{isFr ? "Les dommages, retards, pertes financières, fraudes ou litiges découlant des interactions entre utilisateurs ou de systèmes tiers" : "Damages, delays, financial losses, fraud, or disputes arising from user interactions or third-party systems"}</li>
            <li>{isFr ? "Les pertes indirectes, accessoires, spéciales, consécutives ou les pertes de profits liées à l'utilisation de la plateforme" : "Indirect, incidental, special, consequential, or lost-profit damages related to platform use"}</li>
          </ul>
          <p className="mt-3 font-semibold text-gray-900">{isFr ? "Nous agissons uniquement en tant qu'intermédiaire de plateforme." : "We act only as a platform intermediary."}</p>
        </section>

        <section id="prohibited">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "11. Activités interdites" : "11. Prohibited Activities"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs ne peuvent pas :" : "Users may not:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Commettre des fraudes, arnaques, abus de rétrofacturation ou usurpations d'identité" : "Commit fraud, scams, chargeback abuse, or identity misuse"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Contourner les paiements ou protections de la plateforme" : "Bypass platform payments or safeguards"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Publier de faux avis, harceler, menacer ou utiliser la plateforme pour des services illégaux ou interdits" : "Post false reviews, harass, threaten, or use the platform for unlawful or prohibited services"}</span></li>
          </ul>
          <p className="mt-3">{isFr ? <>Les comptes peuvent être <span className="font-semibold text-gray-900">limités, suspendus ou fermés</span> à notre discrétion.</> : <>Accounts may be <span className="font-semibold text-gray-900">limited, suspended, or closed</span> at our discretion.</>}</p>
        </section>

        <section id="financial-risks">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "12. Risques financiers et de paiement" : "12. Financial & Payment Risks"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs reconnaissent que :" : "Users acknowledge:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Les paiements et versements peuvent être traités par des <span className="font-semibold text-gray-900">prestataires tiers</span> soumis à leurs propres règles.</> : <>Payments and payouts may be processed by <span className="font-semibold text-gray-900">third-party providers</span> subject to their own rules.</>}</li>
            <li>{isFr ? <>Des <span className="font-semibold text-gray-900">délais, retenues, réserves ou corrections</span> peuvent survenir pour des raisons opérationnelles, de conformité ou de risque.</> : <><span className="font-semibold text-gray-900">Delays, holds, reserves, or corrections</span> may occur for operational, compliance, or risk reasons.</>}</li>
            <li>{isFr ? <>Les soldes des portefeuilles et les montants à payer ou verser peuvent être ajustés conformément aux <span className="font-semibold text-gray-900">règles de la plateforme</span>.</> : <>Wallet balances and payment or payout amounts may be adjusted in accordance with <span className="font-semibold text-gray-900">platform rules</span>.</>}</li>
          </ul>
        </section>

        <section id="safety">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "13. Avertissement de sécurité" : "13. Safety Warning"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs devraient :" : "Users should:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Vérifier les prestataires, clients et informations de réservation" : "Verify providers, clients, and booking details"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Éviter les transactions non sécurisées ou hors plateforme" : "Avoid unsafe or off-platform transactions"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Faire preuve de prudence dans les interactions et signaler rapidement toute situation risquée" : "Use caution in interactions and report risky situations promptly"}</span></li>
          </ul>
        </section>

        <section id="modifications">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "14. Modifications" : "14. Modifications"}
          </h2>
          <p>{isFr ? <>Nous pouvons modifier ces conditions <span className="font-semibold text-gray-900">de temps à autre</span>. L&apos;utilisation continue d&apos;Uneden après mise à jour signifie que vous acceptez la version révisée dans la mesure permise par la loi.</> : <>We may modify these Terms <span className="font-semibold text-gray-900">from time to time</span>. Continued use of Uneden after an update means you accept the revised version to the extent permitted by law.</>}</p>
        </section>

        <section id="governing-law">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "15. Droit applicable" : "15. Governing Law"}
          </h2>
          <p className="mb-3">{isFr ? "Les présentes conditions sont régies par les lois applicables de :" : "These Terms are governed by the applicable laws of:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "La province de Québec" : "Province of Quebec"}</span></li>
            <li><span className="font-semibold text-gray-900">Canada</span></li>
          </ul>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "16. Contact" : "16. Contact"}
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