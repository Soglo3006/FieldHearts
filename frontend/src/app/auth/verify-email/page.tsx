"use client";

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-4">
              <Mail className="h-12 w-12 text-green-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("auth.verifyEmail")}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t("auth.verifyEmailDesc")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Important:</strong> Click the link in the email to activate your account.
              The link will expire in 24 hours.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">Didn't receive the email?</p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Check your spam folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and check again</li>
            </ul>
          </div>

          <Link href="/login" className="block">
            <Button className="w-full bg-green-700 hover:bg-green-800 cursor-pointer">
              {t("auth.backToLogin")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
