"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useChats } from '@/hooks/useChats';
import { useMessages } from '@/hooks/useMessages';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { ProfileSidebar } from '@/components/messages/ProfileSidebar';
import { WifiOff, X } from 'lucide-react';
import { Spinner } from "@/components/ui/Spinner";
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useDeleteMessage } from '@/hooks/useDeleteMessage';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useNotifications } from '@/hooks/useNotifications';
import { useEditMessage } from '@/hooks/useEditMessage';
import { usePinMessage } from '@/hooks/usePinMessage';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useIsTyping } from '@/hooks/useIsTyping';
import { usePresence } from '@/hooks/usePresence';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useConversationActions } from '@/hooks/useConversationActions';
import { ConversationSettings } from '@/components/messages/ConversationSettings';
import { ChatHeader } from '@/components/messages/ChatHeader';
import { ChatInputArea } from '@/components/messages/ChatInputArea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { DraftMessagePreparationError, prepareDraftMessageTarget } from '@/lib/draftMessage';

function MessagesContent() {
  const { t } = useTranslation();
  const { user } = useProtectedRoute({ requireAuth: true, requireProfileCompleted: true });
  const { session } = useAuth();

  const searchParams = useSearchParams();
  const chatIdFromUrl = searchParams.get('chat');
  const composeUserIdFromUrl = searchParams.get('compose');
  const router = useRouter();

  const { chats, loading: chatsLoading, clearUnreadCount, archiveChat, removeChat, updateLastMessage, refreshChats } = useChats();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [selectedMessageKey, setSelectedMessageKey] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [manualMobileListView, setManualMobileListView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [blockCheckLoading, setBlockCheckLoading] = useState(false);
  /** Users I blocked (by id) and users who blocked me — used to filter new-message search & suggestions */
  const [idsIBlocked, setIdsIBlocked] = useState<Set<string>>(() => new Set());
  const [idsWhoBlockedMe, setIdsWhoBlockedMe] = useState<Set<string>>(() => new Set());
  const [pendingBlockCheckLoading, setPendingBlockCheckLoading] = useState(false);
  const [pendingIsBlocked, setPendingIsBlocked] = useState(false);
  const [pendingIsBlockedByOther, setPendingIsBlockedByOther] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string; content: string; user_id: string; sender_name?: string;
  } | null>(null);

  // New conversation mode
  const [newConversationMode, setNewConversationMode] = useState(false);
  const [newConvSearch, setNewConvSearch] = useState('');
  const [newConvResults, setNewConvResults] = useState<{
    id: string; full_name?: string; company_name?: string; account_type?: string; avatar_url?: string | null;
  }[]>([]);
  const [newConvSearching, setNewConvSearching] = useState(false);
  const [pendingNewConvUser, setPendingNewConvUser] = useState<{
    id: string; full_name?: string; company_name?: string; account_type?: string; avatar_url?: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const previousChatIdRef = useRef<string | null>(null);
  const previousSidebarChatIdRef = useRef<string | null>(null);
  const [isProfileSidebarLoading, setIsProfileSidebarLoading] = useState(false);

  useEffect(() => {
    const check = () => { setIsMobile(window.innerWidth < 768); setIsLargeScreen(window.innerWidth >= 1024); };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const { messages, loading: messagesLoading, sending, sendMessage, retryMessage, loadedChatId, hasMore, loadingMore, loadMore } = useMessages(activeChatId);
  const [isSwitching, setIsSwitching] = useState(false);
  const [suppressThreadLoading, setSuppressThreadLoading] = useState(false);
  const skipNextSwitchRef = useRef(false);
  const skipNextLoadingRef = useRef(false);
  const prevChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeChatId && activeChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = activeChatId;
      if (skipNextSwitchRef.current) { skipNextSwitchRef.current = false; return; }
      setIsSwitching(true);
      const t = setTimeout(() => setIsSwitching(false), 350);
      return () => clearTimeout(t);
    }
  }, [activeChatId]);
  // Clear the skip flag once messages have loaded for this chat
  if (skipNextLoadingRef.current && loadedChatId === activeChatId && !messagesLoading) {
    skipNextLoadingRef.current = false;
  }
  useEffect(() => {
    if (suppressThreadLoading && loadedChatId === activeChatId && !messagesLoading) {
      setSuppressThreadLoading(false);
    }
  }, [activeChatId, loadedChatId, messagesLoading, suppressThreadLoading]);
  const isMessagesLoading = skipNextLoadingRef.current
    ? false
    : suppressThreadLoading
      ? false
      : messagesLoading || loadedChatId !== activeChatId || isSwitching;
  const { toggleReaction } = useMessageReactions();
  const { deleteMessage } = useDeleteMessage();
  const { markChatAsRead } = useMarkAsRead();
  const { markReadByLink } = useNotifications();
  const { editMessage } = useEditMessage();
  const { togglePin } = usePinMessage();

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeOtherUserId = activeChat?.other_user?.id ?? null;
  const displayedConversationUser = pendingNewConvUser ?? activeChat?.other_user;
  const isPendingConversationTransition = !!pendingNewConvUser && !activeChatId;
  const isMessagingBlockedWith = (uid: string) =>
    Boolean(uid && (idsIBlocked.has(uid) || idsWhoBlockedMe.has(uid)));
  const shouldSyncSidebarLoading =
    !showSettings
    && (isLargeScreen || showMobileSidebar)
    && (!!activeChat || !!pendingNewConvUser);
  const isConversationShellLoading = !!activeChat
    && !newConversationMode
    && !isPendingConversationTransition
    && (
      isSwitching
      || messagesLoading
      || loadedChatId !== activeChatId
      || blockCheckLoading
      || (shouldSyncSidebarLoading && isProfileSidebarLoading)
    );
  useEffect(() => {
    if (!pendingNewConvUser?.id || !activeOtherUserId) return;
    if (activeOtherUserId !== pendingNewConvUser.id) return;
    setPendingNewConvUser(null);
    setNewConversationMode(false);
    previousChatIdRef.current = null;
  }, [activeOtherUserId, pendingNewConvUser?.id]);
  useEffect(() => {
    if (newConversationMode) {
      previousSidebarChatIdRef.current = null;
      setIsProfileSidebarLoading(false);
      return;
    }
    const sidebarKey = activeChatId ?? (pendingNewConvUser?.id ?? null);
    if (!sidebarKey) {
      previousSidebarChatIdRef.current = null;
      setIsProfileSidebarLoading(false);
      return;
    }
    if (sidebarKey !== previousSidebarChatIdRef.current) {
      previousSidebarChatIdRef.current = sidebarKey;
      setIsProfileSidebarLoading(true);
    }
  }, [activeChatId, pendingNewConvUser?.id, newConversationMode]);
  usePresence(user?.id || null);
  const { sendTyping } = useTypingIndicator(activeChatId, user?.id ?? null);
  const isTyping = useIsTyping(activeChatId, activeChat?.other_user?.id);
  const isOtherOnline = useUserPresence(activeChat?.other_user?.id);

  const actions = useConversationActions({
    activeChatId,
    userId: user?.id,
    otherUser: activeChat?.other_user,
    chats,
    isArchived: activeChat?.is_archived || false,
    setIsBlocked,
    setIsMuted,
    setShowSettings,
    setActiveChatId,
    removeChat,
    archiveChat,
    onBlockedUser: (blockedUserId) => {
      setIdsIBlocked((prev) => new Set(prev).add(blockedUserId));
    },
  });

  useEffect(() => {
    if (activeChatId && user?.id && !messagesLoading) {
      const timer = setTimeout(() => {
        markChatAsRead(activeChatId, user.id);
        clearUnreadCount(activeChatId);
        markReadByLink(`chat=${activeChatId}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeChatId, user?.id, messagesLoading, markChatAsRead, clearUnreadCount, markReadByLink]);

  useEffect(() => {
    if (!chatIdFromUrl || chatIdFromUrl === activeChatId) return;
    setManualMobileListView(false);
    setActiveChatId(chatIdFromUrl);
    if (isMobile) setShowMobileChat(true);
  }, [chatIdFromUrl, activeChatId, isMobile]);

  useEffect(() => {
    if (!composeUserIdFromUrl || !user?.id) return;
    if (composeUserIdFromUrl === user.id) return;

    let cancelled = false;
    const existingChat = chats.find((chat) => chat.other_user?.id === composeUserIdFromUrl);
    if (existingChat) {
      setPendingNewConvUser(null);
      setNewConversationMode(false);
      setManualMobileListView(false);
      setActiveChatId(existingChat.id);
      router.replace(`/messages?chat=${existingChat.id}`);
      if (isMobile) setShowMobileChat(true);
      return;
    }

    (async () => {
      try {
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${composeUserIdFromUrl}`, { headers });
        if (!res.ok) {
          if (!cancelled) router.replace('/messages');
          return;
        }
        const profile = await res.json();
        if (cancelled) return;
        setPendingNewConvUser({
          id: composeUserIdFromUrl,
          full_name: profile?.full_name ?? undefined,
          company_name: profile?.company_name ?? undefined,
          account_type: profile?.account_type ?? undefined,
          avatar_url: profile?.avatar_url ?? profile?.avatar ?? null,
        });
        setActiveChatId(null);
        setNewConversationMode(false);
        setManualMobileListView(false);
        if (isMobile) setShowMobileChat(true);
      } catch {
        if (!cancelled) router.replace('/messages');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [composeUserIdFromUrl, chats, user?.id, session?.access_token, router, isMobile]);

  useEffect(() => {
    if (isMobile && manualMobileListView) return;
    if (chatIdFromUrl || composeUserIdFromUrl || activeChatId || !chats.length || newConversationMode || pendingNewConvUser) return;
    const firstId = chats[0].id;
    setManualMobileListView(false);
    setActiveChatId(firstId);
    router.replace(`/messages?chat=${firstId}`);
    if (isMobile) setShowMobileChat(true);
  }, [chats, chatIdFromUrl, composeUserIdFromUrl, activeChatId, isMobile, manualMobileListView, newConversationMode, pendingNewConvUser, router]);

  useEffect(() => {
    if (!activeChatId) return;
    if (isMobile && manualMobileListView) return;
    setShowMobileChat(true);
  }, [activeChatId, isMobile, manualMobileListView]);

  useEffect(() => {
    if (!activeChatId || !user?.id || !activeChat?.other_user?.id) {
      setIsBlocked(false); setIsBlockedByOther(false); setIsMuted(false); setBlockCheckLoading(false);
      return;
    }
    let cancelled = false;
    const chatId = activeChatId;
    const otherUserId = activeChat.other_user.id;
    setBlockCheckLoading(true);
    (async () => {
      const [{ data: iBlockedThem }, { data: theyBlockedMe }, { data: memberRow }] = await Promise.all([
        supabase.from('blocked_users').select('id').eq('blocker_id', user.id).eq('blocked_user_id', otherUserId).maybeSingle(),
        supabase.from('blocked_users').select('id').eq('blocker_id', otherUserId).eq('blocked_user_id', user.id).maybeSingle(),
        supabase.from('chat_room_member').select('is_muted').eq('chat_room_id', chatId).eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setIsBlocked(!!iBlockedThem);
      setIsBlockedByOther(!!theyBlockedMe);
      setIsMuted(!!(memberRow as { is_muted?: boolean } | null)?.is_muted);
      setBlockCheckLoading(false);
    })().catch(() => { if (!cancelled) setBlockCheckLoading(false); });
    return () => { cancelled = true; };
  }, [activeChatId, user?.id, activeChat?.other_user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setIdsIBlocked(new Set());
      setIdsWhoBlockedMe(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: out }, { data: inb }] = await Promise.all([
        supabase.from("blocked_users").select("blocked_user_id").eq("blocker_id", user.id),
        supabase.from("blocked_users").select("blocker_id").eq("blocked_user_id", user.id),
      ]);
      if (cancelled) return;
      setIdsIBlocked(new Set((out ?? []).map((r) => String(r.blocked_user_id))));
      setIdsWhoBlockedMe(new Set((inb ?? []).map((r) => String(r.blocker_id))));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const otherId = pendingNewConvUser?.id;
    if (!otherId || !user?.id || activeChatId) {
      setPendingBlockCheckLoading(false);
      setPendingIsBlocked(false);
      setPendingIsBlockedByOther(false);
      return;
    }
    let cancelled = false;
    setPendingBlockCheckLoading(true);
    (async () => {
      const [{ data: iBlockedThem }, { data: theyBlockedMe }] = await Promise.all([
        supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_user_id", otherId).maybeSingle(),
        supabase.from("blocked_users").select("id").eq("blocker_id", otherId).eq("blocked_user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setPendingIsBlocked(!!iBlockedThem);
      setPendingIsBlockedByOther(!!theyBlockedMe);
      setPendingBlockCheckLoading(false);
    })().catch(() => { if (!cancelled) setPendingBlockCheckLoading(false); });
    return () => { cancelled = true; };
  }, [pendingNewConvUser?.id, user?.id, activeChatId]);

  const handleUnblock = async () => {
    const otherId = activeChat?.other_user?.id ?? pendingNewConvUser?.id;
    if (!user?.id || !otherId) return;
    const { error } = await supabase.from("blocked_users").delete()
      .eq("blocker_id", user.id).eq("blocked_user_id", otherId);
    if (!error) {
      setIsBlocked(false);
      setPendingIsBlocked(false);
      setIdsIBlocked((prev) => {
        const n = new Set(prev);
        n.delete(otherId);
        return n;
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error(t("messages.invalidFileType"));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("messages.fileTooLarge"));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setAttachedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetDraftConversationState = () => {
    setNewConversationMode(false);
    setPendingNewConvUser(null);
    setNewConvSearch('');
    setNewConvResults([]);
    setNewConvSearching(false);
    setSuppressThreadLoading(false);
    setShowSettings(false);
    setShowMobileSidebar(false);
    setReplyingTo(null);
    setMessageInput('');
    setPendingIsBlocked(false);
    setPendingIsBlockedByOther(false);
    setPendingBlockCheckLoading(false);
    removeAttachment();
  };

  const ensureChatForDraftConversation = async (options?: { activate?: boolean }) => {
    if (activeChatId) return activeChatId;
    if (!pendingNewConvUser) return null;
    if (pendingIsBlocked || pendingIsBlockedByOther) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return null;
    }

    const { getOrCreateDirectChat } = await import('@/lib/chatUtils');
    const chatId = await getOrCreateDirectChat(pendingNewConvUser.id);
    if (!chatId) return null;

    if (options?.activate !== false) {
      await refreshChats();
      skipNextSwitchRef.current = true;
      skipNextLoadingRef.current = true;
      handleChatSelect(chatId, { preservePendingUser: true });
    }

    return chatId;
  };

  const activateDraftConversation = async (chatId: string) => {
    await refreshChats();
    skipNextSwitchRef.current = true;
    skipNextLoadingRef.current = true;
    handleChatSelect(chatId, { preservePendingUser: true });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !attachedFile) return;
    if (!activeChatId && pendingNewConvUser && (pendingIsBlocked || pendingIsBlockedByOther)) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return;
    }

    const isDraftConversation = !activeChatId && !!pendingNewConvUser;
    let uploadedFilePath: string | null = null;
    let targetChatId: string | null = null;
    let fileUrl: string | null = null;
    let textSent = false;
    let fileSent = false;

    try {
      const preparedTarget = await prepareDraftMessageTarget<File>({
        attachment: attachedFile,
        createUploadPath: attachedFile
          ? () => {
              const fileExt = attachedFile.name.split('.').pop();
              return `${user?.id}/${Date.now()}.${fileExt}`;
            }
          : undefined,
        uploadAttachment: attachedFile
          ? async (fileName, file) => {
              const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, file);
              if (uploadError) throw uploadError;
              const { data } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
              return data.publicUrl;
            }
          : undefined,
        ensureChat: () => ensureChatForDraftConversation({ activate: false }),
        removeUploadedAttachment: async (fileName) => {
          await supabase.storage.from('chat-attachments').remove([fileName]);
        },
      });

      targetChatId = preparedTarget.chatId;
      uploadedFilePath = preparedTarget.uploadedFilePath;
      fileUrl = preparedTarget.fileUrl;

      const now = new Date().toISOString();
      if (messageInput.trim() && fileUrl) {
        await sendMessage(messageInput.trim(), replyingTo?.id || null, targetChatId);
        textSent = true;
        updateLastMessage(targetChatId, messageInput.trim(), user?.id || '', now);
        await sendMessage(`[FILE:${fileUrl}]`, null, targetChatId);
        fileSent = true;
        updateLastMessage(targetChatId, `[FILE:${fileUrl}]`, user?.id || '', now);
      } else if (fileUrl) {
        await sendMessage(`[FILE:${fileUrl}]`, replyingTo?.id || null, targetChatId);
        fileSent = true;
        updateLastMessage(targetChatId, `[FILE:${fileUrl}]`, user?.id || '', now);
      } else {
        await sendMessage(messageInput.trim(), replyingTo?.id || null, targetChatId);
        textSent = true;
        updateLastMessage(targetChatId, messageInput.trim(), user?.id || '', now);
      }

      if (isDraftConversation) {
        await activateDraftConversation(targetChatId);
      }

      setMessageInput('');
      if (fileSent) {
        removeAttachment();
      }
      setReplyingTo(null);
    } catch (error) {
      if (error instanceof DraftMessagePreparationError) {
        toast.error(t(error.code === 'upload' ? 'messages.failedToUpload' : 'messages.failedToSend'));
        return;
      }

      if (uploadedFilePath && !fileSent) {
        supabase.storage.from('chat-attachments').remove([uploadedFilePath]).catch(() => {});
      }

      if (textSent) {
        setMessageInput('');
        setReplyingTo(null);
      }

      if (isDraftConversation && targetChatId && (textSent || fileSent)) {
        await activateDraftConversation(targetChatId);
      }

      toast.error(t("messages.failedToSend"));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleChatSelect = (chatId: string, options?: { preserveNewConversationMode?: boolean; preservePendingUser?: boolean }) => {
    setManualMobileListView(false);
    if (!options?.preserveNewConversationMode) {
      setNewConversationMode(false);
      previousChatIdRef.current = null;
    }
    if (!options?.preservePendingUser) {
      setPendingNewConvUser(null);
    }
    setNewConvSearch('');
    setNewConvResults([]);
    if (chatId === activeChatId) {
      setShowMobileChat(true);
      setShowMobileSidebar(false);
      setShowSettings(false);
      clearUnreadCount(chatId);
      router.replace(`/messages?chat=${chatId}`);
      return;
    }
    setIsBlocked(false); setIsBlockedByOther(false); setIsMuted(false);
    setBlockCheckLoading(true);
    setActiveChatId(chatId);
    clearUnreadCount(chatId);
    setShowMobileChat(true);
    setShowSettings(false);
    setReplyingTo(null);
    router.push(`/messages?chat=${chatId}`);
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!activeChatId && pendingNewConvUser && (pendingIsBlocked || pendingIsBlockedByOther)) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return;
    }
    const isDraftConversation = !activeChatId && !!pendingNewConvUser;
    let uploadedFilePath: string | null = null;
    let targetChatId: string | null = null;
    let voiceSent = false;

    try {
      const preparedTarget = await prepareDraftMessageTarget<Blob>({
        attachment: audioBlob,
        createUploadPath: () => `${user?.id}/${Date.now()}.webm`,
        uploadAttachment: async (fileName, blob) => {
          const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, blob, { contentType: 'audio/webm' });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
          return data.publicUrl;
        },
        ensureChat: () => ensureChatForDraftConversation({ activate: false }),
        removeUploadedAttachment: async (fileName) => {
          await supabase.storage.from('chat-attachments').remove([fileName]);
        },
      });

      targetChatId = preparedTarget.chatId;
      uploadedFilePath = preparedTarget.uploadedFilePath;

      const audioContent = `[AUDIO:${preparedTarget.fileUrl}:${duration}]`;
      await sendMessage(audioContent, null, targetChatId);
      voiceSent = true;
      updateLastMessage(targetChatId, audioContent, user?.id || '', new Date().toISOString());

      if (isDraftConversation) {
        await activateDraftConversation(targetChatId);
      }
    } catch (error) {
      if (error instanceof DraftMessagePreparationError) {
        toast.error(t("messages.failedToSendVoice"));
        return;
      }

      if (uploadedFilePath && !voiceSent) {
        supabase.storage.from('chat-attachments').remove([uploadedFilePath]).catch(() => {});
      }
      toast.error(t("messages.failedToSendVoice"));
    }
  };

  const handleBackToList = () => {
    if (!activeChatId && pendingNewConvUser) {
      const previousChatId = previousChatIdRef.current;
      resetDraftConversationState();
      previousChatIdRef.current = null;
      setActiveChatId(previousChatId ?? null);
      setManualMobileListView(true);
      setShowMobileChat(false);
      router.replace('/messages');
      return;
    }

    setManualMobileListView(true);
    setShowMobileChat(false);
    setShowMobileSidebar(false);
    setShowSettings(false);
    router.replace('/messages');
  };

  const openNewConversation = () => {
    setManualMobileListView(false);
    previousChatIdRef.current = activeChatId;
    setNewConversationMode(true);
    setPendingNewConvUser(null);
    setNewConvSearch('');
    setNewConvResults([]);
    setNewConvSearching(false);
    setSuppressThreadLoading(false);
    setShowSettings(false);
    setShowMobileSidebar(false);
    setReplyingTo(null);
    setActiveChatId(null);
    router.replace('/messages');
    if (isMobile) setShowMobileChat(true);
  };

  const cancelNewConversation = () => {
    resetDraftConversationState();

    const previousChatId = previousChatIdRef.current;
    previousChatIdRef.current = null;

    if (previousChatId) {
      setManualMobileListView(false);
      setActiveChatId(previousChatId);
      router.replace(`/messages?chat=${previousChatId}`);
      if (isMobile) setShowMobileChat(true);
      return;
    }

    if (isMobile) {
      setManualMobileListView(true);
      setShowMobileChat(false);
    }
  };

  // Search users for new conversation
  useEffect(() => {
    if (!newConversationMode) return;
    if (!newConvSearch.trim()) { setNewConvResults([]); setNewConvSearching(false); return; }
    let cancelled = false;
    setNewConvSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/profiles/search?q=${encodeURIComponent(newConvSearch.trim())}`,
          { headers: { Authorization: `Bearer ${session?.access_token}` } }
        );
        if (!cancelled) {
          const data = res.ok ? await res.json() : [];
          setNewConvResults(data);
          setNewConvSearching(false);
        }
      } catch {
        if (!cancelled) setNewConvSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [newConvSearch, newConversationMode, session?.access_token]);

  const handleSelectNewConvUser = async (otherUserId: string, userInfo: { id: string; full_name?: string; company_name?: string; account_type?: string; avatar_url?: string | null }) => {
    if (isMessagingBlockedWith(otherUserId)) {
      toast.error(t("messages.cannotStartChatBlocked"));
      return;
    }
    setManualMobileListView(false);
    const existingChat = chats.find((chat) => chat.other_user?.id === otherUserId);
    if (existingChat) {
      setPendingNewConvUser(null);
      setSuppressThreadLoading(false);
      handleChatSelect(existingChat.id);
      return;
    }

    // Show a draft conversation shell, but don't create the real chat until first send.
    setNewConversationMode(false);
    setNewConvSearch('');
    setNewConvResults([]);
    setPendingNewConvUser(userInfo);
    setActiveChatId(null);
    setSuppressThreadLoading(false);
    setShowSettings(false);
    setShowMobileSidebar(false);
    router.replace('/messages');
    if (isMobile) setShowMobileChat(true);
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (!element) return;
    const viewport = element.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) {
      const top = viewport.scrollTop + element.getBoundingClientRect().top - viewport.getBoundingClientRect().top - viewport.clientHeight / 2 + element.clientHeight / 2;
      viewport.scrollTo({ top, behavior: 'smooth' });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    element.classList.add('bg-yellow-100');
    setTimeout(() => element.classList.remove('bg-yellow-100'), 2000);
  };

  const otherUserName = displayedConversationUser?.account_type === 'company'
    ? displayedConversationUser?.company_name || ''
    : displayedConversationUser?.full_name || '';

  if (chatsLoading && chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col bg-white min-h-0">
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 shrink-0">
            <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 font-medium">{t("messages.offlineBanner")}</p>
          </div>
        )}

        <div className="flex-1 max-w-400 w-full mx-auto p-0 sm:p-5 min-h-0 flex flex-col">
          <div className="bg-white sm:rounded-xl shadow-sm overflow-hidden flex-1 min-h-0">
            <div className="flex h-full min-h-0 overflow-hidden">

              {/* Colonne 1 : Liste des conversations */}
              <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex w-full md:w-64 lg:w-80 border-r flex-col bg-white min-h-0`}>
                <ConversationList
                  chats={chats}
                  activeChatId={activeChatId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onChatSelect={handleChatSelect}
                  currentUserId={user?.id || null}
                  loading={chatsLoading}
                  onNewConversation={openNewConversation}
                  newConversationMode={newConversationMode}
                  pendingUser={pendingNewConvUser}
                />
              </div>

              {/* Colonne 2 : Zone de messages */}
              <div className={`${(isLargeScreen || (isMobile ? showMobileChat : true)) && (!showMobileSidebar || isLargeScreen) ? 'flex' : 'hidden'} relative flex-1 min-w-0 flex-col bg-white min-h-0 max-h-full overflow-hidden`}>
                {isPendingConversationTransition ? (
                  <>
                    <ChatHeader
                      otherUser={displayedConversationUser || undefined}
                      isOtherOnline={false}
                      isSwitching={false}
                      showSettings={showSettings}
                      showMobileSidebar={showMobileSidebar}
                      isLargeScreen={isLargeScreen}
                      onBack={handleBackToList}
                      onToggleInfo={() => {
                        if (isLargeScreen) {
                          return;
                        }
                        setShowMobileSidebar(true);
                        setShowSettings(false);
                      }}
                    />

                    <MessageThread
                      messages={messages}
                      loading={false}
                      currentUserId={user?.id || ''}
                      otherUser={displayedConversationUser}
                      hoveredMessageId={hoveredMessageId}
                      setHoveredMessageId={setHoveredMessageId}
                      openMenuKey={openMenuKey}
                      setOpenMenuKey={setOpenMenuKey}
                      selectedMessageKey={selectedMessageKey}
                      setSelectedMessageKey={setSelectedMessageKey}
                      retryMessage={retryMessage}
                      isTyping={false}
                      hasMore={false}
                      loadingMore={false}
                      loadMore={undefined}
                      onReply={(message) => setReplyingTo({
                        id: message.id,
                        content: message.content,
                        user_id: message.user_id,
                        sender_name: message.sender?.account_type === 'company'
                          ? message.sender.company_name
                          : message.sender?.full_name,
                      })}
                      onReplyClick={scrollToMessage}
                      onReactionToggle={async (messageId, emoji, currentReactions) => {
                        if (!user?.id) return;
                        await toggleReaction(messageId, emoji, user.id, currentReactions);
                      }}
                      onEdit={async (messageId, newContent) => {
                        await editMessage(messageId, newContent);
                      }}
                      onPin={async (messageId, isPinned) => {
                        await togglePin(messageId, isPinned);
                      }}
                      onDelete={async (messageId) => {
                        await deleteMessage(messageId);
                      }}
                    />

                    <ChatInputArea
                      blockCheckLoading={pendingBlockCheckLoading}
                      isBlocked={pendingIsBlocked}
                      isBlockedByOther={pendingIsBlockedByOther}
                      replyingTo={replyingTo}
                      onCancelReply={() => setReplyingTo(null)}
                      otherUserName={otherUserName}
                      onUnblock={handleUnblock}
                      messageInput={messageInput}
                      onMessageChange={setMessageInput}
                      onSend={handleSendMessage}
                      onKeyPress={handleKeyPress}
                      onVoiceMessage={handleVoiceMessage}
                      sending={sending}
                      attachedFile={attachedFile}
                      attachmentPreview={attachmentPreview}
                      onFileSelect={handleFileSelect}
                      onRemoveAttachment={removeAttachment}
                      fileInputRef={fileInputRef}
                    />
                  </>
                ) : newConversationMode ? (
                  <>
                    {/* "À :" row — aligned with left sidebar search bar height */}
                    <div className="flex items-center gap-2 px-4 border-b shrink-0 h-18.25">
                      <span className="text-sm font-semibold text-gray-500 shrink-0">{t("messages.to")} :</span>
                      <input
                        autoFocus
                        type="text"
                        value={newConvSearch}
                        onChange={(e) => setNewConvSearch(e.target.value)}
                        placeholder={t("messages.searchPeople")}
                        className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent"
                      />
                      {newConvSearch ? (
                        <button type="button" title={t("common.clear", "Clear")} onClick={() => setNewConvSearch('')} className="cursor-pointer text-gray-400 hover:text-gray-600 shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={cancelNewConversation}
                          className="cursor-pointer text-gray-400 hover:text-gray-600 shrink-0"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {/* Contacts / results */}
                    <div className="flex-1 overflow-y-auto">
                      {newConvSearching ? (
                        <div className="flex justify-center py-8"><Spinner size="md" /></div>
                      ) : (() => {
                        const rawRows = newConvSearch.trim()
                          ? newConvResults
                          : chats.filter((c) => !c.is_archived).map((c) => c.other_user).filter(Boolean);
                        const rows = rawRows.filter((u) => {
                          const id = (u as { id?: string })?.id;
                          return Boolean(id && !isMessagingBlockedWith(String(id)));
                        });
                        return rows.length === 0 ? (
                          <div className="py-8 text-center text-gray-400 text-sm">{t("messages.noUsersFound")}</div>
                        ) : (
                        <>
                          {/* Section header */}
                          <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {newConvSearch.trim() ? t("messages.results") : t("messages.suggestedContacts")}
                          </p>
                          {/* Show existing contacts when not searching, search results when searching */}
                          {rows.map((u) => {
                            if (!u) return null;
                            const displayName = (u as { account_type?: string; company_name?: string; full_name?: string; id?: string; avatar_url?: string | null }).account_type === 'company'
                              ? (u as { company_name?: string }).company_name || ''
                              : (u as { full_name?: string }).full_name || '';
                            const uid = (u as { id?: string }).id || '';
                            const avatar = (u as { avatar_url?: string | null }).avatar_url;
                            return (
                              <div
                                key={uid}
                                onClick={() => handleSelectNewConvUser(uid, u as { id: string; full_name?: string; company_name?: string; account_type?: string; avatar_url?: string | null })}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                              >
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
                                  {avatar ? (
                                    <Image src={avatar} alt={displayName} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                                  ) : (
                                    <span className="text-green-800 font-semibold text-sm">{displayName.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="font-medium text-gray-900 text-sm">{displayName}</span>
                              </div>
                            );
                          })}
                        </>
                        );
                      })()}
                    </div>
                  </>
                ) : activeChat ? (
                  <>
                    <ChatHeader
                      otherUser={activeChat.other_user}
                      isOtherOnline={isOtherOnline}
                      isSwitching={isSwitching}
                      showSettings={showSettings}
                      showMobileSidebar={showMobileSidebar}
                      isLargeScreen={isLargeScreen}
                      onBack={handleBackToList}
                      onToggleInfo={() => {
                        if (isLargeScreen) {
                          setShowSettings(!showSettings);
                        } else {
                          setShowMobileSidebar(true);
                          setShowSettings(false);
                        }
                      }}
                    />

                    <MessageThread
                      messages={messages}
                      loading={isMessagesLoading}
                      currentUserId={user?.id || ''}
                      otherUser={activeChat?.other_user}
                      hoveredMessageId={hoveredMessageId}
                      setHoveredMessageId={setHoveredMessageId}
                      openMenuKey={openMenuKey}
                      setOpenMenuKey={setOpenMenuKey}
                      selectedMessageKey={selectedMessageKey}
                      setSelectedMessageKey={setSelectedMessageKey}
                      retryMessage={retryMessage}
                      isTyping={isTyping}
                      hasMore={hasMore}
                      loadingMore={loadingMore}
                      loadMore={loadMore}
                      onReply={(message) => setReplyingTo({
                        id: message.id,
                        content: message.content,
                        user_id: message.user_id,
                        sender_name: message.sender?.account_type === 'company'
                          ? message.sender.company_name
                          : message.sender?.full_name,
                      })}
                      onReplyClick={scrollToMessage}
                      onReactionToggle={async (messageId, emoji, currentReactions) => {
                        if (!user?.id) return;
                        await toggleReaction(messageId, emoji, user.id, currentReactions);
                      }}
                      onEdit={async (messageId, newContent) => {
                        await editMessage(messageId, newContent);
                      }}
                      onPin={async (messageId, isPinned) => {
                        await togglePin(messageId, isPinned);
                      }}
                      onDelete={async (messageId) => {
                        await deleteMessage(messageId);
                      }}
                    />

                    <ChatInputArea
                      blockCheckLoading={blockCheckLoading}
                      isBlocked={isBlocked}
                      isBlockedByOther={isBlockedByOther}
                      replyingTo={replyingTo}
                      onCancelReply={() => setReplyingTo(null)}
                      otherUserName={otherUserName}
                      onUnblock={handleUnblock}
                      messageInput={messageInput}
                      onMessageChange={(val) => { setMessageInput(val); if (val) sendTyping(); }}
                      onSend={handleSendMessage}
                      onKeyPress={handleKeyPress}
                      onVoiceMessage={handleVoiceMessage}
                      sending={sending}
                      attachedFile={attachedFile}
                      attachmentPreview={attachmentPreview}
                      onFileSelect={handleFileSelect}
                      onRemoveAttachment={removeAttachment}
                      fileInputRef={fileInputRef}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-white">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("messages.noConversations")}</h3>
                      <p className="text-gray-600">{t("messages.startConversation")}</p>
                    </div>
                  </div>
                )}

                {isConversationShellLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col bg-white">
                    <div className="shrink-0 border-b bg-white px-4 h-18.25 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1 min-w-0">
                          <Skeleton className="h-4 w-36 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                      </div>
                    </div>

                    <div className="flex-1 bg-white px-4 py-4 space-y-4 overflow-hidden">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className={`flex items-end gap-2 ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                          {index % 2 === 0 ? <Skeleton className="h-8 w-8 rounded-full shrink-0" /> : null}
                          <Skeleton className={`h-10 rounded-2xl ${index % 2 === 0 ? 'w-48' : 'w-40'}`} />
                        </div>
                      ))}
                    </div>

                    <div className="shrink-0 border-t bg-white px-4 py-3">
                      <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                  </div>
                )}
              </div>

              {/* Colonne 3 : Panneau About */}
              <div className={`${(isLargeScreen || showMobileSidebar) && !newConversationMode ? 'flex' : 'hidden'} ${isLargeScreen ? 'w-72 shrink-0' : 'flex-1'} relative border-l bg-white min-h-0`}>
                <div className={showSettings ? 'hidden h-full w-full min-h-0' : 'flex h-full w-full min-h-0'}>
                  <ProfileSidebar
                    otherUser={displayedConversationUser}
                    onClose={!isLargeScreen ? () => setShowMobileSidebar(false) : undefined}
                    onOpenSettings={!isLargeScreen && activeChat ? () => setShowSettings(true) : undefined}
                    isBlocked={pendingNewConvUser ? pendingIsBlocked : isBlocked}
                    isBlockedByOther={pendingNewConvUser ? pendingIsBlockedByOther : isBlockedByOther}
                    blockCheckLoading={pendingNewConvUser ? pendingBlockCheckLoading : blockCheckLoading}
                    accessToken={session?.access_token}
                    onLoadingChange={setIsProfileSidebarLoading}
                  />
                </div>

                {showSettings ? (
                  <div className="absolute inset-0 flex min-h-0 bg-white">
                    <ConversationSettings
                      messages={messages}
                      onMessageClick={scrollToMessage}
                      isBlocked={isBlocked}
                      onUnblockUser={async () => { await handleUnblock(); setShowSettings(false); }}
                      otherUser={activeChat?.other_user}
                      onClose={() => setShowSettings(false)}
                      backButton={!isLargeScreen}
                      isMuted={isMuted}
                      onToggleMute={() => actions.handleToggleMute(isMuted)}
                      onDeleteConversation={actions.handleDeleteConversation}
                      onBlockUser={actions.handleBlockUser}
                      onReportUser={actions.handleReportUser}
                      isArchived={activeChat?.is_archived || false}
                      onArchive={actions.handleArchive}
                    />
                  </div>
                ) : null}

                {isConversationShellLoading && (isLargeScreen || showMobileSidebar) ? (
                  <div className="absolute inset-0 z-10 flex flex-col border-l bg-white">
                    <div className="flex h-18.25 shrink-0 items-center justify-between border-b bg-white px-4">
                      <Skeleton className="h-9 w-9 rounded-md" />
                      <Skeleton className="h-5 w-24 rounded" />
                      <Skeleton className="h-9 w-9 rounded-md" />
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden px-6 py-4 space-y-4">
                      <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-24 rounded" />
                      </div>
                      <Skeleton className="h-px w-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full rounded" />
                        <Skeleton className="h-3 w-5/6 rounded" />
                        <Skeleton className="h-3 w-2/3 rounded" />
                      </div>
                      <Skeleton className="h-px w-full" />
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="rounded-xl border bg-white overflow-hidden">
                          <Skeleton className="aspect-video w-full" />
                          <div className="p-3 space-y-2">
                            <Skeleton className="h-3 w-4/5 rounded" />
                            <Skeleton className="h-3 w-1/3 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="shrink-0 border-t bg-white p-4">
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="md" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
