import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { Category } from "./types";

  export const categories: Category[] = [
    {
      name: "Home Services",
      subcategories: ["House Cleaning", "Deep Cleaning", "Office Cleaning", "Laundry / Ironing", "Home Organization"],
      image: "/Categories/cleaning.jpg",
    },
    {
      name: "Repairs & Maintenance",
      subcategories: ["Plumbing", "Electrical Work", "General Repairs", "Appliance Repair", "Handyman Services"],
      image: "/Categories/home_repair.jpg",
    },
    {
      name: "Renovation & Outdoor",
      subcategories: ["Interior Painting", "Exterior Painting", "Renovation Projects", "Lawn Care", "Garden Design", "Tree Trimming", "Snow Removal", "Driveway", "Sidewalk", "Roof"],
      image: "/Categories/renovation.webp",
    },
    {
      name: "Moving & Delivery",
      subcategories: ["Local Moving", "Packing Services", "Furniture Assembly", "Grocery Delivery", "Package Delivery", "Personal Errands"],
      image: "/Categories/moving.webp",
    },
    {
      name: "Automotive",
      subcategories: ["Car Wash", "Oil Change", "Tire Services", "Car Repair"],
      image: "/Categories/car_support.avif",
    },
    {
      name: "Tech & Digital Help",
      subcategories: ["Computer Repair", "Network Setup", "Software Installation", "Smart Home Setup"],
      image: "/Categories/tech_support.webp",
    },
    {
      name: "Personal & Care Services",
      subcategories: ["Babysitting", "After-school Care", "Full-time Childcare", "Pet Sitting", "Dog Walking", "Grooming"],
      image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&q=80",
    },
    {
      name: "Lessons & Creative Services",
      subcategories: ["Tutoring (Math, Science)", "Languages", "Test Preparation", "Event Photography", "Portrait Photography", "Real Estate Photography"],
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
    },
    {
      name: "Custom & Local Services",
      subcategories: ["Catering / Cooking", "Custom Cakes / Pastry", "Clothing / Tailoring", "Hair & Beauty", "Makeup Services"],
      image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80",
    },
  ];

export const toCategoryKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const localeCategoryMaps = [en.categories, fr.categories] as const;

const categoryKeyByLabel = new Map<string, string>();
const subcategoryMetaByLabel = new Map<string, { categoryKey: string; subcategoryKey: string }>();

// Legacy category aliases (old category keys → new category keys)
const legacyCategoryAliases: Record<string, string> = {
  // Old French aliases
  jardinage: "renovation_outdoor",
  nettoyage: "home_services",
  renovation: "renovation_outdoor",
  garde_d_enfants: "personal_care_services",
  livraison: "moving_delivery",
  support_technique: "tech_digital_help",
  services_automobiles: "automotive",
  reparation_domicile: "repairs_maintenance",
  amenagement_paysager: "renovation_outdoor",
  // Old English category keys
  cleaning: "home_services",
  moving: "moving_delivery",
  home_repair: "repairs_maintenance",
  tech_support: "tech_digital_help",
  delivery_errands: "moving_delivery",
  car_services: "automotive",
  painting_renovation: "renovation_outdoor",
  landscaping_gardening: "renovation_outdoor",
  snow_removal: "renovation_outdoor",
  childcare_babysitting: "personal_care_services",
  pet_care: "personal_care_services",
  tutoring_education: "lessons_creative_services",
  photography: "lessons_creative_services",
};

