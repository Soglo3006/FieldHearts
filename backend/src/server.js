import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
import { startMessageReminderJob } from './jobs/messageReminderJob.js';
import cron from 'node-cron';
import { processAllPayouts, isPayoutDay } from './services/payoutService.js';

dotenv.config();

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://uneden.ca",
  "https://www.uneden.ca",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/support", supportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/metrics', metricsRoutes);
app.use('/api/favorites', favoriteRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMessageReminderJob();

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
