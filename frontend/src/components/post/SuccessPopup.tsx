"use client";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  type: "offer" | "looking";
  id: string;
  onClose: () => void;
}

export default function SuccessPopup({ type, id, onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  useScrollLock(true);
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {type === "offer" ? t("post.successServiceTitle") : t("post.successJobTitle")}
        </h2>
        <p className="text-gray-500 mb-6">
          {type === "offer" ? t("post.successServiceDesc") : t("post.successJobDesc")}
        </p>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            onClick={() => router.push(`/serviceDetail/${id}`)}
          >
            {t("post.viewMyPost")}
          </Button>
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={() => router.push("/")}
          >
            {t("post.backToHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
