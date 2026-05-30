"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { POST_LOGIN_REDIRECT, POST_PATH } from "@/lib/postRoutes";
import CompleteProfileModal from "@/components/profile/CompleteProfileModal";
import { useProfileCompletionGate } from "@/hooks/useProfileCompletionGate";

type PostPublishLinkProps = {
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
};

export function PostPublishLink({ children, className, prefetch = false }: PostPublishLinkProps) {
  const { user, loading } = useAuth();
  const {
    profileDetailsIncomplete,
    guardProfileAction,
    showCompleteProfile,
    setShowCompleteProfile,
    profile,
  } = useProfileCompletionGate();

  if (!loading && !user) {
    return (
      <Link href={POST_LOGIN_REDIRECT} className={className} prefetch={prefetch}>
        {children}
      </Link>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    if (profileDetailsIncomplete) {
      e.preventDefault();
      guardProfileAction();
    }
  };

  return (
    <>
      <Link href={POST_PATH} className={className} prefetch={prefetch} onClick={handleClick}>
        {children}
      </Link>
      <CompleteProfileModal
        open={showCompleteProfile}
        onClose={() => setShowCompleteProfile(false)}
        accountType={profile?.account_type}
      />
    </>
  );
}
