"use client";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { categories } from "@/lib/categories";

const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

interface Props {
  category: string;
  subcategory: string;
  posterType: string;
  onCategoryChange: (v: string) => void;
  onSubcategoryChange: (v: string) => void;
  onPosterTypeChange: (v: string) => void;
  categoryRequired?: boolean;
}

export default function CategorySubcategoryFields({
  category, subcategory, posterType,
  onCategoryChange, onSubcategoryChange, onPosterTypeChange,
  categoryRequired,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">
            {t("post.category")} {categoryRequired && <span className="text-red-500">*</span>}
          </Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-12 cursor-pointer">
              <SelectValue placeholder={t("post.selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name} className="cursor-pointer">
                  {t(`categories.${toKey(cat.name)}`, { defaultValue: cat.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">{t("post.subcategory")}</Label>
          <Select value={subcategory} onValueChange={onSubcategoryChange} disabled={!category}>
            <SelectTrigger className="h-12 cursor-pointer">
              <SelectValue placeholder={t("post.selectSubcategory")} />
            </SelectTrigger>
            <SelectContent>
              {(categories.find((c) => c.name === category)?.subcategories ?? []).map((sub) => (
                  <SelectItem key={sub} value={sub} className="cursor-pointer">
                    {t(`categories.${toKey(category)}_${toKey(sub)}`, { defaultValue: sub })}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">{t("post.typeOfPoster")}</Label>
          <Select value={posterType} onValueChange={onPosterTypeChange}>
            <SelectTrigger className="h-12 cursor-pointer">
              <SelectValue placeholder={t("post.selectPosterType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual" className="cursor-pointer">{t("post.individual")}</SelectItem>
              <SelectItem value="company" className="cursor-pointer">{t("post.company")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
