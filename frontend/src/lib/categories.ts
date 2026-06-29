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
      name: "Digital Products",
      subcategories: [
        "Video Editing",
        "3D Modeling",
        "Digital Marketing",
        "Graphic Design",
        "Web Development",
        "Social Media Management",
        "Photo Retouching",
        "Animation",
        "UI/UX Design",
        "SEO Services",
        "App Development",
        "Copywriting",
        "Brand Identity",
      ],
      image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&q=80",
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
    {
      name: "Other",
      subcategories: [],
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80",
    },
  ];

export const OTHER_CATEGORY_NAME = "Other";
export const MAX_LISTING_TAGS = 5;

/** All preset subcategory labels across every main category (English canonical). */
export function getAllPresetListingTags(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    for (const sub of cat.subcategories ?? []) {
      const key = toCategoryKey(sub);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(sub);
      }
    }
  }
  return out;
}

export function isPresetListingTag(tag: string): boolean {
  const key = toCategoryKey(tag);
  return getAllPresetListingTags().some((preset) => toCategoryKey(preset) === key);
}

export function getTagSuggestions(query: string, categoryName: string, selected: string[]): string[] {
  const q = normalizeTagSearchText(query);
  const selectedKeys = new Set(selected.map((t) => toCategoryKey(t)));
  const categoryKey = categoryKeyByLabel.get(toCategoryKey(categoryName));
  const categoryCat = categories.find(
    (c) => c.name === categoryName || toCategoryKey(c.name) === categoryKey,
  );
  const categorySubs = categoryCat?.subcategories ?? [];
  const allPresets = getAllPresetListingTags();

  const matches: string[] = [];
  const seen = new Set<string>();

  const tryAdd = (tag: string) => {
    const key = toCategoryKey(tag);
    if (selectedKeys.has(key) || seen.has(key)) return;
    const searchTexts = getListingTagSearchTexts(tag);
    const matchesQuery =
      !q || searchTexts.some((text) => normalizeTagSearchText(text).includes(q));
    if (!matchesQuery) return;
    seen.add(key);
    matches.push(tag);
  };

  for (const tag of categorySubs) {
    tryAdd(tag);
    if (matches.length >= 12) break;
  }
  for (const tag of allPresets) {
    if (matches.length >= 12) break;
    tryAdd(tag);
  }

  return matches;
}

function normalizeTagSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getListingTagSearchTexts(tag: string): string[] {
  const texts = new Set<string>();
  const add = (value: string | undefined | null) => {
    const trimmed = value?.trim();
    if (trimmed) texts.add(trimmed);
  };

  add(tag);
  add(toCategoryKey(tag).replace(/_/g, " "));

  const tagKey = toCategoryKey(tag);
  const meta = subcategoryMetaByLabel.get(tagKey);
  const localeKeys = new Set<string>();

  for (const cat of categories) {
    localeKeys.add(`${toCategoryKey(cat.name)}_${tagKey}`);
  }
  if (meta) {
    localeKeys.add(`${meta.categoryKey}_${meta.subcategoryKey}`);
  }

  for (const key of localeKeys) {
    for (const localeCategories of localeCategoryMaps) {
      const localized = localeCategories[key as keyof typeof localeCategories];
      if (typeof localized === "string") add(localized);
    }
  }

  return [...texts];
}

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
  repair_and_maintenance: "repairs_maintenance",
  repairs_and_maintenance: "repairs_maintenance",
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
  home_repair_appliance_repair: { categoryKey: "repairs_maintenance", subcategoryKey: "appliance_repair" },
  home_repair_handyman_services: { categoryKey: "repairs_maintenance", subcategoryKey: "handyman_services" },
  general_repairs: { categoryKey: "repairs_maintenance", subcategoryKey: "general_repairs" },
  appliance_repair: { categoryKey: "repairs_maintenance", subcategoryKey: "appliance_repair" },
  handyman_services: { categoryKey: "repairs_maintenance", subcategoryKey: "handyman_services" },
  plumbing: { categoryKey: "repairs_maintenance", subcategoryKey: "plumbing" },
  electrical_work: { categoryKey: "repairs_maintenance", subcategoryKey: "electrical_work" },
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

const presetTagGlobalOrderIndex = new Map<string, number>();
let presetTagOrder = 0;

for (const category of categories) {
  const categoryKey = toCategoryKey(category.name);

  for (const subcategory of category.subcategories ?? []) {
    const subcategoryKey = toCategoryKey(subcategory);
    if (!presetTagGlobalOrderIndex.has(subcategoryKey)) {
      presetTagGlobalOrderIndex.set(subcategoryKey, presetTagOrder++);
    }

    for (const localeCategories of localeCategoryMaps) {
      const localizedSubcategory = localeCategories[
        `${categoryKey}_${subcategoryKey}` as keyof typeof localeCategories
      ];
      if (localizedSubcategory) {
        const localizedKey = toCategoryKey(localizedSubcategory);
        if (!presetTagGlobalOrderIndex.has(localizedKey)) {
          presetTagGlobalOrderIndex.set(
            localizedKey,
            presetTagGlobalOrderIndex.get(subcategoryKey)!,
          );
        }
      }
    }
  }
}

