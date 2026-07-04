"use client";
import { useTranslation } from "react-i18next";

interface Props {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function OneTimeCheckbox({ id, checked, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer"
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="text-sm font-medium text-green-800">{t("post.oneTimeListing")}</span>
        <p className="text-xs text-green-700 mt-0.5">{t("post.oneTimeListingDesc")}</p>
      </label>
    </div>
  );
}