const legacySubcategoryAliases: Record<string, { categoryKey: string; subcategoryKey: string }> = {
  // Old French subcategory aliases
  peinture_interieure: { categoryKey: "renovation_outdoor", subcategoryKey: "interior_painting" },
  peinture_exterieure: { categoryKey: "renovation_outdoor", subcategoryKey: "exterior_painting" },
  garde_d_enfants_a_domicile: { categoryKey: "personal_care_services", subcategoryKey: "babysitting" },
  livraison_locale_rapide: { categoryKey: "moving_delivery", subcategoryKey: "package_delivery" },
  nettoyage_residentiel: { categoryKey: "home_services", subcategoryKey: "house_cleaning" },
  nettoyage_residentiel_complet: { categoryKey: "home_services", subcategoryKey: "house_cleaning" },
  // Old cleaning subcategories
  cleaning_house_cleaning: { categoryKey: "home_services", subcategoryKey: "house_cleaning" },
  cleaning_deep_cleaning: { categoryKey: "home_services", subcategoryKey: "deep_cleaning" },
  cleaning_office_cleaning: { categoryKey: "home_services", subcategoryKey: "office_cleaning" },
  // Old moving subcategories
  moving_local_moving: { categoryKey: "moving_delivery", subcategoryKey: "local_moving" },
  moving_transportation: { categoryKey: "moving_delivery", subcategoryKey: "local_moving" },
  moving_packing_services: { categoryKey: "moving_delivery", subcategoryKey: "packing_services" },
  // Old home repair subcategories
  home_repair_plumbing: { categoryKey: "repairs_maintenance", subcategoryKey: "plumbing" },
  home_repair_electrical_work: { categoryKey: "repairs_maintenance", subcategoryKey: "electrical_work" },
  home_repair_general_repair: { categoryKey: "repairs_maintenance", subcategoryKey: "general_repairs" },
  // Old tech support subcategories
  tech_support_computer_repair: { categoryKey: "tech_digital_help", subcategoryKey: "computer_repair" },
  tech_support_network_setup: { categoryKey: "tech_digital_help", subcategoryKey: "network_setup" },
  tech_support_software_installation: { categoryKey: "tech_digital_help", subcategoryKey: "software_installation" },
  // Old delivery subcategories
  delivery_errands_grocery_delivery: { categoryKey: "moving_delivery", subcategoryKey: "grocery_delivery" },
  delivery_errands_package_delivery: { categoryKey: "moving_delivery", subcategoryKey: "package_delivery" },
  delivery_errands_personal_errands: { categoryKey: "moving_delivery", subcategoryKey: "personal_errands" },
  // Old car services subcategories
  car_services_car_wash: { categoryKey: "automotive", subcategoryKey: "car_wash" },
  car_services_oil_change: { categoryKey: "automotive", subcategoryKey: "oil_change" },
  car_services_tire_services: { categoryKey: "automotive", subcategoryKey: "tire_services" },
  // Old painting/renovation subcategories
  painting_renovation_interior_painting: { categoryKey: "renovation_outdoor", subcategoryKey: "interior_painting" },
  painting_renovation_exterior_painting: { categoryKey: "renovation_outdoor", subcategoryKey: "exterior_painting" },
  painting_renovation_renovation_projects: { categoryKey: "renovation_outdoor", subcategoryKey: "renovation_projects" },
  // Old landscaping subcategories
  landscaping_gardening_lawn_care: { categoryKey: "renovation_outdoor", subcategoryKey: "lawn_care" },
  landscaping_gardening_garden_design: { categoryKey: "renovation_outdoor", subcategoryKey: "garden_design" },
  landscaping_gardening_tree_trimming: { categoryKey: "renovation_outdoor", subcategoryKey: "tree_trimming" },
  // Old snow removal subcategories
  snow_removal_driveway_clearing: { categoryKey: "renovation_outdoor", subcategoryKey: "driveway" },
  snow_removal_sidewalk_clearing: { categoryKey: "renovation_outdoor", subcategoryKey: "sidewalk" },
  snow_removal_roof_snow_removal: { categoryKey: "renovation_outdoor", subcategoryKey: "roof" },
  // Old childcare subcategories
  childcare_babysitting_babysitting: { categoryKey: "personal_care_services", subcategoryKey: "babysitting" },
  childcare_babysitting_after_school_care: { categoryKey: "personal_care_services", subcategoryKey: "after_school_care" },
  childcare_babysitting_full_time_childcare: { categoryKey: "personal_care_services", subcategoryKey: "full_time_childcare" },
  // Old pet care subcategories
  pet_care_dog_walking: { categoryKey: "personal_care_services", subcategoryKey: "dog_walking" },
  pet_care_pet_sitting: { categoryKey: "personal_care_services", subcategoryKey: "pet_sitting" },
  pet_care_grooming: { categoryKey: "personal_care_services", subcategoryKey: "grooming" },
  // Old tutoring subcategories
  tutoring_education_math_science: { categoryKey: "lessons_creative_services", subcategoryKey: "tutoring_math_science" },
  tutoring_education_languages: { categoryKey: "lessons_creative_services", subcategoryKey: "languages" },
  tutoring_education_test_preparation: { categoryKey: "lessons_creative_services", subcategoryKey: "test_preparation" },
  // Old photography subcategories
  photography_event_photography: { categoryKey: "lessons_creative_services", subcategoryKey: "event_photography" },
  photography_portrait_photography: { categoryKey: "lessons_creative_services", subcategoryKey: "portrait_photography" },
  photography_real_estate_photography: { categoryKey: "lessons_creative_services", subcategoryKey: "real_estate_photography" },
};

