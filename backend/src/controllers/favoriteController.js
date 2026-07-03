import pool from "../config/db.js";
import { canonServiceFieldsInPlace } from "../utils/serviceFieldCanonical.js";
import { ensureListingVisibilitySchema, publicListingFilter } from "../utils/listingVisibility.js";

/** GET /favorites/ids — just the service IDs (for "is saved?" checks) */
export const getFavoriteIds = async (req, res) => {
  try {
    await ensureListingVisibilitySchema(pool);
    const result = await pool.query(
      `SELECT f.service_id
       FROM service_favorites f
       JOIN services s ON s.id = f.service_id
       WHERE f.user_id = $1
         AND s.is_active = true
         ${publicListingFilter("s")}
       UNION
       SELECT f.service_id
       FROM service_favorites f
       JOIN services s ON s.id = f.service_id
       WHERE f.user_id = $1
         AND s.is_active = true
         AND COALESCE(s.is_public, true) = false
         AND (
           s.user_id = $1
           OR EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.service_id = s.id
               AND (b.client_id = $1 OR b.worker_id = $1)
               AND b.status = 'active'
               AND b.payment_status IN ('deposit_paid', 'paid')
           )
         )`,
      [req.user.id]
    );
    res.json(result.rows.map((r) => r.service_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /favorites — full service details */
export const getFavorites = async (req, res) => {
  try {
    await ensureListingVisibilitySchema(pool);
    const result = await pool.query(
      `SELECT s.id, s.title, s.price, s.location, s.address, s.city, s.hide_exact_location,
              s.image_url, s.image_urls, s.language, s.translations,
              COALESCE(c.name, s.category) AS category_name, s.subcategory
       FROM service_favorites f
       JOIN services s ON s.id = f.service_id
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE f.user_id = $1 AND s.is_active = true
         AND (
           COALESCE(s.is_public, true) = true
           OR s.user_id = $1
           OR EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.service_id = s.id
               AND (b.client_id = $1 OR b.worker_id = $1)
               AND b.status = 'active'
               AND b.payment_status IN ('deposit_paid', 'paid')
           )
         )
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    result.rows.forEach((row) => canonServiceFieldsInPlace(row));
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /favorites — add a favorite */
export const addFavorite = async (req, res) => {
  const { service_id } = req.body;
  if (!service_id) return res.status(400).json({ message: "service_id required" });
  const { isValidUUID } = await import("../utils/validate.js");
  if (!isValidUUID(service_id)) return res.status(400).json({ message: "Invalid service_id" });
  try {
    await ensureListingVisibilitySchema(pool);
    const service = await pool.query(
      `SELECT id, user_id, is_public, is_active FROM services WHERE id = $1`,
      [service_id],
    );
    if (service.rows.length === 0 || !service.rows[0].is_active) {
      return res.status(404).json({ message: "Service not found" });
    }
    const s = service.rows[0];
    if (s.is_public === false && String(s.user_id) !== String(req.user.id)) {
      return res.status(403).json({ message: "This listing is private" });
    }
    await pool.query(
      `INSERT INTO service_favorites (user_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, service_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/** DELETE /favorites/:serviceId — remove a favorite */
export const removeFavorite = async (req, res) => {
  const { serviceId } = req.params;
  try {
    await pool.query(
      `DELETE FROM service_favorites WHERE user_id = $1 AND service_id = $2`,
      [req.user.id, serviceId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
