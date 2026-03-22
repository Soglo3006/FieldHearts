"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useChats } from '@/hooks/useChats';
import { useMessages } from '@/hooks/useMessages';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { ProfileSidebar } from '@/components/messages/ProfileSidebar';
import { WifiOff } from 'lucide-react';
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
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function MessagesContent() {
  const { t } = useTranslation();
  const { user } = useProtectedRoute({ requireAuth: true, requireProfileCompleted: true });

  const searchParams = useSearchParams();
  const chatIdFromUrl = searchParams.get('chat');
  const router = useRouter();

  const { chats, loading: chatsLoading, clearUnreadCount, archiveChat, removeChat, updateLastMessage } = useChats();
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
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [blockCheckLoading, setBlockCheckLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string; content: string; user_id: string; sender_name?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

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
  const prevChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeChatId && activeChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = activeChatId;
      setIsSwitching(true);
      const t = setTimeout(() => setIsSwitching(false), 350);
      return () => clearTimeout(t);
    }
  }, [activeChatId]);
  const isMessagesLoading = messagesLoading || loadedChatId !== activeChatId || isSwitching;
  const { toggleReaction } = useMessageReactions();
  const { deleteMessage } = useDeleteMessage();
  const { markChatAsRead } = useMarkAsRead();
  const { markReadByLink } = useNotifications();
  const { editMessage } = useEditMessage();
  const { togglePin } = usePinMessage();

  const activeChat = chats.find(c => c.id === activeChatId);
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
    if (!chats.length) return;
    if (chatIdFromUrl) { setActiveChatId(chatIdFromUrl); if (isMobile) setShowMobileChat(true); return; }
    if (!activeChatId) {
      const firstId = chats[0].id;
      setActiveChatId(firstId);
      router.replace(`/messages?chat=${firstId}`);
      if (isMobile) setShowMobileChat(true);
    }
  }, [chats, chatIdFromUrl, activeChatId, isMobile, router]);

  useEffect(() => { if (activeChatId) setShowMobileChat(true); }, [activeChatId]);

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

  const handleUnblock = async () => {
    if (!user?.id || !activeChat?.other_user?.id) return;
    const { error } = await supabase.from('blocked_users').delete()
      .eq('blocker_id', user.id).eq('blocked_user_id', activeChat.other_user.id);
    if (!error) setIsBlocked(false);
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !attachedFile) return;
    try {
      let fileUrl = null;
      if (attachedFile) {
        const fileExt = attachedFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, attachedFile);
        if (uploadError) { toast.error(t("messages.failedToUpload")); return; }
        const { data } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
        fileUrl = data.publicUrl;
      }
      const now = new Date().toISOString();
      if (messageInput.trim() && fileUrl) {
        await sendMessage(messageInput.trim(), replyingTo?.id || null);
        await sendMessage(`[FILE:${fileUrl}]`, null);
        if (activeChatId) updateLastMessage(activeChatId, `[FILE:${fileUrl}]`, user?.id || '', now);
      } else if (fileUrl) {
        await sendMessage(`[FILE:${fileUrl}]`, replyingTo?.id || null);
        if (activeChatId) updateLastMessage(activeChatId, `[FILE:${fileUrl}]`, user?.id || '', now);
      } else {
        await sendMessage(messageInput.trim(), replyingTo?.id || null);
        if (activeChatId) updateLastMessage(activeChatId, messageInput.trim(), user?.id || '', now);
      }
      setMessageInput('');
      removeAttachment();
      setReplyingTo(null);
    } catch {
      toast.error(t("messages.failedToSend"));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleChatSelect = (chatId: string) => {
    if (chatId === activeChatId) { setShowMobileChat(true); return; }
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
    try {
      const fileName = `${user?.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, audioBlob, { contentType: 'audio/webm' });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
      const audioContent = `[AUDIO:${data.publicUrl}:${duration}]`;
      await sendMessage(audioContent, null);
      if (activeChatId) updateLastMessage(activeChatId, audioContent, user?.id || '', new Date().toISOString());
    } catch {
      toast.error(t("messages.failedToSendVoice"));
    }
  };

  const handleBackToList = () => { setShowMobileChat(false); setShowMobileSidebar(false); setShowSettings(false); router.replace('/messages'); };

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

  const otherUserName = activeChat?.other_user?.account_type === 'company'
    ? activeChat?.other_user?.company_name || ''
    : activeChat?.other_user?.full_name || '';

  if (chatsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 shrink-0">
            <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 font-medium">{t("messages.offlineBanner")}</p>
          </div>
        )}

        <div className="flex-1 max-w-[1600px] w-full mx-auto p-0 sm:p-5 min-h-0 flex flex-col">
          <div className="bg-white sm:rounded-xl shadow-sm overflow-hidden flex-1 min-h-0">
            <div className="flex h-full min-h-0">

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
                />
              </div>

              {/* Colonne 2 : Zone de messages */}
              <div className={`${(isLargeScreen || (isMobile ? showMobileChat : true)) && (!showMobileSidebar || isLargeScreen) ? 'flex' : 'hidden'} flex-1 min-w-0 flex-col bg-white min-h-0 overflow-hidden`}>
                {activeChat ? (
                  <>
                    <ChatHeader
                      otherUser={activeChat.other_user}
                      isOtherOnline={isOtherOnline}
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
                  <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("messages.noConversations")}</h3>
                      <p className="text-gray-600">{t("messages.startConversation")}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Colonne 3 : Panneau About */}
              <div className={`${isLargeScreen || showMobileSidebar ? 'flex' : 'hidden'} ${isLargeScreen ? 'w-72 shrink-0' : 'flex-1'} border-l bg-white min-h-0`}>
                {showSettings ? (
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
                ) : (
                  <ProfileSidebar
                    otherUser={activeChat?.other_user}
                    onClose={!isLargeScreen ? () => setShowMobileSidebar(false) : undefined}
                    onOpenSettings={!isLargeScreen ? () => setShowSettings(true) : undefined}
                    isBlocked={isBlocked}
                    isBlockedByOther={isBlockedByOther}
                    blockCheckLoading={blockCheckLoading}
                  />
                )}
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
