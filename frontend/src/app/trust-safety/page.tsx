"use client";
import { useTranslation } from "react-i18next";
import LegalSidebarNav from "@/components/legal/LegalSidebarNav";

const sections = [
  { id: "commitment", en: "1. Our Commitment", fr: "1. Notre engagement" },
  { id: "payments", en: "2. Secure Payments", fr: "2. Paiements sécurisés" },
  { id: "disputes", en: "3. Disputes & Resolution", fr: "3. Litiges et résolution" },
  { id: "reviews", en: "4. Reviews & Reputation", fr: "4. Avis et réputation" },
  { id: "responsibility", en: "5. User Responsibility", fr: "5. Responsabilité des utilisateurs" },
  { id: "location", en: "6. Location & Privacy", fr: "6. Localisation et confidentialité" },
  { id: "prohibited", en: "7. Prohibited Behavior", fr: "7. Comportements interdits" },
  { id: "reporting", en: "8. Reporting Issues", fr: "8. Signalement" },
  { id: "disclaimer", en: "9. Disclaimer", fr: "9. Limitation de responsabilité" },
  { id: "improvement", en: "10. Continuous Improvement", fr: "10. Amélioration continue" },
  { id: "contact", en: "11. Contact", fr: "11. Contact" },
];

export default function TrustSafetyPage() {
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
          {isFr ? "Confiance et sécurité" : "Trust & Safety"}
        </h1>
        <p className="text-gray-500 text-sm">{isFr ? "Dernière mise à jour : " : "Last Updated: "}<span className="font-semibold text-gray-900">{isFr ? "Mars 2026" : "March 2026"}</span></p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          {isFr
            ? "Chez Uneden, notre objectif est de créer une plateforme sûre et fiable où les utilisateurs peuvent se connecter, collaborer et réaliser des services en toute confiance."
            : "At Uneden, our goal is to create a safe and reliable platform where users can connect, collaborate, and complete services with confidence."}
        </p>
          </div>

          {/* Sections */}
          <div className="space-y-12 text-gray-700 text-sm leading-relaxed">

        <section id="commitment">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "1. Notre engagement" : "1. Our Commitment"}
          </h2>
          <p className="mb-3">{isFr ? "Uneden est conçu pour :" : "Uneden is designed to:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Fournir une plateforme sécurisée pour les transactions grâce à un système de séquestre" : "Provide a secure platform for transactions through an escrow payment system"}</li>
            <li>{isFr ? "Permettre des interactions transparentes via les profils, les avis et la messagerie" : "Enable transparent interactions via profiles, reviews, and messaging"}</li>
            <li>{isFr ? "Offrir un processus structuré de résolution des litiges" : "Offer a structured dispute resolution process"}</li>
          </ul>
          <p className="mt-3">{isFr ? "Nous nous engageons à améliorer continuellement la sécurité et la confiance sur notre plateforme." : "We are committed to continuously improving the safety and trust of our platform."}</p>
        </section>

        <section id="payments">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "2. Paiements sécurisés" : "2. Secure Payments"}
          </h2>
          <p className="mb-3">{isFr ? "Tous les paiements sont traités via la plateforme et conservés en sécurité jusqu'à la réalisation du service ou la résolution d'un litige." : "All payments are processed through the platform and held securely until the service is completed or a resolution is reached."}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Les paiements sont effectués à l'avance et conservés en séquestre" : "Payments are made in advance and held in escrow"}</li>
            <li>{isFr ? "Les fonds sont libérés une fois le service terminé ou après résolution d'un litige" : "Funds are released once the service is completed or after dispute resolution"}</li>
          </ul>
          <p className="mt-4 text-sm font-bold text-gray-900">
            {isFr
              ? "Nous déconseillons fortement aux utilisateurs d'effectuer des paiements en dehors de la plateforme."
              : "We strongly advise users not to make payments outside the platform."}
          </p>
        </section>

        <section id="disputes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "3. Litiges et résolution" : "3. Disputes & Resolution"}
          </h2>
          <p className="mb-3 text-gray-900">{isFr ? "En cas de problème :" : "If an issue arises:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Les utilisateurs disposent de <span className="font-semibold text-gray-900">3 jours</span> après la réalisation du service pour ouvrir un litige</> : <>Users have up to <span className="font-semibold text-gray-900">3 days</span> after service completion to open a dispute</>}</li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Les deux parties peuvent fournir des preuves (messages, photos, etc.)" : "Both parties may provide evidence (messages, photos, etc.)"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Uneden examine le dossier et détermine une issue" : "Uneden will review the case and determine an outcome"}</span></li>
          </ul>
          <p className="mt-3 text-gray-600">
            {isFr
              ? <>Des remboursements peuvent être accordés jusqu&apos;à <span className="font-semibold text-gray-900">50 %</span> du montant de la transaction, selon la situation.</>
              : <>Refunds may be issued up to <span className="font-semibold text-gray-900">50%</span> of the transaction amount, depending on the situation.</>}
          </p>
        </section>

        <section id="reviews">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "4. Avis et réputation" : "4. Reviews & Reputation"}
          </h2>
          <p className="mb-3">{isFr ? "La confiance se construit par la transparence :" : "Trust is built through transparency:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Les utilisateurs peuvent laisser des avis après chaque transaction" : "Users can leave reviews and ratings after each transaction"}</li>
            <li>{isFr ? "Les avis aident les autres à prendre des décisions éclairées" : "Reviews help others make informed decisions"}</li>
            <li>{isFr ? "Nous encourageons des retours honnêtes et respectueux" : "We encourage honest and respectful feedback"}</li>
          </ul>
        </section>

        <section id="responsibility">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "5. Responsabilité des utilisateurs" : "5. User Responsibility"}
          </h2>
          <p className="mb-3">{isFr ? "Pour garantir une expérience sûre, les utilisateurs devraient :" : "To ensure a safe experience, users should:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Examiner attentivement les profils, notes et travaux antérieurs avant de réserver" : "Carefully review profiles, ratings, and past work before booking"}</li>
            <li>{isFr ? "Communiquer clairement via la plateforme" : "Communicate clearly through the platform"}</li>
            <li>{isFr ? <>Éviter de partager des <span className="font-semibold text-gray-900">informations personnelles sensibles</span></> : <>Avoid sharing <span className="font-semibold text-gray-900">sensitive personal information</span></>}</li>
            <li>{isFr ? <>Faire preuve de prudence lors de <span className="font-semibold text-gray-900">rencontres en personne</span></> : <>Use caution when meeting someone <span className="font-semibold text-gray-900">in person</span></>}</li>
          </ul>
        </section>

        <section id="location">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "6. Localisation et confidentialité" : "6. Location & Privacy"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs peuvent choisir d'afficher :" : "Users may choose to display:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Leur localisation précise" : "Their precise location"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Ou une zone générale" : "Or a general area"}</span></li>
          </ul>
          <p className="mt-3">{isFr ? <>Nous recommandons d&apos;utiliser une <span className="font-semibold text-gray-900">localisation approximative</span> si vous préférez plus de confidentialité.</> : <>We recommend using an <span className="font-semibold text-gray-900">approximate location</span> if you prefer increased privacy.</>}</p>
        </section>

        <section id="prohibited">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "7. Comportements interdits" : "7. Prohibited Behavior"}
          </h2>
          <p className="mb-3">{isFr ? "Les comportements suivants sont strictement interdits :" : "The following behaviors are strictly prohibited:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Fraude, arnaques ou annonces trompeuses" : "Fraud, scams, or misleading listings"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Harcèlement, langage abusif ou menaces" : "Harassment, abusive language, or threats"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Contournement du système de paiement de la plateforme" : "Circumventing the platform's payment system"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Publication de faux avis ou usurpation d'identité" : "Posting false reviews or impersonating others"}</span></li>
          </ul>
          <p className="mt-3">{isFr ? <>Les violations peuvent entraîner la <span className="font-semibold text-gray-900">suspension</span> ou la <span className="font-semibold text-gray-900">suppression du compte</span>.</> : <>Violations may result in <span className="font-semibold text-gray-900">account suspension</span> or <span className="font-semibold text-gray-900">removal</span>.</>}</p>
        </section>

        <section id="reporting">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "8. Signalement" : "8. Reporting Issues"}
          </h2>
          <p className="mb-3">{isFr ? "Si vous rencontrez un comportement suspect ou dangereux :" : "If you encounter suspicious or unsafe behavior:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Signalez-le directement via la plateforme" : "Report it directly through the platform"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Fournissez autant de détails que possible" : "Provide as much detail as possible"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Notre équipe examinera les signalements et prendra les mesures appropriées" : "Our team will review reports and take appropriate action"}</span></li>
          </ul>
        </section>

        <section id="disclaimer">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "9. Limitation de responsabilité" : "9. Disclaimer"}
          </h2>
          <p className="mb-3">{isFr ? "Uneden est une plateforme qui met en relation des utilisateurs et ne fournit pas les services listés. Nous ne sommes pas responsables de :" : "Uneden is a platform that connects users and does not provide the services listed. We are not responsible for:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "La qualité ou le résultat des services" : "The quality or outcome of services"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "La conduite des utilisateurs" : "The conduct of users"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Tout dommage ou perte résultant des interactions" : "Any damages or losses resulting from interactions"}</span></li>
          </ul>
          <p className="mt-3 font-semibold text-gray-900">{isFr ? "Les utilisateurs interagissent entre eux à leurs propres risques." : "Users engage with each other at their own risk."}</p>
        </section>

        <section id="improvement">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "10. Amélioration continue" : "10. Continuous Improvement"}
          </h2>
          <p className="mb-3">{isFr ? "Nous nous engageons à améliorer les fonctionnalités de sécurité au fil du temps, notamment :" : "We are committed to improving safety features over time, including:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Des systèmes de vérification améliorés" : "Enhanced verification systems"}</li>
            <li>{isFr ? "De meilleurs outils de résolution des litiges" : "Better dispute resolution tools"}</li>
            <li>{isFr ? "Une détection améliorée des fraudes" : "Improved fraud detection"}</li>
          </ul>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "11. Contact" : "11. Contact"}
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
