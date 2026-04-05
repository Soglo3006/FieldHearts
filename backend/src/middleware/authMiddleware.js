import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// Simple in-memory cache for suspended status (TTL: 2 minutes)
// Avoids hitting the DB on every single request for the same user
const suspendedCache = new Map(); // userId → { suspended: bool, expiresAt: timestamp }
const CACHE_TTL_MS = 2 * 60 * 1000;

function getCachedSuspended(userId) {
  const entry = suspendedCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    suspendedCache.delete(userId);
    return null;
  }
  return entry.suspended;
}

function setCachedSuspended(userId, suspended) {
  suspendedCache.set(userId, { suspended, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Call this when a user is suspended/reactivated to clear their cache entry */
export function invalidateSuspendedCache(userId) {
  suspendedCache.delete(userId);
}

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    // Verify JWT locally using Supabase JWT secret — zero egress, no API call
    let payload;
    try {
      payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userId = payload.sub;
    const email  = payload.email;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Check suspended status via direct DB (pool) — not Supabase REST API
    let suspended = getCachedSuspended(userId);
    if (suspended === null) {
      const result = await pool.query(
        "SELECT is_suspended FROM users WHERE id = $1",
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ message: "Account not found." });
      }
      suspended = result.rows[0].is_suspended;
      setCachedSuspended(userId, suspended);
    }

    if (suspended) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support@uneden.ca." });
    }

    req.user = {
      id: userId,
      email,
      full_name: payload.user_metadata?.full_name || email,
    };
    // Keep authUser for adminOnly — reconstruct minimal shape from JWT payload
    req.authUser = {
      id: userId,
      email,
      user_metadata: payload.user_metadata || {},
      app_metadata:  payload.app_metadata  || {},
    };
    // Expose top-level JWT claims (e.g. aal for MFA check in adminOnly)
    req._jwtPayload = payload;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ message: "Authentication failed" });
  }
};

export const adminOnly = (req, res, next) => {
  try {
    const user  = req.authUser;
    const email = req.user?.email?.toLowerCase();

    const emailList = [
      ...(process.env.ADMIN_EMAILS   || "").split(","),
      ...(process.env.SUPPORT_EMAILS || "").split(","),
    ].map((e) => e.trim().toLowerCase()).filter(Boolean);

    const um = (user?.user_metadata || {});
    const am = (user?.app_metadata  || {});
    const metaRole = String(um.role || am.role || "").toLowerCase();
    const roles = Array.isArray(um.roles) ? um.roles : Array.isArray(am.roles) ? am.roles : [];

    const hasAdminRole   = metaRole === "admin" || roles.map((r) => String(r).toLowerCase()).includes("admin");
    const allowedByEmail = email && emailList.includes(email);

    if (!hasAdminRole && !allowedByEmail) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Require MFA (AAL2) for all admin endpoints.
    // The Supabase JWT contains an `aal` claim: "aal1" = password only, "aal2" = MFA verified.
    const aal = req.authUser?.app_metadata?.aal ?? req._jwtPayload?.aal ?? null;
    if (aal !== null && aal !== "aal2") {
      return res.status(403).json({ message: "MFA verification required for admin access", mfa_required: true });
    }

    return next();
  } catch (err) {
    console.error("Admin check error:", err);
    return res.status(403).json({ message: "Admin access required" });
  }
};
