"use client";
import { useTranslation } from "react-i18next";

const sections = [
  { id: "info-collect", label: "1. Information We Collect", labelFr: "1. Informations collectées" },
  { id: "how-use", label: "2. How We Use Your Information", labelFr: "2. Utilisation de vos informations" },
  { id: "sharing", label: "3. Sharing of Information", labelFr: "3. Partage des informations" },
  { id: "emails", label: "4. Emails & Communications", labelFr: "4. Emails et communications" },
  { id: "storage", label: "5. Data Storage & Security", labelFr: "5. Stockage et sécurité" },
  { id: "location", label: "6. Location Data", labelFr: "6. Données de localisation" },
  { id: "third-party", label: "7. Third-Party Services", labelFr: "7. Services tiers" },
  { id: "changes", label: "8. Changes to This Policy", labelFr: "8. Modifications de cette politique" },
  { id: "contact", label: "9. Contact", labelFr: "9. Contact" },
];

export default function PrivacyPolicyPage() {
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
          {isFr ? "Politique de confidentialité" : "Privacy Policy"}
        </h1>
        <p className="text-gray-500 text-sm">{isFr ? "Dernière mise à jour : " : "Last Updated: "}<span className="font-semibold text-gray-900">{isFr ? "Mars 2026" : "March 2026"}</span></p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          {isFr
            ? <>Uneden (« nous », « notre ») exploite une plateforme numérique qui met en relation les utilisateurs avec des prestataires de services locaux. Cette politique de confidentialité explique comment nous <span className="font-semibold text-gray-900">collectons</span>, <span className="font-semibold text-gray-900">utilisons</span>, <span className="font-semibold text-gray-900">stockons</span> et <span className="font-semibold text-gray-900">partageons</span> vos informations personnelles.</>
            : <>Uneden (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates a digital platform that connects users with local service providers. This Privacy Policy explains how we <span className="font-semibold text-gray-900">collect</span>, <span className="font-semibold text-gray-900">use</span>, <span className="font-semibold text-gray-900">store</span>, and <span className="font-semibold text-gray-900">share</span> your personal information.</>}
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
                {isFr ? s.labelFr : s.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 border-t border-gray-200" />
      </div>

      {/* Sections */}
      <div className="space-y-12 text-gray-700 text-sm leading-relaxed">

        <section id="info-collect">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "1. Informations collectées" : "1. Information We Collect"}
          </h2>
          <p className="mb-4">{isFr ? "Nous pouvons collecter les types d'informations suivants :" : "We may collect the following types of information:"}</p>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "a. Informations personnelles" : "a. Personal Information"}</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                <li>{isFr ? "Nom, adresse e-mail, informations de profil" : "Name, email address, profile information"}</li>
                <li>{isFr ? "Photo de profil, biographie, descriptions de services" : "Profile photo, biography, service descriptions"}</li>
                <li>{isFr ? "Données de localisation (précises ou approximatives, selon le choix de l'utilisateur)" : "Location data (precise or approximate, based on user choice)"}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "b. Données de compte et d'authentification" : "b. Account & Authentication Data"}</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                <li>{isFr ? "Identifiants de connexion" : "Login credentials"}</li>
                <li>{isFr ? "Données de connexion tierces (Google, Facebook)" : "Third-party login data (Google, Facebook)"}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "c. Données de transaction et financières" : "c. Transaction & Financial Data"}</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                <li>{isFr ? "Informations de paiement (traitées par des tiers comme Stripe)" : "Payment information (processed via third-party providers such as Stripe)"}</li>
                <li>{isFr ? "Soldes du portefeuille (approuvé, en attente, total)" : "Wallet balances (approved, pending, total)"}</li>
                <li>{isFr ? "Historique des transactions" : "Transaction history"}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "d. Données d'utilisation" : "d. Usage Data"}</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                <li>{isFr ? "Adresse IP" : "IP address"}</li>
                <li>{isFr ? "Informations sur l'appareil et le navigateur" : "Device and browser information"}</li>
                <li>{isFr ? "Pages visitées et interactions" : "Pages visited and interactions"}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{isFr ? "e. Cookies et technologies de suivi" : "e. Cookies & Tracking Technologies"}</h3>
              <p className="mb-2">{isFr ? "Nous utilisons des cookies et technologies similaires pour :" : "We use cookies and similar technologies to:"}</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                <li>{isFr ? "Améliorer l'expérience utilisateur" : "Improve user experience"}</li>
                <li>{isFr ? "Analyser l'utilisation" : "Analyze usage"}</li>
                <li>{isFr ? "Alimenter les algorithmes de recherche et de recommandation" : "Power search and recommendation algorithms"}</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="how-use">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "2. Utilisation de vos informations" : "2. How We Use Your Information"}
          </h2>
          <p className="mb-3">{isFr ? "Nous utilisons vos informations pour :" : "We use your information to:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Fournir et exploiter la plateforme" : "Provide and operate the platform"}</li>
            <li>{isFr ? "Mettre en relation les utilisateurs avec des services pertinents" : "Match users with relevant services"}</li>
            <li>{isFr ? "Traiter les paiements et gérer les portefeuilles" : "Process payments and manage wallets"}</li>
            <li>{isFr ? "Envoyer des notifications et des e-mails promotionnels" : "Send notifications and promotional emails"}</li>
            <li>{isFr ? "Améliorer nos services et algorithmes" : "Improve our services and algorithms"}</li>
            <li>{isFr ? "Prévenir la fraude et assurer la sécurité" : "Prevent fraud and ensure security"}</li>
          </ul>
        </section>

        <section id="sharing">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "3. Partage des informations" : "3. Sharing of Information"}
          </h2>
          <p className="mb-3">{isFr ? "Nous pouvons partager vos données avec :" : "We may share your data with:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Processeurs de paiement (ex. : Stripe)" : "Payment processors (e.g., Stripe)"}</li>
            <li>{isFr ? "Fournisseurs d'authentification (Google, Facebook)" : "Authentication providers (Google, Facebook)"}</li>
            <li>{isFr ? "Partenaires d'analyse et de publicité (ex. : Google Ads)" : "Analytics and advertising partners (e.g., Google Ads)"}</li>
            <li>{isFr ? "Autorités légales si requis" : "Legal authorities when required"}</li>
          </ul>
          <p className="mt-3">{isFr ? <>Nous pouvons également partager des données avec des <span className="font-semibold text-gray-900">tiers</span> à des fins commerciales ou opérationnelles.</> : <>We may also share data with <span className="font-semibold text-gray-900">third parties</span> for business or operational purposes.</>}</p>
        </section>

        <section id="emails">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "4. Emails et communications" : "4. Emails & Communications"}
          </h2>
          <p className="mb-3">{isFr ? "En utilisant Uneden, vous acceptez de recevoir :" : "By using Uneden, you agree to receive:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? "Notifications liées aux services" : "Service-related notifications"}</li>
            <li>{isFr ? "Mises à jour des transactions" : "Transaction updates"}</li>
            <li>{isFr ? "E-mails promotionnels" : "Promotional emails"}</li>
          </ul>
          <p className="mt-3">{isFr ? <>Vous pouvez vous désabonner des e-mails promotionnels <span className="font-semibold text-gray-900">à tout moment</span>.</> : <>You may unsubscribe from promotional emails <span className="font-semibold text-gray-900">at any time</span>.</>}</p>
        </section>

        <section id="storage">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "5. Stockage et sécurité des données" : "5. Data Storage & Security"}
          </h2>
          <p className="mb-3">{isFr ? "Nous prenons des mesures raisonnables pour protéger vos données. Cependant :" : "We take reasonable measures to protect your data. However:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>{isFr ? <>Aucun système n&apos;est sécurisé à <span className="font-semibold text-gray-900">100 %</span></> : <>No system is <span className="font-semibold text-gray-900">100% secure</span></>}</li>
            <li>{isFr ? <>Vous utilisez la plateforme <span className="font-semibold text-gray-900">à vos propres risques</span></> : <>You use the platform <span className="font-semibold text-gray-900">at your own risk</span></>}</li>
          </ul>
          <p className="mt-3">{isFr ? <>Vous pouvez demander la <span className="font-semibold text-gray-900">suppression de votre compte et de vos données</span> en nous contactant.</> : <>You may request <span className="font-semibold text-gray-900">deletion of your account and data</span> by contacting us.</>}</p>
        </section>

        <section id="location">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "6. Données de localisation" : "6. Location Data"}
          </h2>
          <p className="mb-3">{isFr ? "Les utilisateurs peuvent choisir d'afficher :" : "Users may choose to:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li><span className="font-semibold text-gray-900">{isFr ? "Leur localisation précise" : "Display precise location"}</span></li>
            <li><span className="font-semibold text-gray-900">{isFr ? "Une zone approximative" : "Display approximate area"}</span></li>
          </ul>
          <p className="mt-3">{isFr ? "Ces informations sont utilisées pour mettre en relation les services à proximité." : "This information is used for matching nearby services."}</p>
        </section>

        <section id="third-party">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "7. Services tiers" : "7. Third-Party Services"}
          </h2>
          <p className="mb-3">{isFr ? "Nous utilisons des services tiers notamment :" : "We use third-party services including:"}</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
            <li>Stripe ({isFr ? "paiements" : "payments"})</li>
            <li>Google / Facebook ({isFr ? "authentification" : "authentication"})</li>
            <li>Google Ads ({isFr ? "publicité" : "advertising"})</li>
            <li>Supabase ({isFr ? "base de données et stockage" : "database & storage"})</li>
            <li>Vercel ({isFr ? "hébergement" : "hosting"})</li>
          </ul>
          <p className="mt-3">{isFr ? <>Ces services ont leurs propres <span className="font-semibold text-gray-900">politiques de confidentialité</span>.</> : <>These services have their own <span className="font-semibold text-gray-900">privacy policies</span>.</>}</p>
        </section>

        <section id="changes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "8. Modifications de cette politique" : "8. Changes to This Policy"}
          </h2>
          <p>
            {isFr
              ? <>Nous nous réservons le droit de modifier cette politique de confidentialité <span className="font-semibold text-gray-900">à tout moment</span>, <span className="font-semibold text-gray-900">sans préavis</span>. Nous vous encourageons à consulter régulièrement cette page pour rester informé des mises à jour.</>
              : <>We reserve the right to modify this Privacy Policy <span className="font-semibold text-gray-900">at any time</span>, <span className="font-semibold text-gray-900">without prior notice</span>. We encourage you to review this page periodically to stay informed of any updates.</>}
          </p>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isFr ? "9. Contact" : "9. Contact"}
          </h2>
          <p className="mb-3">{isFr ? "Pour toute question concernant cette politique, contactez-nous :" : "For any questions regarding this policy, contact us:"}</p>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">Uneden</p>
            <p className="font-semibold text-gray-900">391 Sauvé Street, Repentigny, Quebec, Canada</p>
          </div>
        </section>

        </div>
    </div>
  );
}
