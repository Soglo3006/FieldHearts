import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { Category } from "./types";

  export const categories: Category[] = [
    { name: "Cleaning", subcategories: ["House cleaning","Deep cleaning","Office cleaning"], image: "/Categories/cleaning.jpg" },
    { name: "Moving", subcategories: ["Local moving","Transportation","Packing services"], image: "/Categories/moving.webp" },
    { name: "Home Repair", subcategories: ["Plumbing","Electrical work","General repair"], image: "/Categories/home_repair.jpg" },
    { name: "Tech Support", subcategories: ["Computer repair","Network setup","Software installation"], image: "/Categories/tech_support.webp" },
    { name: "Delivery & Errands", subcategories: ["Grocery delivery","Package delivery","Personal errands"], image: "/Categories/D_E.jpg" },
    { name: "Car Services", subcategories: ["Car wash","Oil change","Tire services"], image: "/Categories/car_support.avif" },
    { name: "Painting & Renovation", subcategories: ["Interior painting","Exterior painting","Renovation projects"], image: "/Categories/renovation.webp" },
    { name: "Landscaping / Gardening", subcategories: ["Lawn care","Garden design","Tree trimming"], image: "/Categories/gardening.webp" },
    { name: "Snow Removal", subcategories: ["Driveway clearing","Sidewalk clearing","Roof snow removal"], image: "/Categories/snow_removal.png" },
    { name: "Childcare & Babysitting", subcategories: ["Babysitting","After-school care","Full-time childcare"], image: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80" },
    { name: "Pet Care", subcategories: ["Dog walking","Pet sitting","Grooming"], image: "/Categories/petcaring.png" },
    { name: "Tutoring & Education", subcategories: ["Math & Science","Languages","Test preparation"], image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80" },
    { name: "Photography", subcategories: ["Event photography","Portrait photography","Real estate photography"], image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80" },
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

const legacyCategoryAliases: Record<string, string> = {
  jardinage: "landscaping_gardening",
  nettoyage: "cleaning",
  renovation: "painting_renovation",
  "garde_d_enfants": "childcare_babysitting",
  livraison: "delivery_errands",
  "support_technique": "tech_support",
  "services_automobiles": "car_services",
  "reparation_domicile": "home_repair",
  "amenagement_paysager": "landscaping_gardening",
};

const legacySubcategoryAliases: Record<string, { categoryKey: string; subcategoryKey: string }> = {
  "peinture_interieure": { categoryKey: "painting_renovation", subcategoryKey: "interior_painting" },
  "peinture_exterieure": { categoryKey: "painting_renovation", subcategoryKey: "exterior_painting" },
  "garde_d_enfants_a_domicile": { categoryKey: "childcare_babysitting", subcategoryKey: "babysitting" },
  "livraison_locale_rapide": { categoryKey: "delivery_errands", subcategoryKey: "package_delivery" },
  "nettoyage_residentiel": { categoryKey: "cleaning", subcategoryKey: "house_cleaning" },
  "nettoyage_residentiel_complet": { categoryKey: "cleaning", subcategoryKey: "house_cleaning" },
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

  return [translatedCategory, translatedSubcategory].filter(Boolean).join(" | ");
}

  