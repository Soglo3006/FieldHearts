import { supabaseAdmin } from "../lib/supabase.js";

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

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
    };
    // Preserve the full Supabase user for role checks in downstream middleware
    req.authUser = user;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ message: "Authentication failed" });
  }
};

export const adminOnly = (req, res, next) => {
  try {
    const user = req.authUser;
    const email = req.user?.email?.toLowerCase();

    const emailList = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const um = (user?.user_metadata || {});
    const am = (user?.app_metadata || {});
    const metaRole = String(um.role || am.role || "").toLowerCase();
    const roles = Array.isArray(um.roles) ? um.roles : Array.isArray(am.roles) ? am.roles : [];

    const hasAdminRole = metaRole === "admin" || roles.map((r) => String(r).toLowerCase()).includes("admin");
    const allowedByEmail = email && emailList.includes(email);

    if (hasAdminRole || allowedByEmail) {
      return next();
    }

    return res.status(403).json({ message: "Admin access required" });
  } catch (err) {
    console.error("Admin check error:", err);
    return res.status(403).json({ message: "Admin access required" });
  }
};