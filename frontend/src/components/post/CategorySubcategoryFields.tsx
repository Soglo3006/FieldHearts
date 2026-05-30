"use client";

import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { categories, toCategoryKey } from "@/lib/categories";
import PostSelect from "@/components/post/PostSelect";
import ListingTagsField from "@/components/post/ListingTagsField";

interface Props {
  category: string;
  tags: string[];
  onCategoryChange: (v: string) => void;
  onTagsChange: (tags: string[]) => void;
  categoryRequired?: boolean;
  tagsRequired?: boolean;
}

export default function CategorySubcategoryFields({
  category,
  tags,
  onCategoryChange,
  onTagsChange,
  categoryRequired,
  tagsRequired = true,
}: Props) {
  const { t } = useTranslation();
  const categoryOptions = categories.map((cat) => ({
    value: cat.name,
    label: t(`categories.${toCategoryKey(cat.name)}`, { defaultValue: cat.name }),
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

        <ListingTagsField
          category={category}
          tags={tags}
          onTagsChange={onTagsChange}
          required={tagsRequired}
        />
      </div>
    </div>
  );
}
