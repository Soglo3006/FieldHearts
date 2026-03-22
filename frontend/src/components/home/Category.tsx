"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories } from "@/lib/categories";
import { ChevronLeft, ChevronRight } from "lucide-react";

const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function CategoryNav() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full border-b border-gray-200 shadow-sm bg-white">
      <div className="relative flex items-center max-w-7xl mx-auto px-4 sm:px-5">

        <button
          onClick={() => scroll("left")}
          className="shrink-0 z-10 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-1.5 shadow-sm transition-colors cursor-pointer mr-2"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-3 py-4 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {/* View all listings button */}
          <Link href="/listings" className="shrink-0">
            <Button className="bg-green-700 text-white hover:bg-green-800 cursor-pointer text-xs sm:text-sm">
              {t("home.viewAllListings")}
            </Button>
          </Link>

          {/* Category dropdowns */}
          {categories.map((category) => {
            const catKey = toKey(category.name);
            return (
              <Select
                key={category.name}
                value=""
                onValueChange={(val) => {
                  if (val === "__all__") {
                    router.push(`/listings?category=${encodeURIComponent(category.name)}`);
                  } else {
                    router.push(`/listings?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(val)}`);
                  }
                }}
              >
                <SelectTrigger className="w-[150px] sm:w-[170px] lg:w-[180px] cursor-pointer shrink-0 text-xs sm:text-sm">
                  <SelectValue placeholder={t(`categories.${catKey}`, { defaultValue: category.name })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="cursor-pointer font-medium text-green-700">
                    {t("home.viewAllListings")} ({t(`categories.${catKey}`, { defaultValue: category.name })})
                  </SelectItem>
                  {category.subcategories?.map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory} className="cursor-pointer">
                      {t(`categories.${catKey}_${toKey(subcategory)}`, { defaultValue: subcategory })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
        </div>

        <button
          onClick={() => scroll("right")}
          className="shrink-0 z-10 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-1.5 shadow-sm transition-colors cursor-pointer ml-2"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>

      </div>
    </div>
  );
}
