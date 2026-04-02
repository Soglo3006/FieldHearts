import pool from "../config/db.js";
import { sanitizeText } from "../utils/validate.js";
import { createClient } from '@supabase/supabase-js';
import { notifyWelcome } from '../services/emailService.js';


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const PROVINCE_NAME_TO_CODE = {
        alberta: "AB",
        "british columbia": "BC",
        "colombie-britannique": "BC",
        manitoba: "MB",
        "new brunswick": "NB",
        "nouveau-brunswick": "NB",
        "newfoundland and labrador": "NL",
        "terre-neuve-et-labrador": "NL",
        "nova scotia": "NS",
        "nouvelle-ecosse": "NS",
        "nouvelle-écosse": "NS",
        "northwest territories": "NT",
        "territoires du nord-ouest": "NT",
        nunavut: "NU",
        ontario: "ON",
        "prince edward island": "PE",
        "ile-du-prince-edouard": "PE",
        "île-du-prince-édouard": "PE",
        quebec: "QC",
        québec: "QC",
        saskatchewan: "SK",
        yukon: "YT",
};

function normalizeProvinceCode(province) {
        if (!province) return null;
        const upper = String(province).toUpperCase();
        if (upper.length === 2) return upper;
        return PROVINCE_NAME_TO_CODE[String(province).toLowerCase()] ?? upper;
}

function normalizePostalCode(postalCode) {
    if (!postalCode) return null;
    const compact = String(postalCode).replace(/\s+/g, "").toUpperCase().slice(0, 6);
    if (!compact) return null;
    return compact.length > 3 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact;
}

async function syncDefaultBillingAddress(client, {
    userId,
    fullName,
    address,
    city,
    province,
    postalCode = "",
    createIfMissing = false,
}) {
    const normalizedProvince = normalizeProvinceCode(province);
    const normalizedPostalCode = normalizePostalCode(postalCode);

    const updateResult = await client.query(
        `UPDATE billing_addresses
         SET
            full_name = COALESCE($1, full_name),
            address_line1 = COALESCE($2, address_line1),
            city = COALESCE($3, city),
            province = COALESCE($4, province),
            postal_code = COALESCE($5, postal_code)
         WHERE user_id = $6 AND is_default = true`,
        [
            fullName || null,
            address || null,
            city || null,
            normalizedProvince,
            normalizedPostalCode,
            userId,
        ]
    );

    if (!createIfMissing || updateResult.rowCount > 0) {
        return;
    }

    if (!address || !city || !normalizedProvince) {
        return;
    }

    await client.query(
        `INSERT INTO billing_addresses (user_id, label, full_name, address_line1, city, province, postal_code, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [userId, "Domicile", fullName || null, address, city, normalizedProvince, normalizedPostalCode || ""]
    );
}

export const completeProfile = async (req, res) => {
    let client;
    try {
        const {
            account_type,
            phone,
            address,
            city,
            province,
            postal_code,
            bio,
            avatar,

            // Person data
            profession,
            skills,
            languages,
            experiences,

            // Company data
            company_name,
            industry,
            team_size,

            portfolio
        } = req.body;

        const userId = req.user.id;
        const fullName = req.user.full_name;

        // Sanitize text inputs
        if (bio && bio.length > 1000) return res.status(400).json({ message: "Bio must be at most 1000 characters" });
        if (profession && profession.length > 200) return res.status(400).json({ message: "Profession must be at most 200 characters" });
        if (company_name && company_name.length > 200) return res.status(400).json({ message: "Company name must be at most 200 characters" });
        const sanitizedBio = sanitizeText(bio);
        const sanitizedProfession = sanitizeText(profession);
        const sanitizedCompanyName = sanitizeText(company_name);
        const normalizedPostalCode = normalizePostalCode(postal_code);


        //Préparer les métadonnées pour auth.users
        const metaData = account_type === 'person' 
            ? {
                account_type: 'person',
                full_name: fullName,
                profession: sanitizedProfession,
                bio: sanitizedBio,
                city: city,
                province: province,
                postal_code: normalizedPostalCode,
                phone: phone,
                address: address,
                avatar_url: avatar,
                profile_completed: true,
            }
            : {
                account_type: 'company',
                company_name: sanitizedCompanyName,
                full_name: fullName, // Nom du représentant
                industry: industry,
                bio: sanitizedBio,
                city: city,
                province: province,
                postal_code: normalizedPostalCode,
                phone: phone,
                address: address,
                team_size: team_size,
                avatar_url: avatar,
                profile_completed: true,
            };

        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { user_metadata: metaData }
        );

        if (metaError) {
            console.error('Error updating user metadata:', metaError);
            return res.status(500).json({ 
                message: 'Failed to update user metadata',
                error: metaError.message 
            });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE users
            SET
                account_type = $1,
                phone = $2,
                address = $3,
                city = $4,
                province = $5,
                postal_code = $6,
                bio = $7,
                avatar = $8,
                profession = $9,
                skills = $10,
                languages = $11,
                experiences = $12,
                company_name = $13,
                industry = $14,
                team_size = $15,
                portfolio = $16,
                profile_completed = true,
                updated_at = NOW()
            WHERE id = $17
            RETURNING *`,
            [
                account_type,
                phone,
                address,
                city,
                province,
                normalizedPostalCode,
                sanitizedBio,
                avatar,
                sanitizedProfession,
                JSON.stringify(skills || []),
                JSON.stringify(languages || []),
                JSON.stringify(experiences || []),
                sanitizedCompanyName,
                industry,
                team_size,
                JSON.stringify(portfolio || []),
                userId
            ]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "User not found" });
        }

        const defaultBillingName = account_type === 'company'
            ? (sanitizedCompanyName?.trim() || null)
            : (fullName?.trim() || null);

        await syncDefaultBillingAddress(client, {
            userId,
            fullName: defaultBillingName,
            address,
            city,
            province,
            postalCode: normalizedPostalCode || "",
            createIfMissing: true,
        });

        await client.query("COMMIT");

        const u = result.rows[0];
        const displayName = u.account_type === "company" ? u.company_name : u.full_name;
        notifyWelcome(u.email, displayName || u.email)
          .catch((err) => console.error("Welcome email failed:", err.message));

        res.json({
            message: "Profile completed successfully",
            user: u
        });
    } catch (err) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }
        console.error("Error completing profile:", err);
        res.status(500).json({ 
            message: "Server error while completing profile",
            error: err.message 
        });
    } finally {
        client?.release();
    }
};

