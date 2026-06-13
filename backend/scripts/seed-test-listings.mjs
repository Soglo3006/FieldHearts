import "dotenv/config";
import pool from "../src/config/db.js";

const EMAIL = "ablbooh0+test3@gmail.com";

const LISTINGS = [
  {
    type: "offer",
    title: "[TEST] Peinture intérieure — prix fixe",
    description: "Annonce de test locale. Peinture de chambre, prix forfaitaire. Calendrier et dépôt activés après réservation.",
    pricing_mode: "fixed",
    price: 350,
    city: "Montréal",
    location: "Montréal, QC",
    category: "Rénovation",
    deposit_enabled: true,
    deposit_type: "percent",
    deposit_value: 20,
  },
  {
    type: "offer",
    title: "[TEST] Entretien ménager — tarif horaire",
    description: "Annonce de test locale. Tarif à l'heure avec sessions de travail et validation des heures.",
    pricing_mode: "hourly",
    price: 35,
    estimated_hours: 4,
    city: "Montréal",
    location: "Montréal, QC",
    category: "Ménage",
    deposit_enabled: true,
    deposit_type: "fixed",
    deposit_value: 50,
  },
  {
    type: "looking",
    title: "[TEST] Recherche plombier — fourchette de prix",
    description: "Annonce de test locale. Je cherche un plombier pour réparer une fuite. Fourchette de prix avec dépôt.",
    pricing_mode: "range",
    price_min: 80,
    price_max: 200,
    city: "Laval",
    location: "Laval, QC",
    category: "Plomberie",
    deposit_enabled: true,
    deposit_type: "percent",
    deposit_value: 15,
  },
];

async function main() {
  await pool.query(`
    ALTER TABLE services DROP CONSTRAINT IF EXISTS services_pricing_mode_check;
    ALTER TABLE services ADD CONSTRAINT services_pricing_mode_check
      CHECK (pricing_mode IN ('fixed', 'range', 'quote', 'hourly'));
  `);

  const user = await pool.query(
    "SELECT id, email, full_name FROM users WHERE email = $1",
    [EMAIL],
  );
  if (!user.rows[0]) {
    console.error(`User not found: ${EMAIL}`);
    process.exit(1);
  }
  const userId = user.rows[0].id;
  console.log(`User: ${user.rows[0].full_name} (${user.rows[0].email})`);

  for (const L of LISTINGS) {
    const price =
      L.pricing_mode === "range"
        ? L.price_min
        : L.pricing_mode === "quote"
          ? null
          : L.price;
    const priceMin = L.pricing_mode === "range" ? L.price_min : price;
    const priceMax =
      L.pricing_mode === "range"
        ? L.price_max
        : L.pricing_mode === "fixed"
          ? price
          : null;

    const existing = await pool.query(
      "SELECT id FROM services WHERE user_id = $1 AND title = $2 LIMIT 1",
      [userId, L.title],
    );
    if (existing.rows[0]) {
      console.log(`Skip (exists): ${L.title} → ${existing.rows[0].id}`);
      continue;
    }

    const result = await pool.query(
      `INSERT INTO services (
        user_id, type, title, description, category,
        price, price_min, price_max, pricing_mode, estimated_hours,
        location, city, is_active, is_one_time,
        deposit_enabled, deposit_type, deposit_value,
        listing_tags, has_custom_tags, translations
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, true, false,
        $13, $14, $15,
        '[]'::jsonb, false, '{}'::jsonb
      ) RETURNING id, title, pricing_mode, type`,
      [
        userId,
        L.type,
        L.title,
        L.description,
        L.category,
        price,
        priceMin,
        priceMax,
        L.pricing_mode,
        L.estimated_hours ?? null,
        L.location,
        L.city,
        L.deposit_enabled,
        L.deposit_type,
        L.deposit_value,
      ],
    );
    console.log(`Created: ${result.rows[0].title} (${result.rows[0].pricing_mode}, ${result.rows[0].type}) → ${result.rows[0].id}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
