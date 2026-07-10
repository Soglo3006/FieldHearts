"use client";

import {
  createContext,
  useContext,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { POST_PATH } from "@/lib/postRoutes";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";
import { cn } from "@/lib/utils";

const PostPublishNavigatingContext = createContext(false);

export function usePostPublishNavigating() {
  return useContext(PostPublishNavigatingContext);
};

type PostPublishLinkProps = {
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
};

function isModifiedLinkClick(e: MouseEvent<HTMLAnchorElement>) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

export function PostPublishLink({ children, className, prefetch = false }: PostPublishLinkProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { requireAuth, notifyAuthActionReady } = useAuthGate();
  const [isNavigating, startNavigation] = useTransition();

  const goToPublish = () => {
    startNavigation(() => {
      router.push(POST_PATH);
      notifyAuthActionReady();
    });
  };

  useAuthResumeAction("publish", goToPublish);

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

  const onAuthenticatedClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedLinkClick(e)) return;
    if (isNavigating) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    goToPublish();
  };

  return (
    <PostPublishNavigatingContext.Provider value={isNavigating}>
      <Link
        href={POST_PATH}
        className={cn(className, isNavigating && "pointer-events-none opacity-80")}
        prefetch={prefetch}
        aria-busy={isNavigating}
        onClick={onAuthenticatedClick}
      >
        {children}
      </Link>
    </PostPublishNavigatingContext.Provider>
  );
}
