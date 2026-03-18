// frontend/src/components/home/Header.tsx
"use client";
import { useTranslation } from "react-i18next";
import { Search, User, Settings, LogOut, Building2, List, Wallet, X, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import Link from "next/link";
import SettingsPage from "@/components/profile/Settings";
import { useRef, useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Heart } from "lucide-react";
import MessageNotifications from "@/components/messages/MessageNotifications";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useUnreadBookings } from "@/hooks/useUnreadBookings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useScrollLock } from "@/hooks/useScrollLock";

interface SearchResult {
  id: string;
  title: string;
  price: number;
  location: string;
  image_url: string | null;
  category_name: string | null;
  subcategory: string | null;
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const { user, signOut, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Controlled value for Post Type select — resets when leaving /listings
  const isOnListings = pathname === "/listings";
  const urlType = searchParams.get("type");
  const postTypeValue = isOnListings && urlType ? (urlType === "offer" ? "find" : urlType === "looking" ? "hire" : "all") : "";

  const [showSettings, setShowSettings] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    account_type?: string;
    full_name?: string;
    company_name?: string;
    avatar?: string;
    profession?: string;
    industry?: string;
  } | null>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);

  // Live search
  const [headerSearch, setHeaderSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !session?.access_token) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/profiles/me`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [user, session]);

  // Debounced live search
  useEffect(() => {
    const q = headerSearch.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowSearchDrop(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/services?search=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data.slice(0, 6) : []);
          setShowSearchDrop(true);
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [headerSearch]);

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  useScrollLock(showSettings);

  const { unseenCount } = useUnreadBookings();
  const { permission, subscribe } = usePushNotifications();

  // Ask for push permission once, after user logs in, if not yet decided
  useEffect(() => {
    if (!user) return;
    if (permission === "default") {
      const timer = setTimeout(() => subscribe(), 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, permission]);

  const isPerson = profileData?.account_type === "person";
  const isCompany = profileData?.account_type === "company";
  const displayName = isPerson ? profileData?.full_name : profileData?.company_name;
  const avatarUrl = profileData?.avatar || user?.user_metadata?.avatar || "";
  const fallbackInitial = displayName
    ? displayName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  const UserDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative cursor-pointer">
          <Avatar className="h-9 w-9 lg:h-10 lg:w-10 border-4 border-white shadow-lg">
            <AvatarImage src={avatarUrl} alt={displayName || "User"} />
            <AvatarFallback className="text-sm bg-green-100 text-green-800 font-semibold">{fallbackInitial}</AvatarFallback>
          </Avatar>
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
          {isCompany && (
            <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-0.5">
              <Building2 className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">{displayName || user?.email}</p>
            {isCompany && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                <Building2 className="h-2.5 w-2.5 mr-1" />
                {t("header.company")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">{user?.email}</p>
          {profileData && (
            <p className="text-xs text-gray-400 mt-1">
              {isPerson && profileData.profession && <span>{profileData.profession}</span>}
              {isCompany && profileData.industry && <span>{profileData.industry}</span>}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
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
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>{t("header.bookings")}</span>
          {unseenCount > 0 && (
              <span className="ml-auto h-5 min-w-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {unseenCount > 9 ? "9+" : unseenCount}
              </span>
            )}
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("header.logOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="w-full border-b border-gray-200 shadow-sm bg-white">
        <div className="max-w-7xl mx-auto px-4">

          {/* ── RANGÉE 1 : Logo + Search + actions droite ── */}
          <div className="flex items-center justify-between py-3 gap-3">

            {/* Logo — taille fixe sur tous les écrans */}
            <Link href="/">
              <h1 className="text-2xl font-bold text-green-800 cursor-pointer whitespace-nowrap">
                Uneden
              </h1>
            </Link>

            {/* Search — live dropdown */}
            <div ref={searchRef} className="relative flex-1 max-w-xs sm:max-w-sm lg:max-w-md">
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-1.5">
                <Search className="shrink-0 text-gray-400 mr-2" size={16} />
                <input
                  placeholder={t("header.search")}
                  type="text"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowSearchDrop(true); }}
                  className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const q = headerSearch.trim();
                      setShowSearchDrop(false);
                      router.push(q ? `/listings?search=${encodeURIComponent(q)}` : "/listings");
                    }
                    if (e.key === "Escape") setShowSearchDrop(false);
                  }}
                />
                {searchLoading && (
                  <Spinner size="xs" className="ml-2 shrink-0" />
                )}
                {headerSearch && !searchLoading && (
                  <button
                    onClick={() => { setHeaderSearch(""); setSearchResults([]); setShowSearchDrop(false); }}
                    className="cursor-pointer text-gray-400 hover:text-gray-600 ml-1 shrink-0"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Dropdown results */}
              {showSearchDrop && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        setShowSearchDrop(false);
                        setHeaderSearch("");
                        router.push(`/serviceDetail/${result.id}`);
                      }}
                      className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      {result.image_url ? (
                        <img src={result.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-base">🛠️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                        {(result.category_name || result.subcategory) && (
                          <p className="text-xs text-gray-400">
                            {[result.category_name, result.subcategory].filter(Boolean).join(" | ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-bold text-green-700">${Number(result.price)}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[80px]">{result.location}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowSearchDrop(false);
                      router.push(`/listings?search=${encodeURIComponent(headerSearch.trim())}`);
                    }}
                    className="cursor-pointer w-full text-center py-3 text-sm text-green-700 font-semibold hover:bg-green-50 transition-colors"
                  >
                    {t("header.seeAllResults", { query: headerSearch })}
                  </button>
                </div>
              )}
            </div>

            {/* Selects + Toggle — desktop seulement */}
            <div className="hidden lg:flex items-center gap-3">
              <Select value={postTypeValue} onValueChange={(val) => {
                if (val === "all") router.push("/listings");
                else if (val === "find") router.push("/listings?type=offer");
                else if (val === "hire") router.push("/listings?type=looking");
              }}>
                <SelectTrigger className="w-[130px] xl:w-[140px] border-gray-300 rounded-lg cursor-pointer">
                  <SelectValue placeholder={t("header.postType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">{t("header.allPosts")}</SelectItem>
                  <SelectItem value="find" className="cursor-pointer">{t("header.findWork")}</SelectItem>
                  <SelectItem value="hire" className="cursor-pointer">{t("header.hireWorker")}</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="canada">
                <SelectTrigger className="w-[130px] xl:w-[140px] border-gray-300 rounded-lg cursor-pointer">
                  <SelectValue placeholder={t("header.location")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{t("header.location")}</SelectLabel>
                    <SelectItem value="canada" className="cursor-pointer">Canada</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <ToggleGroup type="single" variant="outline" value={i18n.language === "fr" ? "FR" : "EN"} onValueChange={(val) => { if (val) { const lng = val.toLowerCase(); i18n.changeLanguage(lng); localStorage.setItem("i18nextLng", lng); } }}>
                <ToggleGroupItem value="EN" className="cursor-pointer text-sm px-3 h-8">EN</ToggleGroupItem>
                <ToggleGroupItem value="FR" className="cursor-pointer text-sm px-3 h-8">FR</ToggleGroupItem>
              </ToggleGroup>


            </div>

            {/* Actions droite — toujours visibles */}
            <div className="flex items-center gap-2 shrink-0">
              {user && (
                <>
                  <Link href="/favorites">
                    <Button variant="ghost" size="icon" className="cursor-pointer hover:bg-gray-100">
                      <Heart className="h-5 w-5 text-gray-700" />
                    </Button>
                  </Link>
                  <MessageNotifications />
                  <NotificationBell />
                </>
              )}

              {user ? (
                <UserDropdown />
              ) : (
                <Link href="/login">
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    {t("header.loginRegister") || "Se connecter / S'inscrire"}
                  </Button>
                </Link>
              )}

              <Link href="/post">
                <Button className="hidden lg:flex bg-green-700 text-white hover:bg-green-800 cursor-pointer">
                  {t("header.post")}
                </Button>
                <Button size="icon" className="lg:hidden bg-green-700 text-white hover:bg-green-800 cursor-pointer font-bold text-lg">
                  +
                </Button>
              </Link>
            </div>
          </div>

          {/* ── RANGÉE 2 : Filtres centrés — mobile/tablette seulement ── */}
          <div className="flex lg:hidden items-center justify-center gap-2 pb-3">
            <Select value={postTypeValue} onValueChange={(val) => {
              if (val === "all") router.push("/listings");
              else if (val === "find") router.push("/listings?type=offer");
              else if (val === "hire") router.push("/listings?type=looking");
            }}>
              <SelectTrigger className="w-[110px] shrink-0 border-gray-300 rounded-lg cursor-pointer text-xs">
                <SelectValue placeholder={t("header.postType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t("header.allPosts")}</SelectItem>
                <SelectItem value="find" className="cursor-pointer">{t("header.findWork")}</SelectItem>
                <SelectItem value="hire" className="cursor-pointer">{t("header.hireWorker")}</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="canada">
              <SelectTrigger className="w-[100px] shrink-0 border-gray-300 rounded-lg cursor-pointer text-xs">
                <SelectValue placeholder={t("header.location")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t("header.location")}</SelectLabel>
                  <SelectItem value="canada" className="cursor-pointer">Canada</SelectItem>
                  <SelectItem value="USA" className="cursor-pointer">USA</SelectItem>
                  <SelectItem value="UK" className="cursor-pointer">UK</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <ToggleGroup type="single" variant="outline" className="shrink-0" value={i18n.language === "fr" ? "FR" : "EN"} onValueChange={(val) => { if (val) { const lng = val.toLowerCase(); i18n.changeLanguage(lng); localStorage.setItem("i18nextLng", lng); } }}>
              <ToggleGroupItem value="EN" className="cursor-pointer text-xs px-2 h-8">EN</ToggleGroupItem>
              <ToggleGroupItem value="FR" className="cursor-pointer text-xs px-2 h-8">FR</ToggleGroupItem>
            </ToggleGroup>
          </div>

        </div>

        {/* Settings modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
            <div
              className="w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] bg-white rounded-xl shadow-xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200 mx-2 sm:mx-4"
              ref={settingsScrollRef}
            >
              <SettingsPage
                onClose={() => setShowSettings(false)}
                scrollRef={settingsScrollRef}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}