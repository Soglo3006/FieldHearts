import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import ProfilePictureUploader from "@/components/profile/ProfilePicture";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  User, Lock, Bell, Globe, Link2, LogOut, Trash2, ChevronRight, X,
  Mail, Phone, MapPin, Building2, Briefcase, Users, Check, CreditCard, ExternalLink,
} from "lucide-react";
import { Toggle } from "./settings/SubPageHeader";
import ChangePasswordPage from "./settings/ChangePasswordPage";
import BlockedUsersPage from "./settings/BlockedUsersPage";
import { getLanguageCode } from "@/lib/locale";
import LogoutPage from "./settings/LogoutPage";
import DeleteAccountPage from "./settings/DeleteAccountPage";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/Spinner";

type Screen = "default" | "changePassword" | "blockedUsers" | "paymentMethods" | "billingHistory" | "logout" | "deleteAccount";

function PaymentMethodsPage({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50">
      <div className="bg-white border-b relative">
        <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-900 text-xl cursor-pointer">✕</button>
        <button onClick={onBack} className="absolute top-3 left-3 sm:top-4 sm:left-4 text-gray-600 hover:text-gray-900 cursor-pointer text-sm sm:text-base">← {t("common.back")}</button>
        <div className="px-3 sm:px-4 py-4 sm:py-6 text-center">
          <h1 className="text-lg sm:text-3xl font-bold text-gray-900 mt-6 sm:mt-0">{t("settings.paymentMethods")}</h1>
        </div>
      </div>
      <div className="px-3 sm:px-4 py-4 sm:py-8">
        <Card className="p-4 sm:p-6">{t("settings.comingSoon")}</Card>
      </div>
    </div>
  );
}

function BillingHistoryPage({ onClose }: { onBack: () => void; onClose: () => void }) {
  const router = useRouter();
  useEffect(() => {
    onClose();
    router.push("/wallet");
  }, []);
  return null;
}

