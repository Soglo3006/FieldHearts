import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { notifyNewMessage } from '../services/emailService.js';
import { pushNewMessage } from '../services/pushService.js';
import { createNotification, shouldSendEmail } from '../services/notificationService.js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/notify', async (req, res) => {
  try {
    const { chatRoomId, senderUserId, messagePreview } = req.body;
    if (!chatRoomId || !senderUserId) return res.status(400).json({ error: 'Missing fields' });

    // Trouver le destinataire (qui n'a pas supprimé la conversation de son côté)
    const { data: members } = await supabase
      .from('chat_room_member')
      .select('user_id, is_deleted, is_muted')
      .eq('chat_room_id', chatRoomId)
      .neq('user_id', senderUserId);

    if (!members?.length) return res.json({ sent: false });

    const receiverMemberRaw = members[0];
    const receiverId = receiverMemberRaw.user_id;

    // Si le destinataire a supprimé la conversation, pas de notification
    if (receiverMemberRaw.is_deleted) return res.json({ sent: false, reason: 'conversation deleted by receiver' });

    // Compter les messages dans cette conversation
    // Si c'est le 1er message → nouvelle conversation → email
    // Sinon → pas d'email (le rappel 24h gère le reste)
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('chat_room_id', chatRoomId)
      .is('deleted_at', null);

    const isFirstMessage = (messageCount ?? 0) <= 1;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_name, account_type')
      .in('id', [senderUserId, receiverId]);

    const sender = profiles?.find(p => p.id === senderUserId);
    const receiver = profiles?.find(p => p.id === receiverId);

    const senderName = sender?.account_type === 'company'
      ? sender.company_name
      : sender?.full_name || 'Quelqu\'un';

    // Envoyer le push seulement si la conversation n'est pas en sourdine
    // ET si le destinataire n'est pas déjà dans cette conversation
    if (!receiverMemberRaw.is_muted) {
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('active_chat_id')
        .eq('user_id', receiverId)
        .single();

      const alreadyViewing = presenceData?.active_chat_id === chatRoomId;
      if (!alreadyViewing) {
        pushNewMessage(receiverId, senderName).catch(() => {});
      }
    }

    // In-app notification for new message
    createNotification({
      userId: receiverId,
      type: "message",
      title: `New message from ${senderName}`,
      body: messagePreview ? messagePreview.substring(0, 100) : "You have a new message",
      link: `/messages?chat=${chatRoomId}`,
    });

    // Email seulement si c'est le 1er message de la conversation
    if (!isFirstMessage) return res.json({ sent: false, reason: 'not first message' });

    if (!receiver?.email) return res.json({ sent: false });

    // Vérifier si le destinataire est en ligne
    const { data: presence } = await supabase
      .from('user_presence')
      .select('last_seen')
      .eq('user_id', receiverId)
      .single();

    const isOnline = presence?.last_seen &&
      new Date(presence.last_seen) > new Date(Date.now() - 60 * 1000);

    if (isOnline) return res.json({ sent: false, reason: 'user online' });

    const receiverName = receiver?.account_type === 'company'
      ? receiver.company_name
      : receiver?.full_name || 'là';

    const canEmail = await shouldSendEmail(receiverId, "message");
    if (canEmail) {
      await notifyNewMessage(
        receiver.email,
        receiverName,
        senderName,
        messagePreview.substring(0, 100),
        chatRoomId
      );
    }

    res.json({ sent: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;