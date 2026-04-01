import "./instrument.js";
import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import serviceRoutes from "./routes/serviceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import messageRoutes from './routes/messageRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import billingAddressRoutes from './routes/billingAddressRoutes.js';
import pool from './config/db.js';
import { startMessageReminderJob } from './jobs/messageReminderJob.js';
import { startHealthMonitorJob } from './jobs/healthMonitorJob.js';
import healthRoutes from './routes/healthRoutes.js';
import cron from 'node-cron';
import { processAllPayouts, isPayoutDay } from './services/payoutService.js';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = [
  "http://localhost:3000",
  "https://uneden.ca",
  "https://www.uneden.ca",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
// ── Rate Limiters ─────────────────────────────────────────────────────────────

const shouldSkipRateLimit = (req) => {
  if (!isProduction) return true;

  const origin = req.get("origin") || "";
  return origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
};

// General API — 200 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Auth routes — stricter: 20 attempts per 15 minutes (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

// Expensive routes (search, listings) — 100 per 15 minutes
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down." },
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".ngrok-free.app") || origin.endsWith(".ngrok.io") || origin.endsWith(".vercel.app")) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/services", searchLimiter, serviceRoutes);
app.use("/api/bookings", generalLimiter, bookingRoutes);
app.use("/api/reviews", generalLimiter, reviewRoutes);
app.use("/api/disputes", generalLimiter, disputeRoutes);
app.use("/api/profiles", generalLimiter, profileRoutes);
app.use("/api/support", generalLimiter, supportRoutes);
app.use('/api/messages', generalLimiter, messageRoutes);
app.use('/api/reports', generalLimiter, reportRoutes);
app.use('/api/payments', generalLimiter, paymentRoutes);
app.use('/api/wallet', generalLimiter, walletRoutes);
app.use('/api/notifications', generalLimiter, notificationRoutes);
app.use('/api/admin/metrics', generalLimiter, metricsRoutes);
app.use('/api/favorites', generalLimiter, favoriteRoutes);
app.use('/api/billing-addresses', generalLimiter, billingAddressRoutes);
app.use('/api/health', healthRoutes);

// Sentry error handler — must be after all routes
Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // Warmup DB connection on startup so first user request is instant
  pool.query("SELECT 1").catch(() => {});

  startMessageReminderJob();
  startHealthMonitorJob();

  // Bi-weekly payout — runs every Friday at 12:00 EST (16:00 UTC)
  // node-cron doesn't support bi-weekly natively, so we run every Friday
  // and check if it's the correct payout week inside the handler
  cron.schedule("0 16 * * 5", async () => {
    if (isPayoutDay(new Date())) {
      console.log("[Payout] Bi-weekly payout day — starting...");
      await processAllPayouts();
    }
  });
});
