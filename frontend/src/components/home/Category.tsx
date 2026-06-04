"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import AppImage from "@/components/ui/AppImage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { categories } from "@/lib/categories";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const toKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const MENU_CLOSE_DELAY_MS = 220;

const chunkItems = <T,>(items: T[], chunkSize: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

function isModifiedLinkClick(e: MouseEvent<HTMLAnchorElement>) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** Same query shape as navigateAfterClosingMenu / openCategoryListings */
function listingsBrowseHref(categoryName?: string, subcategory?: string) {
  if (!categoryName) return "/listings";
  const p = new URLSearchParams();
  p.set("category", categoryName);
  if (subcategory) p.set("subcategory", subcategory);
  return `/listings?${p.toString()}`;
}

function CategoryNavInner() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const urlCategoryParam = searchParams.get("category");
  const urlSubcategoryParam = searchParams.get("subcategory");

  // The first category name in the URL (e.g. "Home Services")
  const urlCategoryName = urlCategoryParam?.split(",")[0] ?? null;
  const urlCategory = urlCategoryName
    ? (categories.find((c) => c.name === urlCategoryName) ?? null)
    : null;
  const urlSubcategories = urlSubcategoryParam ? urlSubcategoryParam.split(",") : [];
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const [isNavigating, startNavigationTransition] = useTransition();

  const activeCategory = categories.find((category) => category.name === activeCategoryName) ?? null;
  const activeCategoryColumns = activeCategory?.subcategories
    ? chunkItems(activeCategory.subcategories, 5)
    : [];
  const desktopSubcategoryColumnCount = Math.min(Math.max(activeCategoryColumns.length, 1), 3);
  const desktopSubcategoryGridClass =
    desktopSubcategoryColumnCount === 1
      ? "lg:grid-cols-1"
      : desktopSubcategoryColumnCount === 2
        ? "lg:grid-cols-2"
        : "lg:grid-cols-3";

  useEffect(() => {
    if (!activeCategoryName) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [activeCategoryName]);

  useEffect(() => {
    if (!pendingNavigationPath || activeCategoryName !== null) return;

    const timeoutId = window.setTimeout(() => {
      startNavigationTransition(() => {
        router.push(pendingNavigationPath);
        setPendingNavigationPath(null);
      });
    }, MENU_CLOSE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeCategoryName, pendingNavigationPath, router]);

  /** Une ancre par catégorie (wrapper) — les flèches ne font défiler que ces blocs-là. */
  const CATEGORY_SCROLL_SEL = "[data-category-scroll-anchor]";

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const targets = Array.from(container.querySelectorAll<HTMLElement>(CATEGORY_SCROLL_SEL));
    if (targets.length === 0) return;

    const sl = container.scrollLeft;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const eps = 2;
    const hostRect = container.getBoundingClientRect();

    /** Position dans le contenu scrollable du bord gauche de l’élément (cohérent avec scrollLeft). */
    const contentLeft = (el: HTMLElement) => sl + (el.getBoundingClientRect().left - hostRect.left);

    const scrollToAlign = (el: HTMLElement) => {
      const left = Math.max(0, Math.min(contentLeft(el), maxScroll));
      container.scrollTo({ left, behavior: "smooth" });
    };

    if (direction === "right") {
      if (sl >= maxScroll - eps) return;
      const next = targets.find((t) => contentLeft(t) > sl + eps);
      if (next) scrollToAlign(next);
    } else {
      if (sl <= eps) return;
      const prev = [...targets].reverse().find((t) => contentLeft(t) < sl - eps);
      if (prev) {
        scrollToAlign(prev);
      } else {
        container.scrollTo({ left: 0, behavior: "smooth" });
      }
    }
  };

  const navigateAfterClosingMenu = (path: string) => {
    if (pendingNavigationPath || isNavigating) return;
    setPendingNavigationPath(path);
    setActiveCategoryName(null);
  };

  const isPageTransitioning = pendingNavigationPath !== null || isNavigating;

  const onNavLinkClick = (e: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (isPageTransitioning) {
      e.preventDefault();
      return;
    }
    if (isModifiedLinkClick(e)) return;
    e.preventDefault();
    navigateAfterClosingMenu(path);
  };

  return (
    <>
      <div className="w-full border-b border-gray-200 bg-white shadow-sm">
      <div ref={navRef} className="relative mx-auto max-w-7xl px-4 sm:px-5">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => scroll("left")}
            title={t("common.previous", { defaultValue: "Previous" })}
            aria-label={t("common.previous", { defaultValue: "Previous" })}
            disabled={isPageTransitioning}
            className="mr-2 shrink-0 rounded-full border border-gray-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>

          <div
            ref={scrollRef}
            className="flex items-center overflow-x-auto py-4 scroll-smooth no-scrollbar"
          >
            <Link
              href="/listings"
              className={cn(
                "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-4 py-2 text-xs font-medium transition-colors",
                "bg-green-700 text-white hover:bg-green-800 sm:text-sm",
                isPageTransitioning && "pointer-events-none opacity-50"
              )}
              onClick={(e) => onNavLinkClick(e, "/listings")}
            >
              {t("home.viewAllListings")}
            </Link>

            <div
              className="mx-2 h-4 w-px shrink-0 self-center bg-gray-200 sm:mx-3 sm:h-5"
              aria-hidden="true"
            />

            {categories.map((category, index) => {
              const catKey = toKey(category.name);
              const isActive = activeCategoryName === category.name;

              return (
                <div
                  key={category.name}
                  data-category-scroll-anchor
                  className="flex shrink-0 items-center"
                >
                  {index > 0 && (
                    <div
                      className="mx-2 h-4 w-px self-center bg-gray-200 sm:mx-3 sm:h-5"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveCategoryName(isActive ? null : category.name)}
                    title={t(`categories.${catKey}`, { defaultValue: category.name })}
                    aria-label={t(`categories.${catKey}`, { defaultValue: category.name })}
                    disabled={isPageTransitioning}
                    className={`relative flex h-9 items-center justify-center border-b-2 px-1 text-xs transition-colors sm:h-10 sm:px-2 sm:text-sm lg:px-3 lg:text-sm ${
                      isActive
                        ? "border-green-600 text-green-800"
                        : "border-transparent text-gray-600 hover:border-green-500 hover:text-gray-900"
                    } cursor-pointer`}
                  >
                    <span className="whitespace-nowrap">
                      {t(`categories.${catKey}`, { defaultValue: category.name })}
                    </span>
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
            disabled={isPageTransitioning}
            className="ml-2 shrink-0 rounded-full border border-gray-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <Sheet open={Boolean(activeCategory)} onOpenChange={(open) => { if (!open) setActiveCategoryName(null); }}>
          <SheetContent
            side="left"
            className="inset-y-0 left-0 flex h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden border-0 p-0 sm:w-screen sm:max-w-none md:w-screen md:max-w-none lg:w-[min(86vw,68rem)] lg:max-w-none lg:border-r"
            showCloseButton
            aria-describedby={undefined}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>
                {activeCategory
                  ? t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })
                  : t("home.categories", { defaultValue: "Categories" })}
              </SheetTitle>
            </SheetHeader>

            {activeCategory && (
              <div className="flex min-h-0 flex-1 flex-col bg-white lg:h-full">
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(9.5rem,38%)_minmax(0,1fr)] overflow-hidden lg:grid-cols-[240px_1px_minmax(0,1.15fr)_1px_minmax(280px,0.85fr)] lg:items-stretch">
                  <aside className="flex min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white lg:h-full">
                    <div className="shrink-0 border-b border-gray-200 px-3 py-3 lg:px-5 lg:py-5">
                      <Link
                        href="/listings"
                        className="block text-xs font-medium leading-snug text-green-700 transition-colors hover:text-green-800 hover:underline sm:text-sm"
                        onClick={(e) => onNavLinkClick(e, "/listings")}
                      >
                        {t("home.viewAllListings")}
                      </Link>
                    </div>

                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 sm:p-3">
                      {categories.map((category) => {
                        const categoryKey = toKey(category.name);
                        const isSelected = activeCategoryName === category.name;

                        return (
                          <button
                            key={category.name}
                            type="button"
                            onClick={() => setActiveCategoryName(category.name)}
                            className={`flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left text-xs transition-colors sm:px-3 sm:py-3 sm:text-sm ${
                              isSelected
                                ? "bg-white text-green-900 shadow-sm ring-1 ring-green-200"
                                : "text-gray-600 hover:bg-white hover:text-gray-900"
                            }`}
                          >
                            <span className="pr-2 leading-snug sm:pr-3">
                              {t(`categories.${categoryKey}`, { defaultValue: category.name })}
                            </span>
                            <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-green-700" : "text-gray-300"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <div className="hidden self-stretch bg-gray-200 lg:block" aria-hidden="true" />

                  <div className="flex min-h-0 flex-col overflow-y-auto bg-white p-3 pr-10 sm:p-5 sm:pr-12 lg:h-full lg:p-6 lg:pr-5">
                    <div className="mb-4 shrink-0 border-b border-gray-200 pb-3 sm:mb-5 sm:pb-4">
                      <Link
                        href={listingsBrowseHref(activeCategory.name)}
                        className="block text-xs font-medium leading-snug text-gray-600 transition-colors hover:text-green-700 hover:underline sm:text-sm"
                        onClick={(e) =>
                          onNavLinkClick(e, listingsBrowseHref(activeCategory.name))
                        }
                      >
                        {t("home.viewAllIn")}{" "}
                        {t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                      </Link>
                    </div>

                    {(activeCategory.subcategories?.length ?? 0) > 0 ? (
                      <div
                        className={cn(
                          "grid grid-cols-1 gap-y-3 lg:gap-x-10 lg:gap-y-6",
                          desktopSubcategoryGridClass,
                        )}
                      >
                        {activeCategoryColumns.map((column, columnIndex) => (
                          <div key={`subcategory-column-${columnIndex}`} className="min-w-0 space-y-3">
                            {column.map((subcategory) => {
                              const subKey = `${toKey(activeCategory.name)}_${toKey(subcategory)}`;

                              return (
                                <Link
                                  key={subcategory}
                                  href={listingsBrowseHref(activeCategory.name, subcategory)}
                                  className="block w-fit max-w-full border-b-2 border-transparent pb-1 text-left text-sm text-gray-600 transition-colors hover:border-green-500 hover:text-gray-900"
                                  onClick={(e) =>
                                    onNavLinkClick(
                                      e,
                                      listingsBrowseHref(activeCategory.name, subcategory)
                                    )
                                  }
                                >
                                  <span className="block leading-snug">
                                    {t(`categories.${subKey}`, { defaultValue: subcategory })}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t("home.otherCategoryBrowseHint")}</p>
                    )}

                    {/* Category image — mobile/tablet only (desktop shows it in its own right column) */}
                    {activeCategory.image && (
                      <div className="lg:hidden mt-5 shrink-0">
                        <div className="border-t border-gray-200 pt-4">
                          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                            <AppImage
                              src={activeCategory.image}
                              alt={t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                              fill
                              sizes="(max-width: 1023px) 60vw, 0px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="hidden self-stretch bg-gray-200 lg:block" aria-hidden="true" />

                  <div className="hidden min-w-0 border-t border-gray-200 bg-white p-5 sm:p-6 lg:block lg:border-t-0 lg:pl-5">
                    <div className="relative aspect-4/3 w-full max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                      <AppImage
                        src={activeCategory.image}
                        alt={t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                        fill
                        sizes="(min-width: 1024px) 32vw, (min-width: 640px) 70vw, 88vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>

    {urlCategory && (urlCategory.subcategories?.length ?? 0) > 0 && (
      <div className="w-full border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <div className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
            <Link
              href={listingsBrowseHref(urlCategory.name)}
              className="mr-3 shrink-0 whitespace-nowrap border-r border-gray-200 pr-3 text-xs font-semibold text-green-700 hover:underline"
            >
              {t(`categories.${toKey(urlCategory.name)}`, { defaultValue: urlCategory.name })}
            </Link>
            {urlCategory.subcategories?.map((sub) => {
              const isActive = urlSubcategories.includes(sub);
              return (
                <Link
                  key={sub}
                  href={listingsBrowseHref(urlCategory.name, sub)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors",
                    isActive
                      ? "bg-green-700 text-white font-medium"
                      : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  )}
                >
                  {t(`categories.${toKey(urlCategory.name)}_${toKey(sub)}`, { defaultValue: sub })}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </>
  );
}

export default function CategoryNav() {
  return (
    <Suspense fallback={<div className="w-full border-b border-gray-200 bg-white h-[57px]" />}>
      <CategoryNavInner />
    </Suspense>
  );
}
