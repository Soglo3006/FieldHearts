"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { MAX_LISTING_TAGS, getTagSuggestions, toCategoryKey, translateListingTag } from "@/lib/categories";

interface Props {
  category: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  required?: boolean;
}

export default function ListingTagsField({ category, tags, onTagsChange, required }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  const suggestions = useMemo(
    () => getTagSuggestions(input, category, tags),
    [input, category, tags],
  );

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || tags.length >= MAX_LISTING_TAGS) return;
    const exists = tags.some((tag) => toCategoryKey(tag) === toCategoryKey(value));
    if (exists) return;
    onTagsChange([...tags, value]);
    setInput("");
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
    }
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label className="text-base font-medium text-gray-900">
        {t("post.listingTags")} {required && <span className="text-red-500">*</span>}
        <span className="text-gray-500 font-normal text-sm ml-2">
          ({tags.length}/{MAX_LISTING_TAGS})
        </span>
      </Label>
      <p className="text-xs text-gray-500">{t("post.listingTagsHint")}</p>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={tags.length >= MAX_LISTING_TAGS}
              onClick={() => addTag(suggestion)}
              className="cursor-pointer text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + {translateListingTag(suggestion, t)}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("post.listingTagsPlaceholder")}
          disabled={!category || tags.length >= MAX_LISTING_TAGS}
          maxLength={80}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant="secondary"
              className="gap-1 pl-2.5 pr-1 py-1 text-sm font-normal bg-green-50 text-green-800 border border-green-200"
            >
              {translateListingTag(tag, t)}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="cursor-pointer rounded-full p-0.5 hover:bg-green-100"
                aria-label={t("post.removeTag")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
