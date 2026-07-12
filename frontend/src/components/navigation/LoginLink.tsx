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
import { cn } from "@/lib/utils";

const LoginNavigatingContext = createContext(false);

export function useLoginNavigating() {
  return useContext(LoginNavigatingContext);
}

type LoginLinkProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  prefetch?: boolean;
  onNavigate?: () => void;
};

function isModifiedLinkClick(e: MouseEvent<HTMLAnchorElement>) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

export function LoginLink({
  children,
  className,
  href = "/login",
  prefetch = false,
  onNavigate,
}: LoginLinkProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  const goToLogin = () => {
    onNavigate?.();
    startNavigation(() => {
      router.push(href);
    });
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedLinkClick(e)) return;
    if (isNavigating) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    goToLogin();
  };

  return (
    <LoginNavigatingContext.Provider value={isNavigating}>
      <Link
        href={href}
        className={cn(className, isNavigating && "pointer-events-none opacity-80")}
        prefetch={prefetch}
        aria-busy={isNavigating}
        onClick={onClick}
      >
        {children}
      </Link>
    </LoginNavigatingContext.Provider>
  );
}