export default function SettingsPage({ onClose, scrollRef }: { onClose: () => void; scrollRef?: React.RefObject<HTMLDivElement | null> }) {
  const { t, i18n } = useTranslation();
  const { user, session } = useAuth();
  const [userProfilePicture, setUserProfilePicture] = useState("");
  const [profileData, setProfileData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("default");
  const [scrollPosition, setScrollPosition] = useState(0);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [emailPrefs, setEmailPrefs] = useState({
    email_messages: true, email_payments: true, email_listings: true, email_complaints: true,
  });
  const [language, setLanguage] = useState(getLanguageCode(i18n.language));
  const [region, setRegion] = useState("CA");

  // Keep language select in sync if header toggle changes i18n language
  useEffect(() => {
    setLanguage(getLanguageCode(i18n.language));
  }, [i18n.language]);
  const [connectedAccounts, setConnectedAccounts] = useState<{ provider: string; identity_data?: { email?: string } }[]>([]);
  const [stripeStatus, setStripeStatus] = useState<{ connected: boolean; charges_enabled: boolean; details_submitted: boolean } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  const goToScreen = (screenName: Screen) => {
    if (scrollRef?.current) setScrollPosition(scrollRef.current.scrollTop);
    setScreen(screenName);
  };

  const goBack = () => {
    setScreen("default");
    setTimeout(() => {
      if (scrollRef?.current) scrollRef.current.scrollTop = scrollPosition;
    }, 0);
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    let isActive = true;

    const fetchAll = async () => {
      if (!session?.access_token) {
        if (isActive) setLoading(false);
        return;
      }

      try {
        const [profileRes, settingsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: controller.signal,
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/settings`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: controller.signal,
          }),
        ]);

        if (!isActive) return;

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfileData(data);
          setUserProfilePicture(data.avatar || "");
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.region) setRegion(data.region);
        }
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/preferences`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (isActive && data) setEmailPrefs(data);
        }).catch(() => {});
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (isActive && supabaseUser?.identities) setConnectedAccounts(supabaseUser.identities);

        // Fetch Stripe Connect status
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (isActive && data) setStripeStatus(data);
        }).catch(() => {});
      } catch (error) {
        if (!isActive) return;
      } finally {
        if (isActive) {
          window.clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    fetchAll();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  useEffect(() => {
    if (scrollRef?.current) scrollRef.current.scrollTop = 0;
  }, [screen]);

  const saveSettings = async () => {
    if (!session?.access_token) return;
    setSavingSettings(true);
    try {
      const [response] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ language, region }),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/preferences`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(emailPrefs),
        }),
      ]);
      if (response.ok) {
        i18n.changeLanguage(language);
        localStorage.setItem("i18nextLng", language);
        setSettingsSaved(true);
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (error) {
    } finally {
      setSavingSettings(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!session?.access_token) return;
    setStripeLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/connect/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* silent */ } finally {
      setStripeLoading(false);
    }
  };

  if (screen === "changePassword") return <ChangePasswordPage onBack={goBack} onClose={onClose} />;
  if (screen === "blockedUsers") return <BlockedUsersPage onBack={goBack} onClose={onClose} />;
  if (screen === "paymentMethods") return <PaymentMethodsPage onBack={goBack} onClose={onClose} />;
  if (screen === "billingHistory") return <BillingHistoryPage onBack={goBack} onClose={onClose} />;
  if (screen === "logout") return <LogoutPage onBack={goBack} onClose={onClose} />;
  if (screen === "deleteAccount") return <DeleteAccountPage onBack={goBack} onClose={onClose} />;

  const isPerson = profileData?.account_type === "person";
  const isCompany = profileData?.account_type === "company";
  const displayName = isPerson ? profileData?.full_name : profileData?.company_name;
  const isGoogleConnected = connectedAccounts.some(a => a.provider === "google");
  const isFacebookConnected = connectedAccounts.some(a => a.provider === "facebook");
  const isEmailConnected = connectedAccounts.some(a => a.provider === "email");
  const googleEmail = connectedAccounts.find(a => a.provider === "google")?.identity_data?.email;
  const facebookEmail = connectedAccounts.find(a => a.provider === "facebook")?.identity_data?.email;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center bg-gray-50">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b relative">
        {/* Bottom-sheet handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <button aria-label="Close settings" title="Close settings" onClick={onClose} className="absolute top-2 right-2 sm:top-3 sm:right-3 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer leading-none touch-manipulation">
          <X className="h-5 w-5" />
        </button>
        <div className="w-full px-6 py-3 pr-14 sm:px-8 sm:py-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{t("settings.title")}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {isPerson ? t("settings.manageAccount") : t("settings.manageCompany")}
          </p>
        </div>
      </div>

      <div className="w-full px-4 py-4 sm:px-8 sm:py-8">
        <div className="grid gap-4 sm:gap-6">

          {/* Profile Information */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2">
              <div className="flex items-center gap-3">
                {isPerson ? <User className="h-5 w-5 sm:h-6 sm:w-6 text-green-700 shrink-0" /> : <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-700 shrink-0" />}
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-gray-900">
                    {isPerson ? t("settings.profileInfo") : t("settings.companyInfo")}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {isPerson ? t("settings.updatePersonal") : t("settings.updateCompany")}
                  </p>
                </div>
              </div>
              <Link href="/profile/edit" onClick={onClose}>
                <Button variant="outline" size="sm" className="cursor-pointer shrink-0 text-xs sm:text-sm">
                  {t("settings.edit")} <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
              <div className="flex justify-center sm:justify-start">
                <ProfilePictureUploader
                  currentProfilePicture={userProfilePicture}
                  userName={displayName || "User"}
                  onProfileChange={(newPic) => setUserProfilePicture(newPic)}
                  size="xl"
                  showLabel={false}
                  readOnly={true}
                />
              </div>
              <div className="flex-1 space-y-2 sm:space-y-3 w-full">
                <div className="flex items-center gap-3 text-gray-700">
                  {isPerson ? <User className="h-4 w-4 text-gray-400 shrink-0" /> : <Building2 className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className="font-medium text-sm sm:text-base truncate">
                    {displayName || <span className="inline-block h-4 w-32 bg-gray-200 rounded animate-pulse" />}
                  </span>
                  {isCompany && <span className="text-xs text-gray-500 shrink-0">({t("settings.companyNameLabel")})</span>}
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm sm:text-base truncate">
                    {profileData?.email || user?.email || <span className="inline-block h-4 w-48 bg-gray-200 rounded animate-pulse" />}
                  </span>
                </div>
                {profileData?.phone && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm sm:text-base">{profileData.phone}</span>
                  </div>
                )}
                {profileData?.city && profileData?.province && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm sm:text-base">{profileData.city}, {profileData.province}</span>
                  </div>
                )}
                {isPerson && profileData?.profession && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm sm:text-base">{profileData.profession}</span>
                  </div>
                )}
                {isCompany && profileData?.industry && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm sm:text-base">{profileData.industry}</span>
                  </div>
                )}
                {isCompany && profileData?.team_size && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Users className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm sm:text-base">{profileData.team_size} {t("settings.employees")}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Password & Security */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-green-700 shrink-0" />
              <div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900">{t("settings.passwordSecurity")}</h2>
                <p className="text-xs sm:text-sm text-gray-600">{t("settings.managePasswordBlocked")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-between cursor-pointer text-sm" onClick={() => goToScreen("changePassword")}>
                <span>{t("settings.changePassword")}</span><ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between cursor-pointer text-sm" onClick={() => goToScreen("blockedUsers")}>
                <span>{t("settings.blockedUsers")}</span><ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Connected Accounts */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Link2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-700 shrink-0" />
              <div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900">{t("settings.connectedAccounts")}</h2>
                <p className="text-xs sm:text-sm text-gray-600">{t("settings.manageLinkedSignIn")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{t("settings.emailPassword")}</p>
                    <p className="text-xs text-gray-500 truncate">{profileData?.email}</p>
                  </div>
                </div>
                {isEmailConnected ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-xs shrink-0"><Check className="h-3 w-3 mr-1" />{t("settings.connected")}</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500 text-xs shrink-0">{t("settings.notConnected")}</Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">Google</p>
                    <p className="text-xs text-gray-500 truncate">{isGoogleConnected && googleEmail ? googleEmail : t("settings.signInWithGoogle")}</p>
                  </div>
                </div>
                {isGoogleConnected ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-xs shrink-0"><Check className="h-3 w-3 mr-1" />{t("settings.connected")}</Badge>
                ) : (
                  <Button variant="outline" size="sm" className="cursor-pointer text-xs shrink-0"
                    onClick={async () => { await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } }); }}>
                    {t("settings.connect")}
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0">
                    <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">Facebook</p>
                    <p className="text-xs text-gray-500 truncate">{isFacebookConnected && facebookEmail ? facebookEmail : t("settings.signInWithFacebook")}</p>
                  </div>
                </div>
                {isFacebookConnected ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-xs shrink-0"><Check className="h-3 w-3 mr-1" />{t("settings.connected")}</Badge>
                ) : (
                  <Button variant="outline" size="sm" className="cursor-pointer text-xs shrink-0"
                    onClick={async () => { await supabase.auth.linkIdentity({ provider: "facebook", options: { redirectTo: `${window.location.origin}/auth/callback` } }); }}>
                    {t("settings.connect")}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-green-700 shrink-0" />
              <div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900">{t("settings.notifications")}</h2>
                <p className="text-xs sm:text-sm text-gray-600">{t("settings.chooseNotifications")}</p>
              </div>
            </div>
            <div className="space-y-3">
              {(
                [
                  { key: "email_messages",   label: t("settings.notifMessages"),   desc: t("settings.notifMessagesDesc") },
                  { key: "email_payments",   label: t("settings.notifPayments"),   desc: t("settings.notifPaymentsDesc") },
                  { key: "email_listings",   label: t("settings.notifBookings"),   desc: t("settings.notifBookingsDesc") },
                  { key: "email_complaints", label: t("settings.notifComplaints"), desc: t("settings.notifComplaintsDesc") },
                ] as { key: keyof typeof emailPrefs; label: string; desc: string }[]
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{label}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{desc}</p>
                  </div>
                  <Toggle checked={emailPrefs[key]} onChange={() => setEmailPrefs(prev => ({ ...prev, [key]: !prev[key] }))} />
                </div>
              ))}
            </div>
          </Card>

          {/* Language & Region */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-green-700 shrink-0" />
              <div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900">{t("settings.languageRegion")}</h2>
                <p className="text-xs sm:text-sm text-gray-600">{t("settings.setLanguageRegion")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-sm">{t("settings.language")}</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
                  <SelectTrigger className="cursor-pointer text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en" className="cursor-pointer">English</SelectItem>
                    <SelectItem value="fr" className="cursor-pointer">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-sm">{t("settings.region")}</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="cursor-pointer text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CA" className="cursor-pointer">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Billing & Payments */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-green-700 shrink-0" />
              <div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900">{t("settings.billingPayments")}</h2>
                <p className="text-xs sm:text-sm text-gray-600">{t("settings.managePaymentMethods")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-between cursor-pointer text-sm" onClick={() => goToScreen("paymentMethods")}>
                <span>{t("settings.paymentMethods")}</span><ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between cursor-pointer text-sm" onClick={() => goToScreen("billingHistory")}>
                <span>{t("settings.billingHistory")}</span><ChevronRight className="h-4 w-4" />
              </Button>

              {/* Stripe Connect — bank account */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("settings.stripeSection")}</p>
                {stripeStatus === null ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
                    <Spinner size="sm" /> {t("settings.stripeLoading")}
                  </div>
                ) : stripeStatus.charges_enabled ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-800 text-sm">{t("settings.stripeConnected")}</p>
                      <p className="text-xs text-green-600 mt-0.5">{t("settings.stripeConnectedDesc")}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={stripeLoading} className="cursor-pointer shrink-0 text-xs gap-1">
                      {stripeLoading ? <Spinner size="sm" /> : <ExternalLink className="h-3 w-3" />}
                      {t("settings.stripeManage")}
                    </Button>
                  </div>
                ) : stripeStatus.details_submitted ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                      <Spinner size="sm" />
                      <div>
                        <p className="font-semibold text-yellow-800 text-sm">{t("settings.stripeVerifying")}</p>
                        <p className="text-xs text-yellow-700 mt-0.5">{t("settings.stripeVerifyingDesc")}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={stripeLoading} className="cursor-pointer text-xs gap-1">
                      {stripeLoading ? <Spinner size="sm" /> : <ExternalLink className="h-3 w-3" />}
                      {t("settings.stripeCompleteFile")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button onClick={handleConnectStripe} disabled={stripeLoading} className="bg-green-700 hover:bg-green-800 text-white cursor-pointer text-sm gap-2 h-9 rounded-xl px-4">
                      {stripeLoading ? <Spinner size="sm" /> : <ExternalLink className="h-3 w-3" />}
                      {t("settings.stripeConnectAccount")}
                    </Button>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-gray-300" />
                      {t("settings.stripeSecure")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white cursor-pointer h-12 text-sm sm:text-base"
            onClick={saveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {t("settings.saving")}
              </span>
            ) : settingsSaved ? (
              <span className="flex items-center gap-2"><Check className="h-5 w-5" /> {t("settings.settingsSaved")}</span>
            ) : t("settings.saveSettings")}
          </Button>

          <div className="h-px bg-gray-200" />

          {/* Danger Zone */}
          <Card className="p-4 sm:p-6 border-red-200">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-between border-red-200 text-red-600 hover:bg-red-50 cursor-pointer text-sm" onClick={() => goToScreen("logout")}>
                <span className="flex items-center gap-2"><LogOut className="h-4 w-4" />{t("settings.logout")}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-red-200 text-red-600 hover:bg-red-50 cursor-pointer text-sm" onClick={() => goToScreen("deleteAccount")}>
                <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />{t("settings.deleteAccount")}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-3">
              {isPerson ? t("settings.deleteAccountWarning") : t("settings.deleteCompanyAccountWarning")}
            </p>
          </Card>

        </div>
      </div>
    </div>
  );
}
