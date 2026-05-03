"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
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

export default function CategoryNav() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useTranslation();
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
      ? "grid-cols-1"
      : desktopSubcategoryColumnCount === 2
        ? "grid-cols-2"
        : "grid-cols-3";

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
            className="inset-y-0 left-0 h-dvh w-screen max-w-none gap-0 overflow-y-auto border-0 p-0 sm:w-screen sm:max-w-none md:w-screen md:max-w-none lg:w-[min(86vw,68rem)] lg:max-w-none lg:border-r"
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
              <div className="flex min-h-full w-full flex-col bg-white lg:h-full">
                <div className="flex flex-col lg:flex-1 lg:overflow-hidden lg:grid lg:grid-cols-[240px_1px_minmax(0,1.15fr)_1px_minmax(280px,0.85fr)] lg:items-stretch">
                  <aside className="flex flex-col bg-white lg:h-full lg:min-h-0">
                    <div className="border-b border-gray-200 px-5 py-5">
                      <Link
                        href="/listings"
                        className="text-sm font-medium text-green-700 transition-colors hover:text-green-800 hover:underline"
                        onClick={(e) => onNavLinkClick(e, "/listings")}
                      >
                        {t("home.viewAllListings")}
                      </Link>
                    </div>

                    <div className="space-y-1 p-3 lg:flex-1 lg:overflow-y-auto">
                      {categories.map((category) => {
                        const categoryKey = toKey(category.name);
                        const isSelected = activeCategoryName === category.name;

                        return (
                          <button
                            key={category.name}
                            type="button"
                            onClick={() => setActiveCategoryName(category.name)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-white text-green-900 shadow-sm ring-1 ring-green-200"
                                : "text-gray-600 hover:bg-white hover:text-gray-900"
                            }`}
                          >
                            <span className="pr-3 leading-snug">
                              {t(`categories.${categoryKey}`, { defaultValue: category.name })}
                            </span>
                            <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-green-700" : "text-gray-300"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <div className="hidden self-stretch bg-gray-200 lg:block" aria-hidden="true" />

                  <div className="flex flex-col bg-white p-5 sm:p-6 lg:h-full lg:pr-5">
                    <div className="mb-5 border-b border-gray-200 pb-4">
                      <Link
                        href={listingsBrowseHref(activeCategory.name)}
                        className="cursor-pointer text-sm font-medium text-gray-600 transition-colors hover:text-green-700 hover:underline"
                        onClick={(e) =>
                          onNavLinkClick(e, listingsBrowseHref(activeCategory.name))
                        }
                      >
                        {t("home.viewAllIn", { defaultValue: "See all in" })}{" "}
                        {t(`categories.${toKey(activeCategory.name)}`, { defaultValue: activeCategory.name })}
                      </Link>
                    </div>

                    <div className={`hidden ${desktopSubcategoryGridClass} gap-x-10 gap-y-6 overflow-hidden lg:grid`}>
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

                    <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-6 lg:hidden">
                      {activeCategory.subcategories?.map((subcategory) => {
                        const subKey = `${toKey(activeCategory.name)}_${toKey(subcategory)}`;

                        return (
                          <Link
                            key={subcategory}
                            href={listingsBrowseHref(activeCategory.name, subcategory)}
                            className="block w-fit max-w-full justify-self-start border-b-2 border-transparent pb-1 text-left text-sm text-gray-600 transition-colors hover:border-green-500 hover:text-gray-900"
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
                  </div>

                  <div className="hidden self-stretch bg-gray-200 lg:block" aria-hidden="true" />

                  <div className="min-w-0 border-t border-gray-200 bg-white p-5 sm:p-6 lg:border-t-0 lg:pl-5">
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
  );
}
