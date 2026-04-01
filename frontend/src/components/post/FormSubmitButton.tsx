"use client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Props {
  disabled: boolean;
  submitting: boolean;
  label: string;
  note: string;
}

export default function FormSubmitButton({ disabled, submitting, label, note }: Props) {
  const { t } = useTranslation();

  return (
    <div className="pt-4">
      <Button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold rounded-xl h-14 cursor-pointer"
        disabled={disabled || submitting}
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t("post.submitting")}
          </span>
        ) : label}
      </Button>
      <p className="text-center text-gray-500 text-sm mt-3">{note}</p>
    </div>
  );
}
