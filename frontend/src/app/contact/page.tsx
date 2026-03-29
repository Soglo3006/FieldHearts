"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

const SUBJECTS_EN = [
  { value: "account", label: "Account issue" },
  { value: "payment", label: "Payment issue" },
  { value: "dispute", label: "Dispute" },
  { value: "listing", label: "Listing issue" },
  { value: "safety", label: "Safety report" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

const SUBJECTS_FR = [
  { value: "account", label: "Problème de compte" },
  { value: "payment", label: "Problème de paiement" },
  { value: "dispute", label: "Litige" },
  { value: "listing", label: "Problème d'annonce" },
  { value: "safety", label: "Signalement de sécurité" },
  { value: "partnership", label: "Partenariat" },
  { value: "other", label: "Autre" },
];

export default function ContactPage() {
  const { i18n } = useTranslation();
  const isFr = i18n.language === "fr";

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", subject: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: sbError } = await supabase.from("contact_submissions").insert({
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      subject: form.subject,
      message: form.message,
    });
    if (sbError) {
      setError(isFr ? "Une erreur est survenue. Veuillez réessayer." : "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  };

  const subjects = isFr ? SUBJECTS_FR : SUBJECTS_EN;

  const features = isFr ? [
    { title: "Services locaux au Canada", desc: "Nous connectons les gens de votre communauté avec des prestataires de services de confiance près de chez vous." },
    { title: "Paiements 100 % sécurisés", desc: "Votre argent est protégé jusqu'à la fin du travail grâce à notre système de séquestre." },
    { title: "Une communauté bienveillante", desc: "Des milliers de personnes utilisent Uneden pour trouver de l'aide et partager leurs compétences." },
  ] : [
    { title: "Local services across Canada", desc: "We connect people in your community with trusted local service providers right near you." },
    { title: "100% secure payments", desc: "Your money is protected until the job is done through our escrow payment system." },
    { title: "A trusted community", desc: "Thousands of people use Uneden to find help and share their skills every day." },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto border-2 border-green-700 rounded-2xl overflow-hidden shadow-sm bg-white grid grid-cols-1 lg:grid-cols-2">

        {/* Left panel */}
        <div className="bg-green-800 px-10 py-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-green-700">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              {isFr
                ? "Tout ce dont vous avez besoin pour trouver ou offrir des services locaux"
                : "Everything you need to find or offer local services"}
            </h1>
            <p className="text-green-200 text-sm mb-12 leading-relaxed">
              {isFr
                ? "Contactez notre équipe — nous sommes là pour vous aider et répondons généralement dans les 24–48 heures."
                : "Get in touch with our team — we're here to help and typically respond within 24–48 hours."}
            </p>

            <div className="space-y-8">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300 flex-shrink-0 mt-1.5" />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{f.title}</p>
                    <p className="text-green-200 text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-green-700">
            <p className="text-xs text-green-300 mb-1 font-medium">
              {isFr ? "Adresse" : "Address"}
            </p>
            <p className="text-green-100 text-sm">391 Sauvé Street, Repentigny, QC, Canada</p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="px-8 py-12 flex items-center justify-center bg-white">
          <div className="w-full max-w-lg">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isFr ? "Message envoyé !" : "Message sent!"}
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  {isFr
                    ? "Merci de nous avoir contactés. Nous vous répondrons dans les 24–48 heures."
                    : "Thanks for reaching out. We'll get back to you within 24–48 hours."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSubmitted(false); setForm({ firstName: "", lastName: "", email: "", subject: "", message: "" }); }}
                  className="cursor-pointer"
                >
                  {isFr ? "Envoyer un autre message" : "Send another message"}
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {isFr ? "Contactez-nous" : "Contact us"}
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  {isFr ? "Remplissez le formulaire et nous vous répondrons rapidement." : "Fill out the form and we'll get back to you shortly."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* First + Last name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">
                        {isFr ? "Prénom" : "First name"} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        required
                        placeholder={isFr ? "Jean" : "James"}
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">
                        {isFr ? "Nom" : "Last name"} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        required
                        placeholder={isFr ? "Dupont" : "Smith"}
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      {isFr ? "Adresse e-mail" : "Email address"} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder={isFr ? "jean@exemple.com" : "james@example.com"}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">
                      {isFr ? "Sujet" : "What's your inquiry about?"} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      required
                      value={form.subject}
                      onValueChange={(val) => setForm({ ...form, subject: val })}
                    >
                      <SelectTrigger id="subject" className="w-full">
                        <SelectValue placeholder={isFr ? "Choisir un sujet..." : "Please select..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="message">
                      {isFr ? "Comment pouvons-nous vous aider ?" : "How can we help you?"} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      required
                      rows={5}
                      placeholder={isFr
                        ? "Donnez-nous plus de détails sur votre question ou problème..."
                        : "Give us some more information on exactly what you're looking for..."}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 text-center">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !form.subject}
                    className="cursor-pointer w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 h-12"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (isFr ? "Nous contacter" : "Contact us")}
                  </Button>

                  <p className="text-xs text-gray-400 text-center">
                    {isFr ? (
                      <>En soumettant ce formulaire, vous acceptez notre <a href="/privacy-policy" className="text-green-600 hover:underline">politique de confidentialité</a>.</>
                    ) : (
                      <>By submitting this form you agree to our <a href="/privacy-policy" className="text-green-600 hover:underline">Privacy Policy</a>.</>
                    )}
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
