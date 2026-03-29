"use client";
import { useTranslation } from "react-i18next";

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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {isFr ? "Conditions d'utilisation" : "Terms of Service"}
        </h1>
        <p className="text-gray-500 text-sm">{isFr ? "Dernière mise à jour : " : "Last Updated: "}<span className="font-semibold text-gray-900">{isFr ? "Mars 2026" : "March 2026"}</span></p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          {isFr
            ? <>En utilisant Uneden, vous <span className="font-semibold text-gray-900">acceptez</span> les présentes conditions d&apos;utilisation. Veuillez les lire attentivement avant d&apos;utiliser la plateforme.</>
            : <>By using Uneden, you <span className="font-semibold text-gray-900">agree</span> to these Terms of Service. Please read them carefully before using the platform.</>}
        </p>
      </div>

      {/* Table of Contents */}
      <div className="mb-12">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          {isFr ? "Table des matières" : "Table of Contents"}
        </p>
        <ol className="space-y-2">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => scrollTo(s.id)}
                type="button"
                className="cursor-pointer text-sm text-green-700 hover:text-green-900 hover:underline text-left"
              >
                {isFr ? s.fr : s.en}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 border-t border-gray-200" />
      </div>

      {/* Sections */}
      <div className="space-y-12 text-gray-700 text-sm leading-relaxed">

        <section id="nature">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "1. Nature de la plateforme" : "1. Nature of the Platform"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Uneden est une place de marché mettant en relation des utilisateurs (clients et prestataires de services)." : "Uneden is a marketplace connecting users (clients and service providers)."}</li>
            <li>{isFr ? "Nous ne fournissons pas nous-mêmes les services listés sur la plateforme." : "We do not provide the services ourselves."}</li>
          </ul>
        </section>

        <section id="responsibilities">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "2. Responsabilités des utilisateurs" : "2. User Responsibilities"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs s'engagent à :" : "Users agree to:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Fournir des informations exactes" : "Provide accurate information"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Respecter les autres utilisateurs" : "Respect other users"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Livrer les services tels que convenus" : "Deliver services as agreed"}</span></li>
          </ul>
          <p className="mt-3">{isFr ? "Les utilisateurs sont responsables de vérifier la crédibilité des autres avant de s'engager." : "Users are responsible for verifying the credibility of others before engaging."}</p>
        </section>

        <section id="payments">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "3. Paiements et frais" : "3. Payments & Fees"}
          </h2>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "a. Frais acheteur" : "a. Buyer Fees"}</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>{isFr ? <>Une commission de <span className="font-semibold text-gray-900">5 %</span> est ajoutée à chaque transaction</> : <>A <span className="font-semibold text-gray-900">5%</span> commission is added to each transaction</>}</li>
                <li>{isFr ? "Des taxes peuvent également s'appliquer selon la province de l'acheteur" : "Applicable taxes may also apply based on the buyer's province"}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "b. Système de séquestre (escrow)" : "b. Escrow System"}</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>{isFr ? <>Les paiements sont retenus jusqu&apos;à la <span className="font-semibold text-gray-900">réalisation du service</span></> : <>Payments are held until <span className="font-semibold text-gray-900">completion of the service</span></>}</li>
                <li>{isFr ? <>Les fonds sont libérés après <span className="font-semibold text-gray-900">confirmation</span> ou <span className="font-semibold text-gray-900">résolution d&apos;un litige</span></> : <>Funds are released after <span className="font-semibold text-gray-900">confirmation</span> or <span className="font-semibold text-gray-900">dispute resolution</span></>}</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="wallet">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "4. Système de portefeuille" : "4. Wallet System"}
          </h2>
          <p className="mb-3">{isFr ? "Chaque utilisateur dispose d'un portefeuille contenant :" : "Each user has a wallet with:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-medium text-gray-700">{isFr ? "Solde en attente" : "Pending balance"}</span> — {isFr ? "peut encore faire l'objet d'un litige" : "can be disputed"}</li>
            <li><span className="font-medium text-gray-700">{isFr ? "Solde approuvé" : "Approved balance"}</span> — {isFr ? "éligible au retrait" : "eligible for withdrawal"}</li>
            <li><span className="font-medium text-gray-700">{isFr ? "Solde total" : "Total balance"}</span> — {isFr ? "somme des deux" : "sum of both"}</li>
          </ul>
        </section>

        <section id="withdrawals">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "5. Retraits" : "5. Withdrawals"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Les utilisateurs peuvent demander un retrait tous les <span className="font-semibold text-gray-900">14 jours</span></> : <>Users can request withdrawals every <span className="font-semibold text-gray-900">14 days</span></>}</li>
            <li>{isFr ? <>Les nouveaux utilisateurs doivent attendre <span className="font-semibold text-gray-900">14 jours</span> après la création de leur compte avant le premier retrait</> : <>New users must wait <span className="font-semibold text-gray-900">14 days</span> after account creation before first withdrawal</>}</li>
            <li>{isFr ? <>Une commission de retrait de <span className="font-semibold text-gray-900">20 %</span> s&apos;applique</> : <>A <span className="font-semibold text-gray-900">20%</span> withdrawal commission applies</>}</li>
          </ul>
        </section>

        <section id="disputes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "6. Litiges et remboursements" : "6. Disputes & Refunds"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2 mb-4">
            <li>{isFr ? <>Les utilisateurs disposent de <span className="font-semibold text-gray-900">3 jours</span> pour ouvrir un litige</> : <>Users have <span className="font-semibold text-gray-900">3 days</span> to open a dispute</>}</li>
            <li>{isFr ? "Après examen, des remboursements peuvent être accordés" : "After review, refunds may be issued"}</li>
          </ul>
          <div className="mt-4">
            <p className="font-bold text-gray-900 mb-2">{isFr ? "Politique de remboursement" : "Refund Policy"}</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
              <li>{isFr ? <>Remboursement maximum : <span className="font-semibold text-gray-900">50 %</span> de la valeur de la transaction</> : <>Maximum refund: <span className="font-semibold text-gray-900">50%</span> of transaction value</>}</li>
              <li>{isFr ? <>Les <span className="font-semibold text-gray-900">50 %</span> restants sont alloués au prestataire de service</> : <>Remaining <span className="font-semibold text-gray-900">50%</span> is allocated to the service provider</>}</li>
            </ul>
            <p className="text-xs text-gray-700 mt-3">
              <span className="font-bold">{isFr ? "Exemple : " : "Example: "}</span>
              {isFr
                ? "Si 50 $ sont payés -> remboursement maximum = 25 $ au client, 25 $ au prestataire"
                : "If $50 is paid -> maximum refund = $25 to client, $25 to worker"}
            </p>
          </div>
        </section>

        <section id="partial">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "7. Paiements partiels" : "7. Partial Payments"}
          </h2>
          <p>{isFr ? "Certains services peuvent nécessiter des paiements partiels d'avance (ex. : matériaux). Ces conditions doivent être clairement convenues entre les utilisateurs." : "Some services may require partial upfront payments (e.g., materials). These conditions must be clearly agreed upon between users."}</p>
        </section>

        <section id="reviews">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "8. Avis et évaluations" : "8. Reviews & Ratings"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Les utilisateurs peuvent laisser des avis après chaque transaction" : "Users may leave reviews after transactions"}</li>
            <li>{isFr ? "Uneden n'est pas responsable de l'exactitude des avis" : "Uneden is not responsible for the accuracy of reviews"}</li>
          </ul>
        </section>

        <section id="advertising">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "9. Publicité" : "9. Advertising"}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "La plateforme peut afficher des annonces Google Ads" : "The platform may display Google Ads"}</li>
            <li>{isFr ? "Des fonctionnalités de promotion payante pour les annonces peuvent être introduites à l'avenir" : "Paid promotion features for listings may be introduced in the future"}</li>
          </ul>
        </section>

        <section id="liability">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "10. Limitation de responsabilité" : "10. Liability Disclaimer"}
          </h2>
          <p className="mb-3">{isFr ? "Uneden n'est pas responsable de :" : "Uneden is not liable for:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "La mauvaise qualité du travail effectué" : "Poor quality work"}</li>
            <li>{isFr ? "Les dommages causés par les utilisateurs" : "Damages caused by users"}</li>
            <li>{isFr ? "Les litiges entre utilisateurs" : "Disputes between users"}</li>
          </ul>
          <p className="mt-3 font-semibold text-gray-900">{isFr ? "Nous agissons uniquement en tant qu'intermédiaire." : "We act only as an intermediary."}</p>
        </section>

        <section id="prohibited">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "11. Activités interdites" : "11. Prohibited Activities"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs ne peuvent pas :" : "Users may not:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Commettre des fraudes ou arnaques" : "Commit fraud or scams"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Abuser de la plateforme" : "Abuse the platform"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Contourner les systèmes de paiement" : "Circumvent payment systems"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Publier de faux avis ou se faire passer pour quelqu'un d'autre" : "Post false reviews or impersonate others"}</span></li>
          </ul>
          <p className="mt-3">{isFr ? <>Les comptes peuvent être <span className="font-semibold text-gray-900">suspendus</span> à notre discrétion.</> : <>Accounts may be <span className="font-semibold text-gray-900">suspended</span> at our discretion.</>}</p>
        </section>

        <section id="financial-risks">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "12. Risques financiers et de paiement" : "12. Financial & Payment Risks"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs reconnaissent que :" : "Users acknowledge:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Les paiements sont traités par des <span className="font-semibold text-gray-900">tiers</span></> : <>Payments are processed via <span className="font-semibold text-gray-900">third parties</span></>}</li>
            <li>{isFr ? <>Des <span className="font-semibold text-gray-900">délais</span> ou <span className="font-semibold text-gray-900">problèmes</span> peuvent survenir</> : <><span className="font-semibold text-gray-900">Delays</span> or <span className="font-semibold text-gray-900">issues</span> may occur</>}</li>
            <li>{isFr ? <>Les soldes des portefeuilles sont soumis aux <span className="font-semibold text-gray-900">règles de la plateforme</span></> : <>Wallet balances are subject to <span className="font-semibold text-gray-900">platform rules</span></>}</li>
          </ul>
        </section>

        <section id="safety">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "13. Avertissement de sécurité" : "13. Safety Warning"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs devraient :" : "Users should:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Vérifier les prestataires de services" : "Verify service providers"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Éviter les transactions non sécurisées" : "Avoid unsafe transactions"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Faire preuve de prudence lors des interactions avec d'autres utilisateurs" : "Use caution when interacting with others"}</span></li>
          </ul>
        </section>

        <section id="modifications">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "14. Modifications" : "14. Modifications"}
          </h2>
          <p>{isFr ? <>Nous pouvons modifier ces conditions <span className="font-semibold text-gray-900">à tout moment</span> <span className="font-semibold text-gray-900">sans préavis</span>. Nous vous encourageons à consulter régulièrement cette page.</> : <>We may modify these Terms <span className="font-semibold text-gray-900">at any time</span> <span className="font-semibold text-gray-900">without prior notice</span>. We encourage you to review this page regularly.</>}</p>
        </section>

        <section id="governing-law">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "15. Droit applicable" : "15. Governing Law"}
          </h2>
          <p className="mb-3">{isFr ? "Les présentes conditions sont régies par les lois de :" : "These Terms are governed by the laws of:"}</p>
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
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <p className="font-semibold text-gray-900">Uneden</p>
            <p className="text-gray-600">391 Sauvé Street, Repentigny, Quebec, Canada</p>
          </div>
        </section>

      </div>
    </div>
  );
}
