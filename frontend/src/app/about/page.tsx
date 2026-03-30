"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { value: "Canada", labelEn: "Based in", labelFr: "Basé au" },
  { value: "2025", labelEn: "Founded", labelFr: "Fondé en" },
  { value: "QC", labelEn: "Home province", labelFr: "Province d'origine" },
];

export default function AboutPage() {
  const { i18n } = useTranslation();
  const { session, loading } = useAuth();
  const isFr = i18n.language === "fr";
  const [expandedBios, setExpandedBios] = useState({
    georges: false,
    alexandre: false,
  });

  const georgesBio = isFr
    ? "Georges Rychel Moung est le co-fondateur, Président et CEO d'Uneden, animé par une passion profonde pour la technologie et son potentiel à transformer le quotidien. Après avoir obtenu un diplôme d'études collégiales en génie logiciel, il a poursuivi ses études en informatique, développant à la fois une expertise technique et une solide compréhension du marché du travail en évolution. C'est au cours de ce parcours qu'il a constaté un fossé croissant : alors que le travail indépendant numérique se développait à l'échelle mondiale, de nombreuses compétences pratiques essentielles restaient exclues de ces opportunités. Avec Uneden, sa mission est de connecter les communautés à de véritables opportunités, en commençant par le Canada."
    : "Georges Rychel Moung is the co-founder, President, and CEO of Uneden, driven by a deep passion for technology and its potential to transform everyday life. After earning his associate degree in software engineering, he continued his studies in computer science, developing both technical insight and a strong understanding of the evolving job market. It was during this journey that he noticed a growing gap: while digital freelancing was expanding globally, many essential, hands-on skills remained excluded from these opportunities. With Uneden, his mission is to empower communities by connecting people to real opportunities, starting in Canada.";
  const alexandreBio = isFr
    ? "Alexandre Soglo Booh Louha est le co-fondateur et Directeur Technique d'Uneden, technologiste passionné avec une solide formation en informatique de l'Université de Montréal. Dès le départ, il a démontré à la fois une excellence technique et un esprit entrepreneurial, toujours animé par l'ambition de construire des solutions à fort impact. En tant que force technique derrière Uneden, Alexandre a conçu et développé la plateforme de A à Z, transformant une vision en réalité. Si Georges a posé les fondations et la direction du projet, Alexandre en a construit l'architecture qui lui donne vie. Ensemble, ils forment un duo complémentaire, alliant stratégie et exécution pour bâtir une plateforme évolutive et innovante pour l'avenir du travail local."
    : "Alexandre Soglo Booh Louha is the co-founder and Chief Technology Officer of Uneden, a passionate technologist with a strong academic background in computer science from the Université de Montréal. From an early stage, he demonstrated both technical excellence and an entrepreneurial mindset, always driven by the ambition to build impactful solutions. As the technical force behind Uneden, Alexandre designed and developed the platform from the ground up, turning vision into reality. If Georges laid the foundation and direction of the project, Alexandre engineered the structure that brings it to life. Together, they form a complementary partnership — combining strategy and execution to build a scalable and innovative platform for the future of local work.";

  const toggleBio = (person: "georges" | "alexandre") => {
    setExpandedBios((current) => ({
      ...current,
      [person]: !current[person],
    }));
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="relative min-h-105 overflow-hidden px-4 py-20 text-center sm:py-24">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?q=80&w=1800&auto=format&fit=crop"
            alt={isFr ? "Travailleur avec une perceuse et un casque" : "Worker with a drill and hard hat"}
            fill
            priority
            quality={90}
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-green-800/65" />
        <div className="absolute inset-0 bg-linear-to-b from-green-900/20 via-green-900/35 to-green-900/55" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-4">
            {isFr ? "À propos de nous" : "About us"}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white max-w-3xl mx-auto leading-tight mb-6">
            {isFr
              ? "Chacun a une compétence. Chacun peut gagner sa vie."
              : "Everyone has a skill. Everyone can earn."}
          </h1>
          <p className="text-green-100 text-base max-w-2xl mx-auto">
            {isFr
              ? "Nous connectons les personnes qui ont besoin d'aide avec celles qui ont les compétences pour l'offrir, dans un espace local, sécurisé et équitable."
              : "We connect people who need help with people who have the skills to offer it, in a local, safe, and fair environment."}
          </p>
          <p className="text-green-200 text-sm max-w-2xl mx-auto mt-4 font-medium">
            {isFr
              ? "Une place de marché communautaire où chacun peut offrir ou trouver des services locaux facilement et en confiance."
              : "A community-powered marketplace where anyone can offer or hire local services safely and easily."}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-green-800">
        <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-3 divide-x divide-green-700">
          {stats.map((s) => (
            <div key={s.value} className="text-center px-4">
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-green-300 text-xs mt-0.5">{isFr ? s.labelFr : s.labelEn}</p>
            </div>
          ))}
        </div>
      </div>

        {/* Mission section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              titleEn: "Our Mission",
              titleFr: "Notre mission",
              textEn: "Empower every community by making local services accessible, safe, and fair for everyone.",
              textFr: "Donner du pouvoir à chaque communauté en rendant les services locaux accessibles, sécuritaires et équitables.",
            },
            {
              titleEn: "Our Community",
              titleFr: "Notre communauté",
              textEn: "A trusted space with transparent reviews, secure escrow payments, and location-based matching.",
              textFr: "Un espace de confiance avec des avis transparents, des paiements séquestrés sécurisés et un jumelage local.",
            },
            {
              titleEn: "Our Vision",
              titleFr: "Notre vision",
              textEn: "Strengthen local economies, build mutual trust, and make meaningful work available to all.",
              textFr: "Renforcer les économies locales, nourrir la confiance mutuelle et rendre le travail utile accessible à tous.",
            },
          ].map((item) => (
            <div
              key={item.titleEn}
              className="relative overflow-hidden rounded-2xl border border-green-100/80 bg-linear-to-b from-white to-green-50/50 p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-green-100/70"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-green-600/60" />
              <h3 className="font-bold text-gray-900 text-xl mb-3 text-center">{isFr ? item.titleFr : item.titleEn}</h3>
              <div className="h-px w-14 bg-green-200 mb-4 mx-auto" />
              <p className="text-gray-600 text-sm leading-relaxed">{isFr ? item.textFr : item.textEn}</p>
            </div>
          ))}
          </div>
        </div>

        {/* Paragraph 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-12 mb-20">
          <div className="lg:w-1/2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isFr ? "Qui sommes-nous ?" : "Who we are"}
            </h2>
            <div className="h-px w-14 bg-green-200 mb-5" />
            <p className="text-gray-600 leading-relaxed">
              {isFr
                ? "Uneden est une plateforme canadienne fièrement basée au Québec, construite avec la vision de connecter les gens à travers de vraies compétences et un travail significatif. Nous croyons que chacun a quelque chose de précieux à offrir, et notre mission est de faciliter la recherche d'opportunités, le soutien aux communautés locales et la création de son propre chemin vers la réussite."
                : "Uneden is a Canadian platform proudly based in Quebec, built with the vision of connecting people through real skills and meaningful work. We believe that everyone has something valuable to offer, and our mission is to make it easier for individuals to find opportunities, support their local communities, and create their own path to earning."}
            </p>
          </div>
          <div className="lg:w-1/2 w-full">
            <div className="rounded-2xl overflow-hidden bg-green-50 aspect-video flex items-center justify-center border border-green-100">
              <img
                src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=800&q=80"
                alt="Uneden team"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Paragraph 2 */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12 mb-24">
          <div className="lg:w-1/2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 lg:text-right">
              {isFr ? "Ce qui nous anime" : "What drives us"}
            </h2>
            <div className="h-px w-14 bg-green-200 mb-5 lg:ml-auto" />
            <p className="text-gray-600 leading-relaxed">
              {isFr
                ? "En réunissant clients et prestataires dans un espace de confiance, Uneden libère le potentiel des talents locaux et de l'expertise du quotidien. Nous sommes portés par l'idée que le travail doit être accessible, flexible et équitable — en donnant aux gens de tout le Canada les moyens de grandir, de collaborer et de construire des communautés plus solides ensemble."
                : "By bringing together clients and service providers in one trusted space, Uneden helps unlock the power of local talent and everyday expertise. We are driven by the idea that work should be accessible, flexible, and fair — by empowering people across Canada to grow, collaborate, and build stronger communities together."}
            </p>
          </div>
          <div className="lg:w-1/2 w-full">
            <div className="rounded-2xl overflow-hidden aspect-video">
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80"
                alt="Local community"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Team section */}
        <div className="border-t border-gray-100 pt-16">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-2">
            {isFr ? "L'équipe fondatrice" : "The founding team"}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {isFr ? "Les visages derrière Uneden" : "The faces behind Uneden"}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* Georges */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
              <div className="relative aspect-4/3 overflow-hidden bg-gray-200">
                {/* Replace with: <img src="/team/georges.jpg" ... /> once photo is added */}
                <div className="w-full h-full flex items-center justify-center bg-green-900/10">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-green-200 mx-auto mb-3 flex items-center justify-center text-4xl">
                      GR
                    </div>
                    <p className="text-xs text-gray-400">{isFr ? "Photo à venir" : "Photo coming soon"}</p>
                  </div>
                </div>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-bold text-gray-900">Georges Rychel Moung</h3>
                <p className="text-green-700 text-sm font-semibold mt-0.5 mb-4">
                  {isFr ? "Co-fondateur, Président & CEO" : "Co-founder, President & CEO"}
                </p>
                <p className={`text-gray-600 text-sm leading-relaxed ${expandedBios.georges ? "" : "line-clamp-6"}`}>
                  {georgesBio}
                </p>
                <button
                  type="button"
                  onClick={() => toggleBio("georges")}
                  className="mt-4 text-sm font-semibold text-green-700 transition-colors hover:text-green-800"
                >
                  {expandedBios.georges
                    ? (isFr ? "Voir moins" : "Show less")
                    : (isFr ? "Lire plus" : "Read more")}
                </button>
              </div>
            </div>

            {/* Alexandre */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
              <div className="relative aspect-4/3 overflow-hidden bg-gray-200">
                <img
                  src="/team/alexandre.jpg"
                  alt="Alexandre Soglo Booh Louha"
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    t.nextElementSibling?.removeAttribute("style");
                  }}
                />
                <div className="w-full h-full absolute inset-0 hidden items-center justify-center bg-green-900/10">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-green-200 mx-auto mb-3 flex items-center justify-center text-4xl">
                      AB
                    </div>
                    <p className="text-xs text-gray-400">{isFr ? "Photo à venir" : "Photo coming soon"}</p>
                  </div>
                </div>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-bold text-gray-900">Alexandre Soglo Booh Louha</h3>
                <p className="text-green-700 text-sm font-semibold mt-0.5 mb-4">
                  {isFr ? "Co-fondateur & Directeur Technique (CTO)" : "Co-founder & Chief Technology Officer"}
                </p>
                <p className={`text-gray-600 text-sm leading-relaxed ${expandedBios.alexandre ? "" : "line-clamp-6"}`}>
                  {alexandreBio}
                </p>
                <button
                  type="button"
                  onClick={() => toggleBio("alexandre")}
                  className="mt-4 text-sm font-semibold text-green-700 transition-colors hover:text-green-800"
                >
                  {expandedBios.alexandre
                    ? (isFr ? "Voir moins" : "Show less")
                    : (isFr ? "Lire plus" : "Read more")}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom CTA */}
        {!loading && !session && (
          <div className="mt-20 bg-green-900 rounded-2xl p-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              {isFr ? "Prêt à rejoindre la communauté ?" : "Ready to join the community?"}
            </h3>
            <p className="text-green-200 text-sm mb-6 max-w-md mx-auto">
              {isFr
                ? "Que vous cherchiez de l'aide ou que vous ayez des compétences à offrir, Uneden est fait pour vous."
                : "Whether you're looking for help or have skills to offer, Uneden is built for you."}
            </p>
            <a
              href="/register"
              className="inline-block bg-white text-green-900 font-semibold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors"
            >
              {isFr ? "Commencer maintenant" : "Get started"}
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
