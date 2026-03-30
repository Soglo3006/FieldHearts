"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categories } from "@/lib/categories";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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
              <DropdownMenu key={category.name} modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="w-[150px] sm:w-[170px] lg:w-[180px] h-9 cursor-pointer shrink-0 text-xs sm:text-sm border border-gray-300 rounded-lg px-3 flex items-center justify-between bg-white text-left">
                    <span className="truncate">{t(`categories.${catKey}`, { defaultValue: category.name })}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] max-h-80 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => router.push(`/listings?category=${encodeURIComponent(category.name)}`)}
                    className="cursor-pointer font-medium text-green-700"
                  >
                    {t("home.viewAllListings")} ({t(`categories.${catKey}`, { defaultValue: category.name })})
                  </DropdownMenuItem>
                  {category.subcategories?.map((subcategory) => (
                    <DropdownMenuItem
                      key={subcategory}
                      onClick={() => router.push(`/listings?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subcategory)}`)}
                      className="cursor-pointer"
                    >
                      {t(`categories.${catKey}_${toKey(subcategory)}`, { defaultValue: subcategory })}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
