// frontend/src/components/home/Header.tsx
"use client";
import { useTranslation } from "react-i18next";
import { Search, User, Settings, LogOut, Building2, List, Wallet, X, CalendarDays, ClipboardList, Menu, Heart, MessageCircle, MessageSquareText, Bell, ChevronLeft, ChevronDown, Check, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Badge } from "@/components/ui/badge";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuthResumeAction } from "@/hooks/useAuthResumeAction";
import { useMyProfile } from "@/hooks/useMyProfile";
import { isAdminUser } from "@/lib/auth";
import { resolveHeaderDisplayName, resolveUnedenAvatarUrl } from "@/lib/userDisplay";
import {
  isProfileDetailsIncomplete,
  profileCompletionPath,
  type ProfileForCompletion,
} from "@/lib/onboardingSteps";
import Link from "next/link";
import { PostPublishLink } from "@/components/navigation/PostPublishLink";
import { createPortal } from "react-dom";
import SettingsPage from "@/components/profile/Settings";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import MessageNotifications from "@/components/messages/MessageNotifications";
import NotificationBell from "@/components/notifications/NotificationBell";
import SupportModal from "@/components/support/SupportModal";
import CompleteProfileModal from "@/components/profile/CompleteProfileModal";
import { OverlayModal } from "@/components/ui/OverlayModal";
import { useUnreadBookings } from "@/hooks/useUnreadBookings";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useWalletBadge } from "@/hooks/useWalletBadge";
import { formatTranslatedCategoryTrail } from "@/lib/categories";
import { formatListingPriceLine } from "@/lib/listingPrice";
import { getLanguageCode, getLanguageToggleValue } from "@/lib/locale";
import AppImage from "@/components/ui/AppImage";

/** Hauteur commune : barre de recherche, menus, langue, connexion, publier */
const HEADER_CONTROL_H = "h-9";

interface SearchResult {
  id: string;
  title: string;
  pricing_mode?: string | null;
  price: number | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  location: string;
  image_url: string | null;
  category_name: string | null;
  subcategory: string | null;
}

interface UserDropdownProps {
  avatarUrl: string;
  displayName: string | undefined;
  fallbackInitial: string;
  unseenCount: number;
  profileData: (ProfileForCompletion & { company_name?: string; avatar?: string }) | null;
  profileSubtitle?: string;
  isPerson: boolean;
  isCompany: boolean;
  profileDetailsIncomplete: boolean;
  completeProfileHref: string;
  user: { id: string; email?: string } | null;
  setShowSettings: (v: boolean) => void;
  onOpenSupport: () => void;
  handleSignOut: () => void;
}

