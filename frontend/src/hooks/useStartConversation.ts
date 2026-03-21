import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateDirectChat } from '@/lib/chatUtils';
import { toast } from 'sonner';

export function useStartConversation() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const startConversation = async (otherUserId: string) => {
    if (!user) {
      // Rediriger vers login si pas connecté
      router.push('/login');
      return;
    }

    if (user.id === otherUserId) {
      // Ne pas créer de conversation avec soi-même
      toast.error("You cannot message yourself!");
      return;
    }

    setLoading(true);

    try {
      // Créer ou obtenir la conversation
      const chatId = await getOrCreateDirectChat(otherUserId);

      if (chatId) {
        // Rediriger vers la page messages avec ce chat ouvert
        router.push(`/messages?chat=${chatId}`);
      } else {
        toast.error('Failed to create conversation. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { startConversation, loading };
}