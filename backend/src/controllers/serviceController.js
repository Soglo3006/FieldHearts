import pool from "../config/db.js";

export const createService = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      category,
      category_id,
      subcategory,
      price,
      location,
      address,
      latitude,
      longitude,
      city,
      poster_type,
      availability,
      language,
      mobility,
      duration,
      urgency,
      image_url,
      is_one_time,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    if (!type || !['offer', 'looking'].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Must be 'offer' or 'looking'" });
    }

    if (!price || price <= 0) {
      return res.status(400).json({ message: "Price/Budget must be greater than 0" });
    }

    // Créer le service
    const result = await pool.query(
      `INSERT INTO services (
        user_id, type, title, description, category, category_id, subcategory,
        price, location, address, latitude, longitude, city,
        poster_type, availability,
        language, mobility, duration, urgency, image_url, is_one_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        req.user.id,
        type,
        title,
        description,
        category || null,
        category_id || null,
        subcategory || null,
        price,
        location,
        address || location,
        latitude || null,
        longitude || null,
        city || location,
        poster_type || null,
        availability || null,
        language || null,
        mobility || null,
        duration || null,
        urgency || null,
        image_url || null,
        is_one_time === true || is_one_time === "true" ? true : false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while creating service" });
  }
};

export const getAllServices = async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice, search, categoryName, subcategory, type, userLat, userLng, radius } = req.query;

    let query = `
      SELECT
        s.*,
        COALESCE(c.name, s.category) AS category_name,
        c.image_url AS category_image_url
      FROM services s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.is_active = true
    `;

    const params = [];
    let paramCount = 1;

    if (category) {
      query += ` AND s.category_id = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (categoryName) {
      query += ` AND (c.name ILIKE $${paramCount} OR s.category ILIKE $${paramCount})`;
      params.push(`%${categoryName}%`);
      paramCount++;
    }

    if (subcategory) {
      query += ` AND s.subcategory ILIKE $${paramCount}`;
      params.push(`%${subcategory}%`);
      paramCount++;
    }

    if (type && (type === "offer" || type === "looking")) {
      query += ` AND s.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (location) {
      query += ` AND (s.location ILIKE $${paramCount} OR s.city ILIKE $${paramCount})`;
      params.push(`%${location}%`);
      paramCount++;
    }

    if (minPrice) {
      query += ` AND s.price >= $${paramCount}`;
      params.push(minPrice);
      paramCount++;
    }

    if (maxPrice) {
      query += ` AND s.price <= $${paramCount}`;
      params.push(maxPrice);
      paramCount++;
    }

    if (search) {
      query += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const lat = parseFloat(userLat);
    const lng = parseFloat(userLng);
    const km  = parseFloat(radius) || 50;

    if (!isNaN(lat) && !isNaN(lng)) {
      // Filter to listings within `km` radius that have coordinates, then sort by distance
      query += `
        AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians($${paramCount})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians($${paramCount + 1})) +
          sin(radians($${paramCount})) * sin(radians(s.latitude))
        )) <= $${paramCount + 2}
        ORDER BY (6371 * acos(
          cos(radians($${paramCount})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians($${paramCount + 1})) +
          sin(radians($${paramCount})) * sin(radians(s.latitude))
        )) ASC
      `;
      params.push(lat, lng, km);
    } else {
      query += ` ORDER BY s.created_at DESC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error while fetching services" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "You can't delete this service" });
    }

    await pool.query(`DELETE FROM services WHERE id = $1`, [id]);
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while deleting service" });
  }
};

export const getMyServices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM services WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching your services" });
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ message: "Service not found" });
    }

    const result = await pool.query(
      `SELECT
          s.*,
          CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS owner_name,
          u.id AS owner_id,
          c.name AS category_name,
          c.image_url AS category_image_url
       FROM services s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching service" });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, category, category_id, subcategory,
      price, location, address, latitude, longitude, city,
      poster_type, availability, language,
      mobility, duration, urgency, image_url, is_one_time,
    } = req.body;

    const check = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "You can't update this service" });
    }

    const existing = check.rows[0];

    const updated = await pool.query(
      `UPDATE services
       SET title        = $1,
           description  = $2,
           category     = $3,
           category_id  = $4,
           subcategory  = $5,
           price        = $6,
           location     = $7,
           address      = $8,
           latitude     = $9,
           longitude    = $10,
           city         = $11,
           poster_type  = $12,
           availability = $13,
           language     = $14,
           mobility     = $15,
           duration     = $16,
           urgency      = $17,
           image_url    = $18,
           is_one_time  = $19
       WHERE id = $20
       RETURNING *`,
      [
        title        !== undefined ? title        : existing.title,
        description  !== undefined ? description  : existing.description,
        category     !== undefined ? category     : existing.category,
        category_id  !== undefined ? category_id  : existing.category_id,
        subcategory  !== undefined ? subcategory  : existing.subcategory,
        price        !== undefined ? price        : existing.price,
        location     !== undefined ? location     : existing.location,
        address      !== undefined ? (address || location || existing.location) : existing.address,
        latitude     !== undefined ? latitude     : existing.latitude,
        longitude    !== undefined ? longitude    : existing.longitude,
        city         !== undefined ? (city || location || existing.location) : existing.city,
        poster_type  !== undefined ? poster_type  : existing.poster_type,
        availability !== undefined ? availability : existing.availability,
        language     !== undefined ? language     : existing.language,
        mobility     !== undefined ? mobility     : existing.mobility,
        duration     !== undefined ? duration     : existing.duration,
        urgency      !== undefined ? urgency      : existing.urgency,
        image_url    !== undefined ? image_url    : existing.image_url,
        is_one_time  !== undefined ? (is_one_time === true || is_one_time === "true") : existing.is_one_time,
        id,
      ]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while updating service" });
  }
};

export const getUserServices = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT
        s.*,
        CASE WHEN u.account_type = 'company' THEN u.company_name ELSE u.full_name END AS owner_name,
        u.company_name,
        u.account_type,
        COALESCE(c.name, s.category) AS category_name
      FROM services s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching user services" });
  }
};

export const getCategoryCounts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(c.name, s.category) AS category_name,
        COUNT(*)::int AS count
      FROM services s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.is_active = true
        AND COALESCE(c.name, s.category) IS NOT NULL
        AND COALESCE(c.name, s.category) != ''
      GROUP BY COALESCE(c.name, s.category)
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching category counts" });
  }
};
