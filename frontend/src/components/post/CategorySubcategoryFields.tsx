"use client";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { categories } from "@/lib/categories";
import PostSelect from "@/components/post/PostSelect";

const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

interface Props {
  category: string;
  subcategory: string;
  onCategoryChange: (v: string) => void;
  onSubcategoryChange: (v: string) => void;
  categoryRequired?: boolean;
}

export default function CategorySubcategoryFields({
  category, subcategory,
  onCategoryChange, onSubcategoryChange,
  categoryRequired,
}: Props) {
  const { t } = useTranslation();
  const categoryOptions = categories.map((cat) => ({
    value: cat.name,
    label: t(`categories.${toKey(cat.name)}`, { defaultValue: cat.name }),
  }));
  const subcategoryOptions = (categories.find((c) => c.name === category)?.subcategories ?? []).map((sub) => ({
    value: sub,
    label: t(`categories.${toKey(category)}_${toKey(sub)}`, { defaultValue: sub }),
  }));

  return (
    <div className="pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">
            {t("post.category")} {categoryRequired && <span className="text-red-500">*</span>}
          </Label>
          <PostSelect
            value={category}
            onValueChange={onCategoryChange}
            placeholder={t("post.selectCategory")}
            options={categoryOptions}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium text-gray-900">{t("post.subcategory")}</Label>
          <PostSelect
            value={subcategory}
            onValueChange={onSubcategoryChange}
            placeholder={t("post.selectSubcategory")}
            options={subcategoryOptions}
            disabled={!category}
            allowClear
          />
        </div>
      </div>
    </div>
  );
}
