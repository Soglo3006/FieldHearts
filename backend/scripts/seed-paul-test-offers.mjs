import "dotenv/config";
import pool from "../src/config/db.js";

/**
 * Creates 5 [TEST] offer listings similar to:
 * "[TEST] Peinture intérieure — prix fixe" (fixed price + % deposit)
 * for user Paul Ange Booh Louha.
 */
const LISTINGS = [
  {
    type: "offer",
    title: "[TEST] Ménage résidentiel — prix fixe",
    description:
      "Annonce de test locale. Ménage complet d'appartement, prix forfaitaire. Calendrier et dépôt activés après réservation.",
    pricing_mode: "fixed",
    price: 120,
    city: "Montréal",
    location: "Montréal, QC",
    category: "Ménage",
    deposit_enabled: true,
    deposit_type: "percent",
    deposit_value: 20,
  },
  {
    type: "offer",
    title: "[TEST] Montage de meubles — prix fixe",
    description:
      "Annonce de test locale. Assemblage de meubles IKEA / bureau, prix forfaitaire. Calendrier et dépôt activés après réservation.",
    pricing_mode: "fixed",
    price: 95,
    city: "Laval",
    location: "Laval, QC",
    category: "Aide à domicile",
    deposit_enabled: true,
    deposit_type: "percent",
    deposit_value: 15,
  },
  {
    type: "offer",
    title: "[TEST] Déneigement entrée — prix fixe",
    description:
      "Annonce de test locale. Déneigement d'entrée et trottoir, prix forfaitaire par visite. Calendrier et dépôt activés après réservation.",
    pricing_mode: "fixed",
    price: 60,
    city: "Longueuil",
    location: "Longueuil, QC",
    category: "Entretien extérieur",
    deposit_enabled: true,
    deposit_type: "percent",
    deposit_value: 25,
  },
  {
    type: "offer",
    title: "[TEST] Peinture extérieure — prix fixe",
    description:
      "Annonce de test locale. Peinture de clôture / façade, prix forfaitaire. Calendrier et dépôt activés après réservation.",
    pricing_mode: "fixed",
    price: 480,
    city: "Montréal",
    location: "Montréal, QC",
    category: "Rénovation",
    deposit_enabled: true,
    deposit_type: "percent",
    deposit_value: 20,
  },
  {
    type: "offer",
    title: "[TEST] Installation TV / support mural — prix fixe",
    description:
      "Annonce de test locale. Fixation de support mural et branchement TV, prix forfaitaire. Calendrier et dépôt activés après réservation.",
    pricing_mode: "fixed",
    price: 85,
    city: "Québec",
    location: "Québec, QC",
    category: "Réparations",
    deposit_enabled: true,
    deposit_type: "fixed",
    deposit_value: 20,
  },
];

async function main() {
  const user = await pool.query(
    `SELECT id, email, full_name FROM users
     WHERE full_name ILIKE $1
        OR full_name ILIKE $2
        OR email = $3
     ORDER BY
       CASE WHEN full_name ILIKE $1 THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 5`,
    ["%Paul Ange%Booh%", "%Paul Ange%", "ablbooh0+test3@gmail.com"],
  );

  if (!user.rows[0]) {
    console.error("User Paul Ange / seed email not found.");
    process.exit(1);
  }

  console.log("Candidates:");
  for (const row of user.rows) {
    console.log(`  - ${row.full_name} <${row.email}> ${row.id}`);
  }

  const paul =
    user.rows.find((r) => /paul\s*ange/i.test(r.full_name || "")) || user.rows[0];
  const userId = paul.id;
  console.log(`\nUsing: ${paul.full_name} (${paul.email}) → ${userId}\n`);

  for (const L of LISTINGS) {
    const price = L.price;
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
        $6, $6, $6, $7, NULL,
        $8, $9, true, false,
        $10, $11, $12,
        '[]'::jsonb, false, '{}'::jsonb
      ) RETURNING id, title, price, deposit_type, deposit_value`,
      [
        userId,
        L.type,
        L.title,
        L.description,
        L.category,
        price,
        L.pricing_mode,
        L.location,
        L.city,
        L.deposit_enabled,
        L.deposit_type,
        L.deposit_value,
      ],
    );
    const row = result.rows[0];
    console.log(
      `Created: ${row.title} — ${row.price}$ (dépôt ${row.deposit_value}${row.deposit_type === "percent" ? "%" : "$"}) → ${row.id}`,
    );
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
