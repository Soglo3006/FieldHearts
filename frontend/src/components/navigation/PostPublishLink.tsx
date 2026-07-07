"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { POST_PATH } from "@/lib/postRoutes";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";

type PostPublishLinkProps = {
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
};

export function PostPublishLink({ children, className, prefetch = false }: PostPublishLinkProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { requireAuth, notifyAuthActionReady } = useAuthGate();

  const goToPublish = () => {
    router.push(POST_PATH);
    notifyAuthActionReady();
  };

  useAuthResumeAction("publish", () => {
    goToPublish();
  });

  const openPublishLogin = () => {
    requireAuth({
      context: "publish",
      redirect: POST_PATH,
      from: "publish",
      onSuccess: goToPublish,
      resume: { type: "publish" },
    });
  };

  if (!loading && !user) {
    return (
      <span
        role="button"
        tabIndex={0}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          openPublishLogin();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPublishLogin();
          }
        }}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={POST_PATH} className={className} prefetch={prefetch}>
      {children}
    </Link>
  );
}
