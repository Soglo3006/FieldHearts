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

export const completeProfile = async (req, res) => {
    try {
        const {
            account_type,
            phone,
            address,
            city,
            province,
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


        //Préparer les métadonnées pour auth.users
        const metaData = account_type === 'person' 
            ? {
                account_type: 'person',
                full_name: fullName,
                profession: sanitizedProfession,
                bio: sanitizedBio,
                city: city,
                province: province,
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
                bio: bio,
                city: city,
                province: province,
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

        const result = await pool.query(
            `UPDATE users 
            SET 
                account_type = $1,
                phone = $2,
                address = $3,
                city = $4,
                province = $5,
                bio = $6,
                avatar = $7,
                profession = $8,
                skills = $9,
                languages = $10,
                experiences = $11,
                company_name = $12,
                industry = $13,
                team_size = $14,
                portfolio = $15,
                profile_completed = true,
                updated_at = NOW()
            WHERE id = $16
            RETURNING *`,
            [
                account_type,
                phone,
                address,
                city,
                province,
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
            return res.status(404).json({ message: "User not found" });
        }

        const u = result.rows[0];
        const displayName = u.account_type === "company" ? u.company_name : u.full_name;
        notifyWelcome(u.email, displayName || u.email)
          .catch((err) => console.error("Welcome email failed:", err.message));

        res.json({
            message: "Profile completed successfully",
            user: u
        });
    } catch (err) {
        console.error("Error completing profile:", err);
        res.status(500).json({ 
            message: "Server error while completing profile",
            error: err.message 
        });
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
    try {
        const {
            full_name,
            email,
            phone,
            avatar,
            bio,
            city,
            province,
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

        // Mise à jour avec tous les champs
        const result = await pool.query(
            `UPDATE users 
            SET 
                full_name = $1,
                email = $2,
                phone = $3,
                avatar = $4,
                bio = $5,
                city = $6,
                province = $7,
                skills = $8,
                languages = $9,
                portfolio = $10,
                profession = $11,
                company_name = $12,
                industry = $13,
                team_size = $14,
                updated_at = NOW()
            WHERE id = $15
            RETURNING *`,
            [
                full_name || null,
                email,
                phone || null,
                avatar || null,
                bio || null,
                city || null,
                province || null,
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
            return res.status(404).json({ message: "Profile not found" });
        }

        res.json({
            message: "Profile updated successfully",
            user: result.rows[0]
        });

    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ 
            message: "Server error while updating profile",
            error: err.message 
        });
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