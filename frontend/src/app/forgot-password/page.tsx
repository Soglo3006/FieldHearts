"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.resetError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-green-100 rounded-full p-3">
              <Mail className="h-6 w-6 text-green-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("auth.forgotPassword")}</CardTitle>
          <CardDescription>
            {t("auth.forgotPasswordDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-gray-700 font-medium">{t("auth.resetSent")}</p>
              <p className="text-sm text-gray-500">{t("auth.resetSentTo", { email })}</p>
              <p className="text-sm text-gray-500">{t("auth.checkSpamHint")}</p>
              <Link href="/login">
                <Button variant="outline" className="w-full mt-2">
                  <ArrowLeft className="h-4 w-4 mr-2" /> {t("auth.backToLogin")}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-green-800 hover:bg-green-900"
                disabled={loading}
              >
                {loading ? t("auth.sending") : t("auth.sendResetLink")}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-gray-500">
                  <ArrowLeft className="h-4 w-4 mr-2" /> {t("auth.backToLogin")}
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
