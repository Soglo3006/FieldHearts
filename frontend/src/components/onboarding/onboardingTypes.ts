export interface Language {
  id: number;
  language: string;
  proficiency: string;
}

export interface Experience {
  id: number;
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface PortfolioItem {
  id: number;
  image: string;
  title: string;
  description: string;
}

export interface OnboardingData {
  accountType: "" | "person" | "company";
  avatar: string;
  email: string;
  phone: string;
  adresse: string;
  ville: string;
  province: string;
  fullName?: string;
  profession?: string;
  bio?: string;
  skills?: string[];
  languages?: Language[];
  experiences?: Experience[];
  companyName?: string;
  industry?: string;
  companyBio?: string;
  teamSize?: string;
  portfolio: PortfolioItem[];
}

export const languageOptions = [
  "English", "French", "Spanish", "Arabic", "Mandarin",
  "Portuguese", "German", "Italian", "Japanese", "Korean", "Hindi", "Russian",
];

export const proficiencyOptions = ["Basic", "Conversational", "Fluent", "Native"];

export const professionSuggestions: Record<string, string[]> = {
  en: [
    "Electrician", "Plumber", "Carpenter", "House Cleaner", "Math Tutor",
    "English Tutor", "French Tutor", "Personal Trainer", "Graphic Designer", "Web Developer",
    "Photographer", "Videographer", "Painter", "Landscaper", "Handyman",
    "HVAC Technician", "Mechanic", "Dog Walker", "Pet Sitter", "Babysitter",
    "Chef", "Massage Therapist", "Yoga Instructor", "Music Teacher",
    "Piano Teacher", "Guitar Teacher",
  ],
  fr: [
    "Électricien", "Plombier", "Charpentier", "Agent de nettoyage", "Tuteur en maths",
    "Tuteur en anglais", "Tuteur en français", "Entraîneur personnel", "Graphiste", "Développeur web",
    "Photographe", "Vidéaste", "Peintre", "Paysagiste", "Homme à tout faire",
    "Technicien CVC", "Mécanicien", "Promeneur de chiens", "Gardien d'animaux", "Gardienne d'enfants",
    "Chef cuisinier", "Massothérapeute", "Instructeur de yoga", "Professeur de musique",
    "Professeur de piano", "Professeur de guitare",
  ],
};

export const skillSuggestions: Record<string, string[]> = {
  en: [
    "Electrical Work", "Plumbing", "Carpentry", "House Cleaning", "Deep Cleaning",
    "Tutoring", "Math", "English", "French", "Personal Training", "Graphic Design",
    "Web Development", "Photography", "Video Editing", "Painting", "Landscaping",
    "Garden Maintenance", "Home Repairs", "HVAC Repair", "Auto Repair", "Dog Training",
    "Pet Care", "Child Care", "Cooking", "Massage", "Yoga", "Piano", "Guitar",
    "Microsoft Office", "Adobe Photoshop", "Customer Service",
  ],
  fr: [
    "Travaux électriques", "Plomberie", "Menuiserie", "Nettoyage résidentiel", "Nettoyage en profondeur",
    "Tutorat", "Mathématiques", "Anglais", "Français", "Entraînement personnel", "Design graphique",
    "Développement web", "Photographie", "Montage vidéo", "Peinture", "Aménagement paysager",
    "Entretien de jardin", "Réparations domiciliaires", "Réparation CVC", "Réparation automobile", "Dressage de chiens",
    "Soins aux animaux", "Garde d'enfants", "Cuisine", "Massage", "Yoga", "Piano", "Guitare",
    "Microsoft Office", "Adobe Photoshop", "Service à la clientèle",
  ],
};

export const serviceSuggestions: Record<string, string[]> = {
  en: [
    "Residential Cleaning", "Commercial Cleaning", "Deep Cleaning",
    "Electrical Services", "Electrical Repair", "Electrical Installation",
    "Plumbing Services", "Plumbing Repair", "Drain Cleaning",
    "Construction", "Home Renovation", "Kitchen Renovation", "Bathroom Renovation",
    "Roofing", "HVAC Services", "Heating & Cooling", "Landscaping Services",
    "Lawn Care", "Snow Removal", "Moving Services", "Pest Control",
    "Painting Services", "Interior Painting", "Exterior Painting",
    "Carpet Cleaning", "Window Cleaning", "Pressure Washing",
    "Web Design", "Digital Marketing", "SEO Services", "Catering", "Event Planning",
  ],
  fr: [
    "Nettoyage résidentiel", "Nettoyage commercial", "Nettoyage en profondeur",
    "Services électriques", "Réparation électrique", "Installation électrique",
    "Services de plomberie", "Réparation de plomberie", "Débouchage de drain",
    "Construction", "Rénovation domiciliaire", "Rénovation de cuisine", "Rénovation de salle de bain",
    "Toiture", "Services CVC", "Chauffage et climatisation", "Services d'aménagement paysager",
    "Entretien de pelouse", "Déneigement", "Services de déménagement", "Extermination",
    "Services de peinture", "Peinture intérieure", "Peinture extérieure",
    "Nettoyage de tapis", "Nettoyage de vitres", "Lavage sous pression",
    "Design web", "Marketing numérique", "Services SEO", "Traiteur", "Organisation d'événements",
  ],
};