export const GetMyProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const user = result.rows[0];
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while fetching profile" });
    }
};

export const UpdateMyProfile = async (req, res) => {
    let client;
    try {
        const {
            full_name,
            email,
            phone,
            avatar,
            bio,
            address,
            city,
            province,
            postal_code,
            skills,
            languages,
            portfolio,
            profession,
            company_name,
            industry,
            team_size,
            account_type
        } = req.body;

        // Validation des champs requis
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Vérifier que le nom approprié est fourni selon le type
        if (account_type === "company") {
            if (!company_name || company_name.trim() === "") {
                return res.status(400).json({ message: "Company name is required" });
            }
        } else {
            if (!full_name || full_name.trim() === "") {
                return res.status(400).json({ message: "Full name is required" });
            }
        }

        // Convertir les tableaux en JSON seulement s'ils sont des tableaux
        const skillsJson = Array.isArray(skills) ? JSON.stringify(skills) : skills;
        const languagesJson = Array.isArray(languages) ? JSON.stringify(languages) : languages;
        const portfolioJson = Array.isArray(portfolio) ? JSON.stringify(portfolio) : portfolio;
        const normalizedPostalCode = normalizePostalCode(postal_code);

        client = await pool.connect();
        await client.query("BEGIN");

        // Mise à jour avec tous les champs
        const result = await client.query(
            `UPDATE users
            SET
                full_name = $1,
                email = $2,
                phone = $3,
                avatar = $4,
                bio = $5,
                address = $6,
                city = $7,
                province = $8,
                postal_code = $9,
                skills = $10,
                languages = $11,
                portfolio = $12,
                profession = $13,
                company_name = $14,
                industry = $15,
                team_size = $16,
                updated_at = NOW()
            WHERE id = $17
            RETURNING *`,
            [
                full_name || null,
                email,
                phone || null,
                avatar || null,
                bio || null,
                address || null,
                city || null,
                province || null,
                normalizedPostalCode,
                skillsJson || '[]',
                languagesJson || '[]',
                portfolioJson || '[]',
                profession || null,
                company_name || null,
                industry || null,
                team_size || null,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Profile not found" });
        }

        const defaultBillingName = account_type === "company"
            ? (company_name?.trim() || null)
            : (full_name?.trim() || null);

        await syncDefaultBillingAddress(client, {
            userId: req.user.id,
            fullName: defaultBillingName,
            address,
            city,
            province,
            postalCode: normalizedPostalCode || "",
        });

        await client.query("COMMIT");

        res.json({
            message: "Profile updated successfully",
            user: result.rows[0]
        });

    } catch (err) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }
        console.error("Error updating profile:", err);
        res.status(500).json({ 
            message: "Server error while updating profile",
            error: err.message 
        });
    } finally {
        client?.release();
    }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!UUID_REGEX.test(id)) {
            return res.status(404).json({ message: "User not found" });
        }

        const userResult = await pool.query(
            `SELECT 
            id, full_name, email, account_type, bio, avatar, 
            profession, skills, languages, portfolio,
            company_name, industry, team_size,
            created_at 
            FROM users 
            WHERE id = $1`,
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "Profile not found" });
        }
        
        const user = userResult.rows[0];

        const serviceUser = await pool.query(
            `SELECT COUNT(*) AS total_services FROM services WHERE user_id = $1`,
            [id]
        );

        const completedBookings = await pool.query(
            `SELECT COUNT(*) as count FROM bookings WHERE worker_id = $1 AND status = 'completed'`,
            [id]
        );

        const avgRating = await pool.query(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE target_id = $1`,
            [id]
        );

        res.json({
            ...user,
            stats: {
                total_services: parseInt(serviceUser.rows[0].total_services, 10),
                completed_bookings: parseInt(completedBookings.rows[0].count, 10),
                average_rating: avgRating.rows[0].avg_rating ? parseFloat(parseFloat(avgRating.rows[0].avg_rating).toFixed(1)) : null,
                total_reviews: parseInt(avgRating.rows[0].review_count, 10)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while fetching profile" });
    }
};

export const getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT settings FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0].settings || {});
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ message: "Server error while fetching settings" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { notifications, language, region } = req.body;

    const current = await pool.query(
      `SELECT settings FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Merger les settings existants avec les nouveaux
    const existingSettings = current.rows[0].settings || {};

    const updatedSettings = {
    ...existingSettings,
    ...(notifications && { notifications: { ...existingSettings.notifications, ...notifications } }),
    ...(language && { language }),
    ...(region && { region }),
    };

    const result = await pool.query(
      `UPDATE users SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING settings`,
      [JSON.stringify(updatedSettings), req.user.id]
    );

    res.json(result.rows[0].settings);
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ message: "Server error while updating settings" });
  }
};
export const searchProfiles = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const pattern = `%${q}%`;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, company_name, account_type, avatar_url')
      .or(`full_name.ilike.${pattern},company_name.ilike.${pattern}`)
      .neq('id', req.user.id)
      .limit(20);

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error('Error searching profiles:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