function getCategorySubcategoryOrderIndex(tag: string, categoryKey: string): number | null {
  const cat = categories.find((c) => toCategoryKey(c.name) === categoryKey);
  if (!cat) return null;

  const tagKey = toCategoryKey(tag);
  const meta = subcategoryMetaByLabel.get(tagKey);

  for (let i = 0; i < (cat.subcategories ?? []).length; i++) {
    const subKey = toCategoryKey(cat.subcategories![i]);
    if (tagKey === subKey) return i;
    if (meta?.categoryKey === categoryKey && meta.subcategoryKey === subKey) return i;
  }

  return null;
}

function getTagSortIndex(tag: string, resolvedCategoryKey?: string): number {
  if (resolvedCategoryKey) {
    const localIdx = getCategorySubcategoryOrderIndex(tag, resolvedCategoryKey);
    if (localIdx !== null) return localIdx;
  }

  const tagKey = toCategoryKey(tag);
  const globalIdx = presetTagGlobalOrderIndex.get(tagKey);
  if (globalIdx !== undefined) return globalIdx;

  const meta = subcategoryMetaByLabel.get(tagKey);
  if (meta) {
    const metaGlobalIdx = presetTagGlobalOrderIndex.get(meta.subcategoryKey);
    if (metaGlobalIdx !== undefined) return metaGlobalIdx;
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortTagsByCategoryNavOrder(tags: string[], resolvedCategoryKey?: string): string[] {
  return [...tags].sort((a, b) => {
    const indexDiff = getTagSortIndex(a, resolvedCategoryKey) - getTagSortIndex(b, resolvedCategoryKey);
    if (indexDiff !== 0) return indexDiff;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

function resolveCategoryKey(categoryName: string | null | undefined, subcategory: string | null | undefined) {
  const directCategoryKey = categoryName ? categoryKeyByLabel.get(toCategoryKey(categoryName)) : undefined;
  if (directCategoryKey) return directCategoryKey;

  const subcategoryMeta = subcategory ? subcategoryMetaByLabel.get(toCategoryKey(subcategory)) : undefined;
  if (subcategoryMeta) return subcategoryMeta.categoryKey;

  return undefined;
}

export function translateListingTag(
  tag: string,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const tagKey = toCategoryKey(tag);
  for (const cat of categories) {
    const catKey = toCategoryKey(cat.name);
    const translated = t(`categories.${catKey}_${tagKey}`, { defaultValue: "" });
    if (translated) return translated;
  }
  return tag;
}

export function formatTranslatedCategoryTrail(
  categoryName: string | null | undefined,
  subcategory: string | null | undefined,
  t: (key: string, options?: { defaultValue?: string }) => string,
  separator = " | ",
) {
  const tags = subcategory
    ? subcategory.split(/\s*[·|]\s*|\s*,\s*/).map((s) => s.trim()).filter(Boolean)
    : [];
  return formatListingTagsDisplay(categoryName, tags.length ? tags : null, subcategory, t, separator);
}

export function formatListingTagsDisplay(
  categoryName: string | null | undefined,
  tags: string[] | null | undefined,
  subcategoryFallback: string | null | undefined,
  t: (key: string, options?: { defaultValue?: string }) => string,
  separator = " · ",
) {
  const tagList =
    tags && tags.length > 0
      ? tags
      : subcategoryFallback
        ? subcategoryFallback.split(/\s*[·|]\s*|\s*,\s*/).map((s) => s.trim()).filter(Boolean)
        : [];

  const resolvedCategoryKey = resolveCategoryKey(categoryName, tagList[0]);
  const sortedTagList = sortTagsByCategoryNavOrder(tagList, resolvedCategoryKey);
  const translatedCategory = resolvedCategoryKey
    ? t(`categories.${resolvedCategoryKey}`, { defaultValue: categoryName ?? resolvedCategoryKey })
    : categoryName ?? null;

  const translatedTags = sortedTagList.map((tag) => {
    const resolvedSubcategoryMeta = subcategoryMetaByLabel.get(toCategoryKey(tag));
    if (resolvedSubcategoryMeta && (!resolvedCategoryKey || resolvedSubcategoryMeta.categoryKey === resolvedCategoryKey)) {
      return t(
        `categories.${resolvedSubcategoryMeta.categoryKey}_${resolvedSubcategoryMeta.subcategoryKey}`,
        { defaultValue: tag },
      );
    }
    if (resolvedCategoryKey) {
      return t(`categories.${resolvedCategoryKey}_${toCategoryKey(tag)}`, { defaultValue: tag });
    }
    return tag;
  });

  return [translatedCategory, ...translatedTags].filter(Boolean).join(separator);
}


