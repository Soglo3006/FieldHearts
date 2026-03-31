import pool from "../config/db.js";
import { validateInput, sanitizeText } from "../utils/validate.js";

export const createService = async (req, res) => {
  try {
    const { errors, data } = validateInput(req.body, {
      title:       { required: true, type: "string", maxLen: 200 },
      description: { required: true, type: "string", maxLen: 5000 },
      type:        { required: true, enum: ["offer", "looking"] },
      price:       { required: true, type: "number", min: 0.01 },
    });

    if (errors) {
      return res.status(400).json({ message: errors[0] });
    }

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
      image_urls,
      is_one_time,
      hide_exact_location,
    } = { ...req.body, ...data };

    // Resolve canonical image list: prefer image_urls array, fall back to single image_url
    const resolvedImageUrls = Array.isArray(image_urls) && image_urls.length > 0
      ? image_urls
      : (image_url ? [image_url] : []);
    const resolvedImageUrl = resolvedImageUrls[0] ?? null;

    // Créer le service
    const result = await pool.query(
      `INSERT INTO services (
        user_id, type, title, description, category, category_id, subcategory,
        price, location, address, latitude, longitude, city,
        poster_type, availability,
        language, mobility, duration, urgency, image_url, image_urls, is_one_time, hide_exact_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
        resolvedImageUrl,
        resolvedImageUrls,
        is_one_time === true || is_one_time === "true" ? true : false,
        hide_exact_location === true || hide_exact_location === "true" ? true : false,
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
    const categoryNames = String(categoryName || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const subcategories = String(subcategory || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

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

    if (categoryNames.length > 0) {
      const categoryClauses = categoryNames.map((name) => {
        const clause = `(c.name ILIKE $${paramCount} OR s.category ILIKE $${paramCount})`;
        params.push(`%${name}%`);
        paramCount++;
        return clause;
      });

      query += ` AND (${categoryClauses.join(" OR ")})`;
    }

    if (subcategories.length > 0) {
      const subcategoryClauses = subcategories.map((name) => {
        const clause = `s.subcategory ILIKE $${paramCount}`;
        params.push(`%${name}%`);
        paramCount++;
        return clause;
      });

      query += ` AND (${subcategoryClauses.join(" OR ")})`;
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

    if (search && search.trim()) {
      // Bilingual synonym map (FR ↔ EN common service terms)
      const SYNONYMS = {
        cleaning: ["nettoyage", "ménage", "menage", "nettoyer"],
        nettoyage: ["cleaning", "ménage", "menage"],
        menage: ["cleaning", "nettoyage", "ménage"],
        moving: ["déménagement", "demenagement", "déménager"],
        "déménagement": ["moving", "demenagement"],
        demenagement: ["moving", "déménagement"],
        repair: ["réparation", "reparation", "réparer", "reparer"],
        "réparation": ["repair", "reparation", "fix"],
        reparation: ["repair", "réparation"],
        painting: ["peinture", "peindre", "peintre"],
        peinture: ["painting", "peindre"],
        gardening: ["jardinage", "jardin", "aménagement paysager"],
        jardinage: ["gardening", "garden", "jardin"],
        landscaping: ["aménagement paysager", "jardinage", "jardin"],
        childcare: ["garde enfants", "babysitting", "garderie"],
        babysitting: ["garde enfants", "childcare", "garderie"],
        "garde": ["childcare", "babysitting"],
        delivery: ["livraison", "livrer", "courses"],
        livraison: ["delivery", "livrer"],
        tech: ["informatique", "support technique", "ordinateur"],
        informatique: ["tech", "computer", "support"],
        snow: ["neige", "déneigement", "deneigement"],
        "déneigement": ["snow removal", "neige", "deneigement"],
        deneigement: ["déneigement", "snow"],
        plumbing: ["plomberie", "plombier"],
        plomberie: ["plumbing", "plombier"],
        electrical: ["électricité", "electricite", "électricien"],
        "électricité": ["electrical", "electricite"],
        pet: ["animal", "animaux", "chien", "chat"],
        dog: ["chien", "animal", "animaux"],
        cat: ["chat", "animal", "animaux"],
        tutoring: ["cours", "tutorat", "enseignement", "leçons"],
        cours: ["tutoring", "lessons", "leçons"],
        photography: ["photographie", "photo", "photographe"],
        photographie: ["photography", "photo"],
        renovation: ["rénovation", "rénover"],
        "rénovation": ["renovation", "rénover"],
      };

      const words = search.trim().split(/\s+/).filter((w) => w.length > 0);

      for (const word of words) {
        const lw = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const synonymKey = Object.keys(SYNONYMS).find(
          (k) => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === lw
        );
        const alternatives = synonymKey ? [word, ...SYNONYMS[synonymKey]] : [word];
        const conditions = [];

        for (const alt of alternatives) {
          const p = `%${alt}%`;
          conditions.push(
            `s.title ILIKE $${paramCount}`,
            `s.description ILIKE $${paramCount}`,
            `COALESCE(c.name, s.category) ILIKE $${paramCount}`,
            `s.subcategory ILIKE $${paramCount}`,
            `s.city ILIKE $${paramCount}`,
            `s.location ILIKE $${paramCount}`
          );
          params.push(p);
          paramCount++;
        }
        query += ` AND (${conditions.join(" OR ")})`;
      }
    }

    // Relevance score: rank title matches higher than description/category
    let hasSearch = !!(search && search.trim());
    let relevanceExpr = "s.created_at";
    if (hasSearch) {
      const scoreParam = `%${search.trim()}%`;
      relevanceExpr = `(
        CASE WHEN s.title ILIKE $${paramCount} THEN 100 ELSE 0 END +
        CASE WHEN s.title ILIKE $${paramCount + 1} THEN 60 ELSE 0 END +
        CASE WHEN COALESCE(c.name, s.category) ILIKE $${paramCount} THEN 30 ELSE 0 END +
        CASE WHEN s.subcategory ILIKE $${paramCount} THEN 20 ELSE 0 END +
        CASE WHEN s.description ILIKE $${paramCount} THEN 10 ELSE 0 END
      )`;
      params.push(scoreParam, `${search.trim()}%`);
      paramCount += 2;
    }

    const lat = parseFloat(userLat);
    const lng = parseFloat(userLng);
    const km  = parseFloat(radius) || 50;

    if (!isNaN(lat) && !isNaN(lng)) {
      const distExpr = `(6371 * acos(
          cos(radians($${paramCount})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians($${paramCount + 1})) +
          sin(radians($${paramCount})) * sin(radians(s.latitude))
        ))`;
      query += `
        AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
        AND ${distExpr} <= $${paramCount + 2}
        ORDER BY ${hasSearch ? `${relevanceExpr} DESC,` : ""} ${distExpr} ASC
      `;
      params.push(lat, lng, km);
    } else {
      query += hasSearch
        ? ` ORDER BY ${relevanceExpr} DESC, s.created_at DESC`
        : ` ORDER BY s.created_at DESC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("[getAllServices] error:", err.message, err.stack);
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
          u.avatar AS owner_avatar,
          u.account_type AS owner_account_type,
          u.province AS owner_province,
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
      mobility, duration, urgency, image_url, image_urls, is_one_time, hide_exact_location,
    } = req.body;

    const check = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "You can't update this service" });
    }

    const existing = check.rows[0];

    // Resolve canonical image list for update
    let updResolvedUrls, updResolvedUrl;
    if (image_urls !== undefined) {
      updResolvedUrls = Array.isArray(image_urls) ? image_urls : [];
      updResolvedUrl = updResolvedUrls[0] ?? null;
    } else if (image_url !== undefined) {
      updResolvedUrl = image_url;
      updResolvedUrls = image_url ? [image_url] : [];
    } else {
      updResolvedUrl = existing.image_url;
      updResolvedUrls = existing.image_urls || [];
    }

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
           image_urls          = $19,
           is_one_time         = $20,
           hide_exact_location = $21
       WHERE id = $22
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
        updResolvedUrl,
        updResolvedUrls,
        is_one_time          !== undefined ? (is_one_time === true || is_one_time === "true") : existing.is_one_time,
        hide_exact_location  !== undefined ? (hide_exact_location === true || hide_exact_location === "true") : existing.hide_exact_location,
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
        AND s.is_active = true
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
