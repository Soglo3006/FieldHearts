"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, ImagePlus, Send, X, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getIntlLocale } from "@/lib/locale";

interface Attachment { url: string; name: string; }

interface DisputeMessage {
  id: string;
  dispute_id: string;
  user_id: string;
  content: string;
  attachments: Attachment[];
  created_at: string;
  sender_name: string;
}

interface Dispute {
  id: string;
  status: string;
  description: string;
  resolution: string | null;
}

interface Props {
  bookingId: string;
  currentUserId: string;
  accessToken: string;
}

export default function DisputeThread({ bookingId, currentUserId, accessToken }: Props) {
  const { t, i18n } = useTranslation();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThread();
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchThread = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/booking/${bookingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDispute(data.dispute);
      setMessages(data.messages);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 4);
    setPhotos(prev => [...prev, ...valid].slice(0, 4));
    const newPreviews = valid.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 4));
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setPhotos(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async (): Promise<Attachment[]> => {
    const results: Attachment[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop();
      const path = `${dispute!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("dispute-attachments").upload(path, file);
      if (error) continue;
      const { data } = supabase.storage.from("dispute-attachments").getPublicUrl(path);
      results.push({ url: data.publicUrl, name: file.name });
    }
    return results;
  };

  const handleSend = async () => {
    if (!dispute || (!content.trim() && photos.length === 0)) return;
    setSending(true);
    try {
      let attachments: Attachment[] = [];
      if (photos.length > 0) {
        setUploading(true);
        attachments = await uploadPhotos();
        setUploading(false);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${dispute.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content: content.trim(), attachments }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || t("disputeThread.sendError"));
        return;
      }
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setContent("");
      setPhotos([]);
      previews.forEach(p => URL.revokeObjectURL(p));
      setPreviews([]);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!dispute) return null;

  const isClosed = dispute.status !== "open";
  const timeLocale = getIntlLocale(i18n.language, { fr: 'fr-FR', en: 'en-CA' });

  return (
    <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/30">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
        <span className="text-sm font-semibold text-red-800">{t("disputeThread.title")}</span>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
          isClosed ? "bg-gray-100 text-gray-500" : "bg-red-100 text-red-700"
        }`}>
          {isClosed ? t("disputeThread.closed") : t("disputeThread.open")}
        </span>
      </div>

      {/* Messages */}
      <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">{t("disputeThread.noMessages")}</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.user_id === currentUserId;
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarFallback className="text-xs bg-green-100 text-green-800 font-semibold">
                  {(msg.sender_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] space-y-1 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                <span className="text-[10px] text-gray-400">
                  {isOwn ? t("disputeThread.you") : msg.sender_name}
                  {" · "}
                  {new Date(msg.created_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.content && (
                  <div className={`text-sm px-3 py-2 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    isOwn
                      ? "bg-red-600 text-white rounded-tr-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                )}
                {msg.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={a.url}
                          alt={a.name}
                          className="h-20 w-20 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Admin resolution note */}
      {dispute.resolution && (
        <div className="mx-4 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
          <span className="font-semibold">{t("disputeThread.adminDecision")}</span>{dispute.resolution}
        </div>
      )}

      {/* Input or closed notice */}
      {isClosed ? (
        <div className="flex items-center justify-center gap-2 py-3 border-t border-red-200 text-xs text-gray-400">
          <Lock className="h-3.5 w-3.5" />
          {t("disputeThread.closedNotice")}
        </div>
      ) : (
        <div className="border-t border-red-200 px-3 py-3 space-y-2 bg-white">
          {/* Photo previews */}
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={t("disputeThread.selectedPhoto", { number: i + 1 })} className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                  <button
                    onClick={() => removePhoto(i)}
                    aria-label={t("common.delete")}
                    title={t("common.delete")}
                    className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full h-4 w-4 flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("disputeThread.replyPlaceholder")}
              className="resize-none min-h-15 text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                aria-label={t("disputeThread.addPhotos")}
                title={t("disputeThread.addPhotos")}
                onChange={(e) => handlePhotos(e.target.files)}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= 4 || sending}
                title={t("disputeThread.addPhotos")}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSend}
                disabled={sending || (!content.trim() && photos.length === 0)}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {uploading && <p className="text-xs text-gray-400">{t("disputeThread.uploadingPhotos")}</p>}
        </div>
      )}
    </div>
  );
}
