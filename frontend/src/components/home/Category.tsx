"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import AppImage from "@/components/ui/AppImage";
import { categories } from "@/lib/categories";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const toKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function CategoryNav() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);

  const activeCategory = categories.find((category) => category.name === activeCategoryName) ?? null;

  useEffect(() => {
    if (!activeCategoryName) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setActiveCategoryName(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveCategoryName(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeCategoryName]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  const openCategoryListings = (categoryName: string, subcategory?: string) => {
    const categoryParam = encodeURIComponent(categoryName);
    const subcategoryQuery = subcategory
      ? `&subcategory=${encodeURIComponent(subcategory)}`
      : "";

    setActiveCategoryName(null);
    router.push(`/listings?category=${categoryParam}${subcategoryQuery}`);
  };

  return (
    <div className="w-full border-b border-gray-200 bg-white shadow-sm">
      <div ref={navRef} className="relative mx-auto max-w-7xl px-4 sm:px-5">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => scroll("left")}
            title={t("common.previous", { defaultValue: "Previous" })}
            aria-label={t("common.previous", { defaultValue: "Previous" })}
            className="mr-2 shrink-0 rounded-full border border-gray-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>

          <div
            ref={scrollRef}
            className="flex items-center gap-3 overflow-x-auto py-4 scroll-smooth no-scrollbar"
          >
            <Link href="/listings" className="shrink-0">
              <Button className="cursor-pointer bg-green-700 text-xs text-white hover:bg-green-800 sm:text-sm">
                {t("home.viewAllListings")}
              </Button>
            </Link>

            {categories.map((category) => {
              const catKey = toKey(category.name);
              const isActive = activeCategoryName === category.name;

              return (
                <div key={category.name} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryName(isActive ? null : category.name)}
                    title={t(`categories.${catKey}`, { defaultValue: category.name })}
                    aria-label={t(`categories.${catKey}`, { defaultValue: category.name })}
                    className={`flex h-9 min-w-37.5 items-center justify-between rounded-lg border px-3 text-xs transition-colors sm:h-10 sm:min-w-42.5 sm:px-4 sm:text-sm lg:min-w-45 lg:px-4 lg:text-sm ${
                      isActive
                        ? "border-green-600 bg-green-50 text-green-900 shadow-sm"
                        : "border-gray-300 bg-white text-gray-700 hover:border-green-200 hover:bg-green-50/50"
                    } cursor-pointer`}
                  >
                    <span className="truncate">
                      {t(`categories.${catKey}`, { defaultValue: category.name })}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isActive ? "rotate-180 text-green-700" : "text-gray-400"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scroll("right")}
            title={t("common.next", { defaultValue: "Next" })}
            aria-label={t("common.next", { defaultValue: "Next" })}
            className="ml-2 shrink-0 rounded-full border border-gray-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {activeCategory && (
          <div className="absolute inset-x-4 top-full z-40 mt-3 rounded-[1.75rem] border border-gray-200 bg-white p-0 shadow-[0_16px_36px_rgba(15,23,42,0.10)] lg:hidden sm:inset-x-3">
            <div className="overflow-hidden rounded-[1.75rem]">
              <div className="overflow-hidden border-b border-gray-200 bg-gray-100">
                <div className="relative aspect-video">
                  <AppImage
                    src={activeCategory.image}
                    alt={t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                    fill
                    sizes="(min-width: 640px) 30rem, calc(100vw - 2rem)"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3">
                  <h3 className="text-base font-bold text-gray-900 sm:text-lg">
                    {t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                  </h3>
                  <button
                    type="button"
                    className="cursor-pointer pt-0.5 text-sm font-medium text-gray-500 transition-colors hover:text-green-700 hover:underline"
                    onClick={() => openCategoryListings(activeCategory.name)}
                  >
                    {t("home.viewAllListings")}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeCategory.subcategories?.map((subcategory) => {
                    const subKey = `${toKey(activeCategory.name)}_${toKey(subcategory)}`;

                    return (
                      <button
                        key={subcategory}
                        type="button"
                        onClick={() => openCategoryListings(activeCategory.name, subcategory)}
                        className="flex min-h-11 items-center rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-900"
                      >
                        <span className="leading-snug">
                          {t(`categories.${subKey}`, { defaultValue: subcategory })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeCategory && (
          <div className="absolute inset-x-4 top-full z-40 mt-2 hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.10)] lg:grid lg:grid-cols-[minmax(0,1.15fr)_1px_minmax(240px,0.85fr)] lg:items-stretch sm:inset-x-5">
            <div className="bg-white pr-5">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                  </h3>
                </div>
                <button
                  type="button"
                  className="cursor-pointer text-sm font-medium text-gray-500 transition-colors hover:text-green-700 hover:underline"
                  onClick={() => openCategoryListings(activeCategory.name)}
                >
                  {t("home.viewAllListings")}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                {activeCategory.subcategories?.map((subcategory) => {
                  const subKey = `${toKey(activeCategory.name)}_${toKey(subcategory)}`;

                  return (
                    <button
                      key={subcategory}
                      type="button"
                      onClick={() => openCategoryListings(activeCategory.name, subcategory)}
                      className="flex min-h-11 items-center rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-900"
                    >
                      <span className="leading-snug">
                        {t(`categories.${subKey}`, { defaultValue: subcategory })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden self-stretch bg-gray-200 lg:block" aria-hidden="true" />

            <div className="pl-5">
              <div className="relative min-h-84 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <AppImage
                  src={activeCategory.image}
                  alt={t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                  fill
                  sizes="(min-width: 1024px) 28vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="max-w-88 rounded-xl border border-white/65 bg-white/76 p-3 shadow-sm backdrop-blur-sm">
                    <p className="text-sm leading-relaxed text-gray-600">
                      {t("home.viewAllListings")} {t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name }).toLowerCase()}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
