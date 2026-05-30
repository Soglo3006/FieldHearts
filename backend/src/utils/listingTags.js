import { sanitizeText } from "./validate.js";

/** Preset tag labels (English canonical names from frontend categories.ts). */
export const PRESET_LISTING_TAGS = new Set(
  [
    "House Cleaning", "Deep Cleaning", "Office Cleaning", "Laundry / Ironing", "Home Organization",
    "Plumbing", "Electrical Work", "General Repairs", "Appliance Repair", "Handyman Services",
    "Interior Painting", "Exterior Painting", "Renovation Projects", "Lawn Care", "Garden Design",
    "Tree Trimming", "Snow Removal", "Driveway", "Sidewalk", "Roof",
    "Local Moving", "Packing Services", "Furniture Assembly", "Grocery Delivery", "Package Delivery", "Personal Errands",
    "Car Wash", "Oil Change", "Tire Services", "Car Repair",
    "Computer Repair", "Network Setup", "Software Installation", "Smart Home Setup",
    "Babysitting", "After-school Care", "Full-time Childcare", "Pet Sitting", "Dog Walking", "Grooming",
    "Tutoring (Math, Science)", "Languages", "Test Preparation", "Event Photography", "Portrait Photography", "Real Estate Photography",
    "Catering / Cooking", "Custom Cakes / Pastry", "Clothing / Tailoring", "Hair & Beauty", "Makeup Services",
    "Video Editing", "3D Modeling", "Digital Marketing", "Graphic Design", "Web Development",
    "Social Media Management", "Photo Retouching", "Animation", "UI/UX Design", "SEO Services",
    "App Development", "Copywriting", "Brand Identity",
  ].map(normalizeTagKey),
);

export const OTHER_CATEGORY_NAME = "Other";
export const MAX_LISTING_TAGS = 5;

export function normalizeTagKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isPresetListingTag(tag) {
  return PRESET_LISTING_TAGS.has(normalizeTagKey(tag));
}

export function normalizeListingTags(body) {
  const raw = body.listing_tags ?? body.tags ?? null;
  let tags = [];

  if (Array.isArray(raw)) {
    tags = raw.map((item) => sanitizeText(String(item ?? "")).trim()).filter(Boolean);
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        tags = parsed.map((item) => sanitizeText(String(item ?? "")).trim()).filter(Boolean);
      }
    } catch {
      tags = [];
    }
  }

  if (tags.length === 0 && body.subcategory) {
    tags = [sanitizeText(String(body.subcategory)).trim()].filter(Boolean);
  }

  const seen = new Set();
  const unique = [];
  for (const tag of tags) {
    const key = normalizeTagKey(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(tag.slice(0, 80));
    if (unique.length >= MAX_LISTING_TAGS) break;
  }

  const hasCustomTags = unique.some((tag) => !isPresetListingTag(tag));
  const subcategory = unique.length > 0 ? unique.join(" · ") : null;

  return { tags: unique, hasCustomTags, subcategory };
}

let schemaEnsured = false;

export async function ensureListingTagsSchema(pool) {
  if (schemaEnsured) return;
  await pool.query(`
    ALTER TABLE services ADD COLUMN IF NOT EXISTS listing_tags jsonb NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE services ADD COLUMN IF NOT EXISTS has_custom_tags boolean NOT NULL DEFAULT false;
  `);
  schemaEnsured = true;
}