function UserDropdown({ avatarUrl, displayName, fallbackInitial, unseenCount, profileData, profileSubtitle, isPerson, isCompany, profileDetailsIncomplete, completeProfileHref, user, setShowSettings, onOpenSupport, handleSignOut }: UserDropdownProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="relative cursor-pointer">
          <Avatar className="h-9 w-9 lg:h-10 lg:w-10 border-4 border-white shadow-lg">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName || "User"} /> : null}
            <AvatarFallback className="text-sm bg-green-100 text-green-800 font-semibold">{fallbackInitial}</AvatarFallback>
          </Avatar>
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {!profileDetailsIncomplete && (
          <>
            <div className="px-2 py-2">
              <p className="text-sm font-medium">{displayName || user?.email}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {profileSubtitle && (
                <p className="text-xs text-gray-400 mt-1">
                  <span>{profileSubtitle}</span>
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {profileDetailsIncomplete ? (
          <DropdownMenuItem asChild>
            <Link href={completeProfileHref} className="cursor-pointer flex items-center">
              {isCompany ? <Building2 className="mr-2 h-4 w-4" /> : <User className="mr-2 h-4 w-4" />}
              <span>{t("header.completeProfile")}</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/wallet" className="cursor-pointer flex items-center">
                <Wallet className="mr-2 h-4 w-4" />
                <span>{t("header.wallet")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my-listings" className="cursor-pointer flex items-center">
                <List className="mr-2 h-4 w-4" />
                <span>{t("header.listings")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/bookings" className="cursor-pointer flex items-center">
                <ClipboardList className="mr-2 h-4 w-4" />
                <span>{t("header.bookings")}</span>
                {unseenCount > 0 && (
                  <span className="ml-auto h-5 min-w-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/calendar" className="cursor-pointer flex items-center">
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>{t("header.calendar")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/profile/${user?.id}`} className="cursor-pointer flex items-center">
                {isPerson ? <User className="mr-2 h-4 w-4" /> : <Building2 className="mr-2 h-4 w-4" />}
                <span>{t("header.profile")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <div className="cursor-pointer flex items-center" onClick={() => setShowSettings(true)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t("header.settings")}</span>
              </div>
            </DropdownMenuItem>
            {isAdminUser(user as Parameters<typeof isAdminUser>[0]) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer flex items-center text-green-700">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenSupport} className="cursor-pointer">
          <MessageSquareText className="mr-2 h-4 w-4" />
          <span>{t("support.button")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("header.logOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const { requireAuth, notifyAuthActionReady } = useAuthGate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Controlled value for Post Type select — resets when leaving /listings
  const isOnListings = pathname === "/listings";
  const urlType = searchParams.get("type");
  const postTypeValue = isOnListings && urlType ? (urlType === "offer" ? "find" : urlType === "looking" ? "hire" : "all") : "";

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const openSupportModal = () => {
    setShowSupport(true);
    notifyAuthActionReady();
  };

  useAuthResumeAction("support", () => {
    openSupportModal();
  });

  const openSupport = () => {
    if (!user) {
      requireAuth({
        context: "support",
        from: "support",
        onSuccess: openSupportModal,
        resume: { type: "support" },
      });
      return;
    }
    openSupportModal();
  };
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"menu" | "notifications">("menu");
  const { profile: profileData } = useMyProfile();
  const settingsScrollRef = useRef<HTMLDivElement>(null);

  // Live search
  const [headerSearch, setHeaderSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    try { setRecentSearches(JSON.parse(localStorage.getItem("uneden_recent_searches") || "[]")); } catch {}
  }, []);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [searchDropdownStyle, setSearchDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  // Debounced live search
  useEffect(() => {
    const q = headerSearch.trim();
    setFocusedIndex(-1);
    if (q.length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/services?search=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data.slice(0, 5) : []);
          setShowSearchDrop(true);
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [headerSearch]);

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(target)
      ) {
        setShowSearchDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useLayoutEffect(() => {
    const updateSearchDropdownPosition = () => {
      const hasContent = showRecent || searchResults.length > 0 || searchLoading || headerSearch.trim().length > 0;
      if (!searchRef.current || !showSearchDrop || !hasContent) {
        setSearchDropdownStyle(null);
        return;
      }

      const rect = searchRef.current.getBoundingClientRect();
      setSearchDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updateSearchDropdownPosition();

    if (!showSearchDrop) return;

    window.addEventListener("resize", updateSearchDropdownPosition);
    window.addEventListener("scroll", updateSearchDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateSearchDropdownPosition);
      window.removeEventListener("scroll", updateSearchDropdownPosition, true);
    };
  }, [showSearchDrop, searchResults.length, headerSearch]);

  const lang = getLanguageCode(i18n.language);
  const languageToggleValue = getLanguageToggleValue(i18n.language);

  // Highlight matching text
  const highlight = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <strong className="text-gray-900 font-semibold">{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </span>
    );
  };

  const saveRecentSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((r) => r !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    try { localStorage.setItem("uneden_recent_searches", JSON.stringify(updated)); } catch {}
  };

  const removeRecentSearch = (q: string) => {
    const updated = recentSearches.filter((r) => r !== q);
    setRecentSearches(updated);
    try { localStorage.setItem("uneden_recent_searches", JSON.stringify(updated)); } catch {}
  };

  const goToSearch = (q: string) => {
    saveRecentSearch(q);
    setShowSearchDrop(false);
    setHeaderSearch("");
    router.push(`/listings?search=${encodeURIComponent(q.trim())}`);
  };

  // Total items for keyboard nav
  const showRecent = headerSearch.trim().length === 0 && recentSearches.length > 0;
  const navItems = showRecent
    ? recentSearches
    : [...searchResults.map(() => "listing"), "seeAll"];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDrop && e.key !== "Enter") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && showRecent) {
        goToSearch(recentSearches[focusedIndex]);
      } else if (!showRecent && focusedIndex >= 0 && focusedIndex < searchResults.length) {
        const r = searchResults[focusedIndex];
        saveRecentSearch(headerSearch);
        setShowSearchDrop(false);
        setHeaderSearch("");
        router.push(`/serviceDetail/${r.id}`);
      } else {
        goToSearch(headerSearch);
      }
    } else if (e.key === "Escape") {
      setShowSearchDrop(false);
      setFocusedIndex(-1);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const { unseenCount } = useUnreadBookings();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const notifData = useNotifications();
  const { notifications, unreadCount: unreadNotifs, loading: notifsLoading, markRead, markAllRead, deleteOne, clearAll } = notifData;
  const { permission, subscribe } = usePushNotifications();
  const { walletBadge } = useWalletBadge();
  const hasAnyUnread = unseenCount > 0 || unreadMessages > 0 || unreadNotifs > 0 || walletBadge;

  // Ask for push permission once, after user logs in, if not yet decided
  useEffect(() => {
    if (!user) return;
    if (permission === "default") {
      const timer = setTimeout(() => subscribe(), 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, permission]);

  const accountType = profileData?.account_type ?? user?.user_metadata?.account_type;
  const isCompany = accountType === "company";
  const isPerson = !isCompany;
  const profileDetailsIncomplete = isProfileDetailsIncomplete(profileData);
  const completeProfileHref =
    isPerson || isCompany
      ? profileCompletionPath(profileData?.account_type)
      : "/choose_type";
  const displayName = resolveHeaderDisplayName(user, profileData as ProfileForCompletion & { company_name?: string });
  const profileSubtitle = isCompany
    ? (profileData?.industry ?? (typeof user?.user_metadata?.industry === "string" ? user.user_metadata.industry : undefined))
    : (profileData?.profession ?? (typeof user?.user_metadata?.profession === "string" ? user.user_metadata.profession : undefined));
  const avatarUrl = resolveUnedenAvatarUrl((profileData as { avatar?: string } | null)?.avatar);
  const fallbackInitial = (displayName ?? user?.email)?.charAt(0).toUpperCase() || "";
  const postTypeLabel =
    postTypeValue === "find"
      ? t("header.findWork")
      : postTypeValue === "hire"
        ? t("header.hireWorker")
        : t("header.postType");

  return (
    <>
      <div className="relative z-40 w-full border-b border-gray-200 bg-white overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4">

          {/* ── RANGÉE 1 : Logo + Search + actions droite ── */}
          <div className="relative z-10 flex items-center justify-between py-3 gap-3">

            {/* Logo — taille fixe sur tous les écrans */}
            <Link href="/">
              <h1 className="text-2xl font-bold text-green-800 cursor-pointer whitespace-nowrap">
                Uneden
              </h1>
            </Link>

            {/* Search — live dropdown */}
            <div ref={searchRef} className="relative z-20 flex-1 min-w-0">
              <div className={`flex w-full min-w-0 items-center rounded-lg border border-gray-300 px-3 transition-colors hover:border-gray-400 ${HEADER_CONTROL_H}`}>
                <Search className="shrink-0 text-gray-400 mr-2" size={16} />
                <input
                  placeholder={t("header.search")}
                  type="text"
                  value={headerSearch}
                  onChange={(e) => { setHeaderSearch(e.target.value); setShowSearchDrop(true); }}
                  onFocus={() => setShowSearchDrop(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400"
                  autoComplete="off"
                  suppressHydrationWarning
                />
                {searchLoading && <Spinner size="xs" className="ml-2 shrink-0" />}
                {headerSearch && !searchLoading && (
                  <button
                    onClick={() => { setHeaderSearch(""); setSearchResults([]); setFocusedIndex(-1); }}
                    className="cursor-pointer text-gray-400 hover:text-gray-600 ml-1 shrink-0"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Selects + Toggle — lg+ seulement */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className={`w-[110px] lg:w-[130px] xl:w-[140px] ${HEADER_CONTROL_H} shrink-0 border border-gray-300 rounded-lg cursor-pointer text-xs lg:text-sm px-3 flex items-center justify-between bg-white text-left`}>
                    <span className="truncate">{postTypeLabel}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem onClick={() => router.push("/listings")} className="cursor-pointer">{t("header.allPosts")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/listings?type=offer")} className="cursor-pointer">{t("header.findWork")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/listings?type=looking")} className="cursor-pointer">{t("header.hireWorker")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className={`w-[100px] lg:w-[130px] xl:w-[140px] ${HEADER_CONTROL_H} shrink-0 border border-gray-300 rounded-lg cursor-pointer text-xs lg:text-sm px-3 flex items-center justify-between bg-white text-left`}>
                    <span className="truncate">Canada</span>
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem className="cursor-pointer">Canada</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ToggleGroup
                type="single"
                variant="outline"
                value={languageToggleValue}
                className={HEADER_CONTROL_H}
                onValueChange={(val) => { if (val) { const lng = val.toLowerCase(); i18n.changeLanguage(lng); localStorage.setItem("i18nextLng", lng); } }}
              >
                <ToggleGroupItem value="FR" className={`cursor-pointer text-xs px-2 lg:px-3 ${HEADER_CONTROL_H}`}>FR</ToggleGroupItem>
                <ToggleGroupItem value="EN" className={`cursor-pointer text-xs px-2 lg:px-3 ${HEADER_CONTROL_H}`}>EN</ToggleGroupItem>
              </ToggleGroup>


            </div>

            {/* Actions droite */}
            <div className="flex items-center gap-2 shrink-0">

              {/* md+: icônes individuelles */}
              {mounted && !authLoading && user && (
                <div className="hidden md:flex items-center gap-2">
                  {profileDetailsIncomplete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => setShowCompleteProfileModal(true)}
                    >
                      <Heart className="h-5 w-5 text-gray-700" />
                    </Button>
                  ) : (
                    <Link href="/favorites">
                      <Button variant="ghost" size="icon" className="cursor-pointer hover:bg-gray-100">
                        <Heart className="h-5 w-5 text-gray-700" />
                      </Button>
                    </Link>
                  )}
                  <MessageNotifications
                    profileDetailsIncomplete={profileDetailsIncomplete}
                    onRequireCompleteProfile={() => setShowCompleteProfileModal(true)}
                  />
                  <NotificationBell data={notifData} />
                </div>
              )}

              {/* md+: avatar dropdown */}
              <div className="hidden md:flex items-center gap-2">
                {authLoading ? (
                  <div
                    className={`${HEADER_CONTROL_H} w-[148px] rounded-lg bg-gray-200 animate-pulse`}
                    aria-hidden
                  />
                ) : user ? (
                  <UserDropdown
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    fallbackInitial={fallbackInitial}
                    unseenCount={unseenCount}
                    profileData={profileData}
                    profileSubtitle={profileSubtitle}
                    isPerson={isPerson}
                    isCompany={isCompany}
                    profileDetailsIncomplete={profileDetailsIncomplete}
                    completeProfileHref={completeProfileHref}
                    user={user}
                    setShowSettings={setShowSettings}
                    onOpenSupport={openSupport}
                    handleSignOut={handleSignOut}
                  />
                ) : (
                  <Link href="/login">
                    <Button variant="outline" className={`${HEADER_CONTROL_H} cursor-pointer`}>
                      {t("header.loginRegister") || "Se connecter / S'inscrire"}
                    </Button>
                  </Link>
                )}
              </div>

              {/* md+: bouton + */}
              <PostPublishLink className="hidden md:block">
                <Button className={`${HEADER_CONTROL_H} bg-green-700 text-white hover:bg-green-800 cursor-pointer`}>
                  {t("header.post")}
                </Button>
              </PostPublishLink>

              {/* Mobile only: bouton + */}
              <PostPublishLink className="md:hidden">
                <Button size="icon" className="bg-green-700 text-white hover:bg-green-800 cursor-pointer font-bold text-lg">
                  +
                </Button>
              </PostPublishLink>

              {/* Mobile only: hamburger — only shown when logged in */}
              {!authLoading && user && (
                <div className="relative md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <Menu className="h-5 w-5 text-gray-700" />
                  </Button>
                  {hasAnyUnread && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white pointer-events-none" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RANGÉE 2 : Filtres — < lg (mobile + iPad Mini) ── */}
          <div className="flex lg:hidden items-center justify-center gap-2 pb-3">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                {/* Slightly narrower when not logged in to fit support + login buttons */}
                <button className={`h-9 shrink-0 border border-gray-300 rounded-lg cursor-pointer text-xs px-3 flex items-center justify-between bg-white text-left ${user ? "w-[130px]" : "w-[115px]"}`}>
                  <span className="truncate">{postTypeLabel}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem onClick={() => router.push("/listings")} className="cursor-pointer">{t("header.allPosts")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/listings?type=offer")} className="cursor-pointer">{t("header.findWork")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/listings?type=looking")} className="cursor-pointer">{t("header.hireWorker")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Canada dropdown — hidden on mobile when not logged in to make room for login button */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className={`h-9 shrink-0 border border-gray-300 rounded-lg cursor-pointer text-xs px-3 flex items-center justify-between bg-white text-left ${user ? "w-[120px]" : "hidden sm:flex w-[120px]"}`}>
                  <span className="truncate">Canada</span>
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[160px]">
                <DropdownMenuItem className="cursor-pointer">Canada</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ToggleGroup type="single" variant="outline" value={languageToggleValue} onValueChange={(val) => { if (val) { const lng = val.toLowerCase(); i18n.changeLanguage(lng); localStorage.setItem("i18nextLng", lng); } }}>
              <ToggleGroupItem value="FR" className={`cursor-pointer text-xs px-2 ${HEADER_CONTROL_H}`}>FR</ToggleGroupItem>
              <ToggleGroupItem value="EN" className={`cursor-pointer text-xs px-2 ${HEADER_CONTROL_H}`}>EN</ToggleGroupItem>
            </ToggleGroup>

            {/* Support + Login — visible on mobile when not logged in (replaces hamburger) */}
            {!authLoading && !user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-gray-600 hover:bg-gray-100 cursor-pointer"
                  onClick={openSupport}
                  title={t("support.button")}
                >
                  <MessageSquareText className="h-5 w-5" />
                </Button>
                <Link href="/login" className="shrink-0">
                  <Button className={`${HEADER_CONTROL_H} px-3 text-xs bg-green-700 hover:bg-green-800 text-white cursor-pointer whitespace-nowrap`}>
                    <span className="sm:hidden">{t("header.login")}</span>
                    <span className="hidden sm:inline">{t("header.loginRegister")}</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

        </div>

        {/* Mobile menu — Sheet shadcn (< md seulement) */}
        <Sheet open={mobileMenuOpen} onOpenChange={(open) => { setMobileMenuOpen(open); if (!open) setMobileView("menu"); }}>
          <SheetContent side="right" className="w-72 p-0 flex flex-col" aria-describedby={undefined}>

            {mobileView === "notifications" ? (
              <>
                {/* Notifications sub-panel */}
                <SheetHeader className="px-4 py-4 border-b border-gray-100">
                  <SheetTitle asChild>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMobileView("menu")}
                        className="cursor-pointer p-1 -ml-1 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 flex-1">{t("notifications.title")}</span>
                      {unreadNotifs > 0 && (
                        <button onClick={markAllRead} className="cursor-pointer text-xs text-green-700 hover:underline">
                          {t("notifications.markAllRead")}
                        </button>
                      )}
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                  {notifsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <Bell className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">{t("notifications.noNotifications")}</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !n.read_at;
                      const diff = Date.now() - new Date(n.created_at).getTime();
                      const timeStr = diff < 60_000
                        ? t("notifications.justNow")
                        : diff < 3_600_000
                        ? t("notifications.minutesAgo", { count: Math.floor(diff / 60_000) })
                        : diff < 86_400_000
                        ? t("notifications.hoursAgo", { count: Math.floor(diff / 3_600_000) })
                        : diff < 7 * 86_400_000
                        ? t("notifications.daysAgo", { count: Math.floor(diff / 86_400_000) })
                        : new Date(n.created_at).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" });
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (isUnread) markRead(n.id);
                            setMobileMenuOpen(false);
                            setMobileView("menu");
                            if (n.link) router.push(n.link);
                          }}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isUnread ? "bg-green-50/50 hover:bg-green-100/40" : "hover:bg-gray-50"}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{timeStr}</p>
                          </div>
                          <div className="shrink-0 flex gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            {isUnread && (
                              <button
                                onClick={() => markRead(n.id)}
                                className="cursor-pointer h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-100 transition-colors"
                                title={t("notifications.markAsRead")}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteOne(n.id)}
                              className="cursor-pointer h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title={t("common.delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="shrink-0 border-t border-gray-100 px-4 py-3">
                    <button onClick={clearAll} className="cursor-pointer text-xs text-gray-400 hover:text-red-500 hover:underline">
                      {t("notifications.clearAll")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Main menu */}
                <SheetHeader className="px-4 py-4 border-b border-gray-100">
                  <SheetTitle asChild>
                    {user ? (
                      profileDetailsIncomplete ? (
                        <span className="text-sm font-semibold text-gray-900">{t("header.completeProfile")}</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow">
                            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName || "User"} /> : null}
                            <AvatarFallback className="text-sm bg-green-100 text-green-800 font-semibold">{fallbackInitial}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{displayName || user?.email}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">{user?.email}</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <span className="text-sm font-semibold text-gray-900">Menu</span>
                    )}
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex-1 overflow-y-auto py-2">
                  {user ? (
                    <>
                      {profileDetailsIncomplete ? (
                        <Link
                          href={completeProfileHref}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {isCompany ? <Building2 className="h-5 w-5 text-gray-400" /> : <User className="h-5 w-5 text-gray-400" />}
                          {t("header.completeProfile")}
                        </Link>
                      ) : (
                        <>
                          <Link href="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Heart className="h-5 w-5 text-gray-400" /> {t("header.favorites")}
                          </Link>
                          <Link href="/messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <MessageCircle className="h-5 w-5 text-gray-400" />
                            <span className="flex-1">{t("header.messages")}</span>
                            {unreadMessages > 0 && (
                              <span className="h-5 min-w-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {unreadMessages > 9 ? "9+" : unreadMessages}
                              </span>
                            )}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setMobileView("notifications")}
                            className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                          >
                            <Bell className="h-5 w-5 text-gray-400" />
                            <span className="flex-1">{t("header.notifications")}</span>
                            {unreadNotifs > 0 && (
                              <span className="h-5 min-w-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {unreadNotifs > 9 ? "9+" : unreadNotifs}
                              </span>
                            )}
                            <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180" />
                          </button>
                          <Link href="/wallet" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Wallet className="h-5 w-5 text-gray-400" />
                            <span className="flex-1">{t("header.wallet")}</span>
                            {walletBadge && <span className="h-2.5 w-2.5 bg-red-500 rounded-full" />}
                          </Link>
                          <Link href="/my-listings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <List className="h-5 w-5 text-gray-400" /> {t("header.listings")}
                          </Link>
                          <Link href="/bookings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <ClipboardList className="h-5 w-5 text-gray-400" />
                            {t("header.bookings")}
                            {unseenCount > 0 && (
                              <span className="ml-auto h-5 min-w-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {unseenCount > 9 ? "9+" : unseenCount}
                              </span>
                            )}
                          </Link>
                          <Link href="/calendar" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <CalendarDays className="h-5 w-5 text-gray-400" />
                            {t("header.calendar")}
                          </Link>
                          <Link href={`/profile/${user?.id}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            {isPerson ? <User className="h-5 w-5 text-gray-400" /> : <Building2 className="h-5 w-5 text-gray-400" />}
                            {t("header.profile")}
                          </Link>
                          <button type="button" onClick={() => { setMobileMenuOpen(false); setShowSettings(true); }} className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                            <Settings className="h-5 w-5 text-gray-400" /> {t("header.settings")}
                          </button>
                          {isAdminUser(user) && (
                            <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-green-700 font-medium hover:bg-green-50 transition-colors">
                              <ShieldCheck className="h-5 w-5" /> Admin
                            </Link>
                          )}
                        </>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={() => { setMobileMenuOpen(false); openSupport(); }} className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <MessageSquareText className="h-5 w-5 text-gray-400" /> {t("support.button")}
                        </button>
                        <button onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="h-5 w-5" /> {t("header.logOut")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setMobileMenuOpen(false); openSupport(); }} className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <MessageSquareText className="h-5 w-5 text-gray-400" /> {t("support.button")}
                      </button>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <User className="h-5 w-5 text-gray-400" /> {t("header.loginRegister")}
                      </Link>
                    </>
                  )}
                </nav>

                <div className="border-t border-gray-100 px-4 py-3">
                  <ToggleGroup type="single" variant="outline" value={languageToggleValue} onValueChange={(val) => { if (val) { const lng = val.toLowerCase(); i18n.changeLanguage(lng); localStorage.setItem("i18nextLng", lng); } }}>
                    <ToggleGroupItem value="FR" className="cursor-pointer text-sm px-4 h-9 flex-1">FR</ToggleGroupItem>
                    <ToggleGroupItem value="EN" className="cursor-pointer text-sm px-4 h-9 flex-1">EN</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </>
            )}

          </SheetContent>
        </Sheet>

        {showSettings && (
          <OverlayModal
            open={showSettings}
            onClose={() => setShowSettings(false)}
            scrollRef={settingsScrollRef}
            maxWidthClassName="max-w-[min(96vw,72rem)]"
          >
            <span className="sr-only">{t("settings.title")}</span>
            <SettingsPage
              onClose={() => setShowSettings(false)}
              scrollRef={settingsScrollRef}
            />
          </OverlayModal>
        )}

        <SupportModal open={showSupport} onClose={() => setShowSupport(false)} />
        <CompleteProfileModal
          open={showCompleteProfileModal}
          onClose={() => setShowCompleteProfileModal(false)}
          accountType={profileData?.account_type}
        />
      </div>
      {typeof document !== "undefined" && showSearchDrop && searchDropdownStyle && createPortal(
        <div
          ref={searchDropdownRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-[480px] overflow-y-auto"
          style={{ top: searchDropdownStyle.top, left: searchDropdownStyle.left, width: searchDropdownStyle.width }}
        >
          {/* ── Recent searches (when input is empty) ── */}
          {showRecent && (
            <>
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {lang === "fr" ? "Recherches récentes" : "Recent searches"}
                </span>
                <button
                  onClick={() => { setRecentSearches([]); localStorage.removeItem("uneden_recent_searches"); }}
                  className="cursor-pointer text-xs text-gray-400 hover:text-gray-600"
                >
                  {lang === "fr" ? "Tout effacer" : "Clear all"}
                </button>
              </div>
              {recentSearches.map((q, i) => (
                <div
                  key={q}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${focusedIndex === i ? "bg-gray-50" : "hover:bg-gray-50"}`}
                >
                  <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <button className="flex-1 text-left text-sm text-gray-700" onClick={() => goToSearch(q)}>{q}</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRecentSearch(q); }}
                    className="cursor-pointer text-gray-300 hover:text-gray-500"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Listing results (from API) ── */}
          {!showRecent && searchResults.length > 0 && (
            <>
              <div className="px-4 pb-1 pt-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {lang === "fr" ? "Annonces" : "Listings"}
                </span>
              </div>
              {searchResults.map((result, i) => {
                const navIdx = i;
                return (
                  <button
                    key={result.id}
                    onClick={() => { saveRecentSearch(headerSearch); setShowSearchDrop(false); setHeaderSearch(""); router.push(`/serviceDetail/${result.id}`); }}
                    className={`cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${focusedIndex === navIdx ? "bg-gray-50" : "hover:bg-gray-50"}`}
                  >
                    {result.image_url ? (
                      <AppImage src={result.image_url} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-sm">🛠️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{highlight(result.title, headerSearch)}</p>
                      {(result.category_name || result.subcategory) && (
                        <p className="text-xs text-gray-400 truncate">
                          {formatTranslatedCategoryTrail(result.category_name, result.subcategory, t)}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-green-700 shrink-0 ml-2 max-w-[7rem] text-right truncate">
                      {formatListingPriceLine(t, result)}
                    </p>
                  </button>
                );
              })}
            </>
          )}

          {/* ── Loading state ── */}
          {!showRecent && searchLoading && searchResults.length === 0 && (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
              <Spinner size="xs" /> {lang === "fr" ? "Recherche..." : "Searching..."}
            </div>
          )}

          {/* ── No results ── */}
          {!showRecent && !searchLoading && headerSearch.trim().length > 0 && searchResults.length === 0 && (
            <div className="px-4 py-5 text-center text-sm text-gray-500">
              {lang === "fr" ? `Aucun résultat pour « ${headerSearch} »` : `No results for "${headerSearch}"`}
            </div>
          )}

          {/* ── See all results ── */}
          {!showRecent && headerSearch.trim().length > 0 && (
            <button
              onClick={() => goToSearch(headerSearch)}
              className={`cursor-pointer w-full flex items-center justify-center gap-2 py-3 text-sm text-green-700 font-semibold hover:bg-green-50 transition-colors border-t border-gray-100 ${focusedIndex === navItems.length - 1 ? "bg-green-50" : ""}`}
            >
              <Search size={13} />
              {t("header.seeAllResults", { query: headerSearch })}
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}