for (const category of categories) {
  const categoryKey = toCategoryKey(category.name);
  categoryKeyByLabel.set(categoryKey, categoryKey);
  categoryKeyByLabel.set(toCategoryKey(category.name), categoryKey);

  for (const localeCategories of localeCategoryMaps) {
    const localizedCategory = localeCategories[categoryKey as keyof typeof localeCategories];
    if (localizedCategory) {
      categoryKeyByLabel.set(toCategoryKey(localizedCategory), categoryKey);
    }
  }

  for (const subcategory of category.subcategories ?? []) {
    const subcategoryKey = toCategoryKey(subcategory);
    const meta = { categoryKey, subcategoryKey };
    subcategoryMetaByLabel.set(subcategoryKey, meta);

    for (const localeCategories of localeCategoryMaps) {
      const localizedSubcategory = localeCategories[`${categoryKey}_${subcategoryKey}` as keyof typeof localeCategories];
      if (localizedSubcategory) {
        subcategoryMetaByLabel.set(toCategoryKey(localizedSubcategory), meta);
      }
    }
  }
}

for (const [labelKey, categoryKey] of Object.entries(legacyCategoryAliases)) {
  categoryKeyByLabel.set(labelKey, categoryKey);
}

for (const [labelKey, meta] of Object.entries(legacySubcategoryAliases)) {
  subcategoryMetaByLabel.set(labelKey, meta);
}

function resolveCategoryKey(categoryName: string | null | undefined, subcategory: string | null | undefined) {
  const directCategoryKey = categoryName ? categoryKeyByLabel.get(toCategoryKey(categoryName)) : undefined;
  if (directCategoryKey) return directCategoryKey;

  const subcategoryMeta = subcategory ? subcategoryMetaByLabel.get(toCategoryKey(subcategory)) : undefined;
  if (subcategoryMeta) return subcategoryMeta.categoryKey;

  return undefined;
}

export function formatTranslatedCategoryTrail(
  categoryName: string | null | undefined,
  subcategory: string | null | undefined,
  t: (key: string, options?: { defaultValue?: string }) => string,
  separator = " | ",
) {
  const resolvedCategoryKey = resolveCategoryKey(categoryName, subcategory);

  const translatedCategory = resolvedCategoryKey
    ? t(`categories.${resolvedCategoryKey}`, { defaultValue: categoryName ?? resolvedCategoryKey })
    : null;

  const resolvedSubcategoryMeta = subcategory ? subcategoryMetaByLabel.get(toCategoryKey(subcategory)) : undefined;
  const translatedSubcategory = subcategory
    ? resolvedSubcategoryMeta && (!resolvedCategoryKey || resolvedSubcategoryMeta.categoryKey === resolvedCategoryKey)
      ? t(`categories.${resolvedSubcategoryMeta.categoryKey}_${resolvedSubcategoryMeta.subcategoryKey}`, { defaultValue: subcategory })
      : resolvedCategoryKey
        ? t(`categories.${resolvedCategoryKey}_${toCategoryKey(subcategory)}`, { defaultValue: subcategory })
      : subcategory
    : null;

  return [translatedCategory, translatedSubcategory].filter(Boolean).join(separator);
}


