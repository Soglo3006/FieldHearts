"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type OAuthProvider = "google" | "facebook";

function GoogleOAuthSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 shrink-0 animate-spin rounded-full border-2",
        "border-[#EA4335] border-t-[#4285F4] border-r-[#34A853] border-b-[#FBBC05]",
        className,
      )}
      aria-hidden
    />
  );
}

function FacebookOAuthSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#1877F2] border-t-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

type SocialOAuthButtonsProps = {
  googleLabel: string;
  facebookLabel: string;
  redirectTo?: string;
  fullWidth?: boolean;
};

export function SocialOAuthButtons({
  googleLabel,
  facebookLabel,
  redirectTo,
  fullWidth = true,
}: SocialOAuthButtonsProps) {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [oauthError, setOauthError] = useState("");

  const widthClass = fullWidth ? "w-full" : "";

  const handleGoogle = async () => {
    setOauthError("");
    setLoading("google");
    try {
      await signInWithGoogle({ redirectTo });
    } catch {
      setLoading(null);
      setOauthError(t("login.loginFailed"));
    }
  };

  const handleFacebook = async () => {
    setOauthError("");
    setLoading("facebook");
    try {
      await signInWithFacebook({ redirectTo });
    } catch {
      setLoading(null);
      setOauthError(t("login.loginFailed"));
    }
  };

  return (
    <>
      {oauthError ? (
        <div className="mb-2 rounded-md bg-red-50 p-3 text-sm text-red-600">{oauthError}</div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          type="button"
          className={cn("flex cursor-pointer items-center justify-center", widthClass)}
          disabled={loading !== null}
          aria-busy={loading === "google"}
          aria-label={loading === "google" ? googleLabel : undefined}
          onClick={handleGoogle}
        >
          {loading === "google" ? (
            <GoogleOAuthSpinner />
          ) : (
            <>
              <FcGoogle className="shrink-0" />
              {googleLabel}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          type="button"
          className={cn("flex cursor-pointer items-center justify-center", widthClass)}
          disabled={loading !== null}
          aria-busy={loading === "facebook"}
          aria-label={loading === "facebook" ? facebookLabel : undefined}
          onClick={handleFacebook}
        >
          {loading === "facebook" ? (
            <FacebookOAuthSpinner />
          ) : (
            <>
              <FaFacebookF className="h-5 w-5 shrink-0 text-[#1877F2]" />
              {facebookLabel}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
