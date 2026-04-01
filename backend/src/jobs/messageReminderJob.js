import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { notifyUnreadReminder } from "../services/emailService.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Runs every hour.
 * For each user who has unread messages older than 24h, AND hasn't been
 * online in 24h, AND hasn't received a reminder in 24h → send one reminder.
 */
const runReminders = async () => {
  try {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cutoff7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Find all (recipient, chat_room) pairs with old unread messages
    const { data: rows, error } = await supabase
      .from("chat_room_member")
      .select("user_id, chat_room_id, last_reminder_sent_at")
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cutoff24h}`);

    if (error) { console.error("Reminder job - fetch error:", error.message); return; }
    if (!rows?.length) return;

    for (const row of rows) {
      const userId    = row.user_id;
      const chatRoomId = row.chat_room_id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, company_name, account_type")
        .eq("id", userId)
        .maybeSingle();

      if (!profile) continue;

      // Fetch user presence separately (no FK relationship in schema)
      const { data: presenceData } = await supabase
        .from("user_presence")
        .select("last_seen")
        .eq("user_id", userId)
        .maybeSingle();
      const lastSeen = presenceData?.last_seen;

      // Skip if user was online in the last 24h
      if (lastSeen && new Date(lastSeen) > new Date(cutoff24h)) continue;

      // Get unread messages in this room from the OTHER person, older than 24h
      const { data: unread, error: msgErr } = await supabase
        .from("messages")
        .select("id, user_id, content, created_at")
        .eq("chat_room_id", chatRoomId)
        .neq("user_id", userId)
        .is("read_at", null)
        .is("deleted_at", null)
        .lt("created_at", cutoff24h)
        .gt("created_at", cutoff7d);

      if (msgErr || !unread?.length) continue;

      // Get the sender's profile (the person who sent the unread messages)
      const senderId = unread[unread.length - 1].user_id; // most recent sender
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name, company_name, account_type")
        .eq("id", senderId)
        .single();

      const receiverName = profile.account_type === "company"
        ? profile.company_name
        : profile.full_name || "là";

      const senderName = senderProfile?.account_type === "company"
        ? senderProfile.company_name
        : senderProfile?.full_name || "Quelqu'un";

      if (!profile.email) continue;

      // Send reminder email
      await notifyUnreadReminder(profile.email, receiverName, senderName, unread.length);

      // Update last_reminder_sent_at
      await supabase
        .from("chat_room_member")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("chat_room_id", chatRoomId);

      console.log(`Reminder sent to ${profile.email} for room ${chatRoomId}`);
    }
  } catch (err) {
    console.error("Reminder job error:", err.message);
  }
};

export const startMessageReminderJob = () => {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", () => {
    console.log("[cron] Running 24h unread message reminder job...");
    runReminders();
  });

  console.log("[cron] Message reminder job scheduled (every hour)");
};
