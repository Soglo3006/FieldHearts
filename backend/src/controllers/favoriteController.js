import pool from "../config/db.js";

/** GET /favorites/ids — just the service IDs (for "is saved?" checks) */
export const getFavoriteIds = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT service_id FROM service_favorites WHERE user_id = $1`,
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
    const result = await pool.query(
      `SELECT s.id, s.title, s.price, s.location, s.image_url,
              COALESCE(c.name, s.category) AS category_name, s.subcategory
       FROM service_favorites f
       JOIN services s ON s.id = f.service_id
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE f.user_id = $1 AND s.is_active = true
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
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
