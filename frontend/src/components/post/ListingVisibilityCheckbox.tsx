"use client";
import { useTranslation } from "react-i18next";

interface Props {
  id: string;
  isPublic: boolean;
  onChange: (isPublic: boolean) => void;
}

export default function ListingVisibilityCheckbox({ id, isPublic, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <input
        type="checkbox"
        id={id}
        checked={!isPublic}
        onChange={(e) => onChange(!e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer"
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="text-sm font-medium text-gray-800">{t("post.listingPrivate")}</span>
        <p className="text-xs text-gray-600 mt-0.5">{t("post.listingPrivateDesc")}</p>
      </label>
    </div>
  );
}
