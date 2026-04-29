"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { POST_LOGIN_REDIRECT, POST_PATH } from "@/lib/postRoutes";

type PostPublishLinkProps = {
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
};

export function PostPublishLink({ children, className, prefetch = false }: PostPublishLinkProps) {
  const { user, loading } = useAuth();
  const href = !loading && user ? POST_PATH : POST_LOGIN_REDIRECT;
  return (
    <Link href={href} className={className} prefetch={prefetch}>
      {children}
    </Link>
  );
}
