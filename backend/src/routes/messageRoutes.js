import express from 'express';
import pool from '../config/db.js';
import { notifyNewMessage } from '../services/emailService.js';
import { pushNewMessage } from '../services/pushService.js';
import { createLocalizedNotification, getUserLang, shouldSendEmail } from '../services/notificationService.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/** Friendly in-app / email body when the chat payload is a photo, file, or voice note. */
function formatMessagePreviewBodies(messagePreview) {
  if (!messagePreview) {
    return {
      en: 'You have a new message',
      fr: 'Vous avez un nouveau message',
    };
  }
  if (messagePreview.includes('[AUDIO:')) {
    return { en: 'Voice message', fr: 'Message vocal' };
  }
  if (messagePreview.includes('[FILE:')) {
    const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(messagePreview);
    return isImage
      ? { en: 'Photo', fr: 'Photo' }
      : { en: 'File', fr: 'Fichier' };
  }
  const truncated = messagePreview.substring(0, 100);
  return { en: truncated, fr: truncated };
}

/**
 * GET /api/messages/unread-summary
 * Returns all chat summaries for the authenticated user in a single SQL query.
 * Replaces N×3 Supabase REST calls in useUnreadMessages.ts.
 */
router.get('/unread-summary', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT
         crm.chat_room_id,
         m_last.id                                                        AS last_message_id,
         m_last.content                                                   AS last_message_content,
         m_last.created_at                                                AS last_message_time,
         m_last.user_id                                                   AS last_message_user_id,
         m_last.deleted_at                                                AS last_message_deleted_at,
         COUNT(m_unread.id)                                               AS unread_count,
         other_crm.user_id                                                AS other_user_id,
         COALESCE(NULLIF(other_u.company_name, ''), other_u.full_name)    AS other_user_name,
         other_u.avatar                                                   AS avatar_url,
         other_u.account_type
       FROM chat_room_member crm
       JOIN LATERAL (
         SELECT id, content, created_at, user_id, deleted_at
         FROM messages
         WHERE chat_room_id = crm.chat_room_id
           AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1
       ) m_last ON true
       LEFT JOIN messages m_unread
         ON  m_unread.chat_room_id = crm.chat_room_id
         AND m_unread.user_id     != $1
         AND m_unread.read_at     IS NULL
         AND m_unread.deleted_at  IS NULL
       LEFT JOIN chat_room_member other_crm
         ON  other_crm.chat_room_id = crm.chat_room_id
         AND other_crm.user_id     != $1
       LEFT JOIN users other_u ON other_u.id = other_crm.user_id
       WHERE crm.user_id    = $1
         AND crm.is_deleted = false
       GROUP BY
         crm.chat_room_id,
         m_last.id, m_last.content, m_last.created_at, m_last.user_id, m_last.deleted_at,
         other_crm.user_id, other_u.company_name, other_u.full_name,
         other_u.avatar, other_u.account_type
       ORDER BY m_last.created_at DESC`,
      [userId]
    );

    res.json(rows.map(r => ({
      chat_room_id:             r.chat_room_id,
      last_message_id:          r.last_message_id,
      last_message_content:     r.last_message_content,
      last_message_time:        r.last_message_time,
      last_message_user_id:     r.last_message_user_id,
      last_message_deleted_at:  r.last_message_deleted_at,
      unread_count:             Number(r.unread_count),
      other_user_id:            r.other_user_id,
      other_user_name:          r.other_user_name,
      avatar_url:               r.avatar_url,
      account_type:             r.account_type,
    })));
  } catch (err) {
    console.error('unread-summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/messages/notify
 * Sends push/email notification for a new message.
 * All queries use pool (direct DB) — zero Supabase REST egress.
 */
router.post('/notify', protect, async (req, res) => {
  try {
    const { chatRoomId, messagePreview } = req.body;
    const senderUserId = req.user.id;
    if (!chatRoomId) return res.status(400).json({ error: 'Missing fields' });

    // Verify sender is a member of this chat room
    const memberCheck = await pool.query(
      `SELECT user_id FROM chat_room_member WHERE chat_room_id = $1 AND user_id = $2`,
      [chatRoomId, senderUserId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat room' });
    }

    // Get all other members of this chat room
    const membersResult = await pool.query(
      `SELECT user_id, is_deleted, is_muted FROM chat_room_member
       WHERE chat_room_id = $1 AND user_id != $2`,
      [chatRoomId, senderUserId]
    );
    if (membersResult.rows.length === 0) return res.json({ sent: false });

    const receiverMember = membersResult.rows[0];
    const receiverId = receiverMember.user_id;

    if (receiverMember.is_deleted) {
      return res.json({ sent: false, reason: 'conversation deleted by receiver' });
    }

    // Count messages in this conversation (to detect first message)
    const countResult = await pool.query(
      `SELECT COUNT(*) AS cnt FROM messages WHERE chat_room_id = $1 AND deleted_at IS NULL`,
      [chatRoomId]
    );
    const isFirstMessage = Number(countResult.rows[0]?.cnt ?? 0) <= 1;

    // Fetch sender + receiver profiles
    const profilesResult = await pool.query(
      `SELECT id, email,
              COALESCE(NULLIF(company_name, ''), full_name) AS display_name,
              account_type
       FROM users WHERE id = ANY($1)`,
      [[senderUserId, receiverId]]
    );
    const profiles = profilesResult.rows;
    const sender   = profiles.find(p => p.id === senderUserId);
    const receiver = profiles.find(p => p.id === receiverId);
    const senderName = sender?.display_name || 'Quelqu\'un';

    // Push notification (if not muted)
    if (!receiverMember.is_muted) {
      const presenceResult = await pool.query(
        `SELECT active_chat_id FROM user_presence WHERE user_id = $1`,
        [receiverId]
      );
      const alreadyViewing = presenceResult.rows[0]?.active_chat_id === chatRoomId;
      if (!alreadyViewing) {
        pushNewMessage(receiverId, senderName).catch(() => {});
      }
    }

    const previewBodies = formatMessagePreviewBodies(messagePreview);

    // In-app notification
    createLocalizedNotification({
      userId: receiverId,
      type: 'message',
      link: `/messages?chat=${chatRoomId}`,
      en: {
        title: `New message from ${senderName}`,
        body: previewBodies.en,
      },
      fr: {
        title: `Nouveau message de ${senderName}`,
        body: previewBodies.fr,
      },
    });

    // Email only on first message
    if (!isFirstMessage) return res.json({ sent: false, reason: 'not first message' });
    if (!receiver?.email) return res.json({ sent: false });

    // Check if receiver is online
    const presenceResult = await pool.query(
      `SELECT last_seen FROM user_presence WHERE user_id = $1`,
      [receiverId]
    );
    const lastSeen = presenceResult.rows[0]?.last_seen;
    const isOnline = lastSeen && new Date(lastSeen) > new Date(Date.now() - 60 * 1000);
    if (isOnline) return res.json({ sent: false, reason: 'user online' });

    const canEmail = await shouldSendEmail(receiverId, 'message');
    if (canEmail) {
      const lang = await getUserLang(receiverId);
      const emailPreview = lang === 'en' ? previewBodies.en : previewBodies.fr;
      await notifyNewMessage(
        receiver.email,
        receiver.display_name || 'là',
        senderName,
        emailPreview,
        chatRoomId,
        lang,
      );
    }

    res.json({ sent: true });
  } catch (err) {
    console.error('notify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
