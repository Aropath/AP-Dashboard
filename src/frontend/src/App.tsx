import { useState, useEffect } from "react";
import {
  LayoutDashboard, BarChart2, Lightbulb, TrendingUp,
  FileText, Settings, Menu, X, ChevronDown, Bell,
  Search, CreditCard, LogOut, User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "./context/AuthContext";
import ThemeSwitcher from "./components/ThemeSwitcher";

import OverviewPage from "./pages/OverviewPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import InsightsPage from "./pages/InsightsPage";
import GrowthPlanPage from "./pages/GrowthPlanPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import SignUpPage from "./auth/Signup";
import SignInPage from "./auth/SignIn";

import {
  fetchDashboardData, fetchTrafficAnalysis, fetchTopCountries,
  fetchAcquisitionChannels, fetchPagePerformance,
  fetchProductRevenue, fetchCohortRetention,
} from "./services/fetchMetrics";
import { countryFlags } from "./services/countryFlags";

type Page = "overview" | "analytics" | "insights" | "growth" | "reports" | "settings" | "subscription";
type DateRange = "today" | "7d" | "30d" | "90d" | "custom";

const navItems: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",  label: "Overview",    icon: LayoutDashboard },
  { id: "analytics", label: "Analytics",   icon: BarChart2 },
  { id: "insights",  label: "Insights",    icon: Lightbulb },
  { id: "growth",    label: "Growth Plan", icon: TrendingUp },
  { id: "reports",   label: "Reports",     icon: FileText },
  { id: "settings",  label: "Settings",    icon: Settings },
];

const pageTitles: Record<Page, string> = {
  overview: "Overview", analytics: "Analytics", insights: "AI Insights",
  growth: "Growth Plan", reports: "Reports", settings: "Settings",
  subscription: "Subscription",
};

const dateRangeLabels: Record<DateRange, string> = {
  today: "Today", "7d": "Last 7 days", "30d": "Last 30 days",
  "90d": "Last 90 days", custom: "Custom range",
};

export default function App() {
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const [authPage, setAuthPage] = useState<"signin" | "signup">("signin");

  const [activePage, setActivePage] = useState<Page>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [trafficAnalysis, setTrafficAnalysis] = useState<any[]>([]);
  const [topCountries, setTopCountries] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);
  const [acquisitionChannels, setAcquisitionChannels] = useState<any[]>([]);
  const [landingPageData, setPagePerformance] = useState<any[]>([]);
  const [revenueByProduct, setProductRevenue] = useState<any[]>([]);
  const [retentionData, setCohortRetention] = useState<any[]>([]);

  // Listen for "navigate-to-subscription" from FeatureGate
  useEffect(() => {
    const handler = () => setActivePage("subscription");
    window.addEventListener("navigate-to-subscription", handler);
    return () => window.removeEventListener("navigate-to-subscription", handler);
  }, []);

  async function fetchOverviewData(period: DateRange) {
    try { await fetchDashboardData(period); } catch {}
  }

  async function loadTrafficAnalysis(period: DateRange) {
    try {
      const data = await fetchTrafficAnalysis(period);
      if (!data) return;
      setTrafficAnalysis(data.map((d: any) => ({ ...d, date: d.date?.value || d.date })));
    } catch {}
  }

  async function loadCountries(period: DateRange) {
    try {
      const data = await fetchTopCountries(period);
      if (!data) return;
      setTopCountries(data.map((c: any) => ({ ...c, flag: countryFlags[c.country] || "🌍" })));
    } catch {}
  }

  async function loadDeviceData(period: DateRange) {
    try {
      const data = await fetchDashboardData(period);
      if (!data) return;
      const total = data.mobile_sessions + data.desktop_sessions + data.tablet_sessions || 1;
      setDeviceBreakdown([
        { name: "Mobile",  value: Math.round((data.mobile_sessions / total) * 100),  sessions: data.mobile_sessions },
        { name: "Desktop", value: Math.round((data.desktop_sessions / total) * 100), sessions: data.desktop_sessions },
        { name: "Tablet",  value: Math.round((data.tablet_sessions / total) * 100),  sessions: data.tablet_sessions },
      ]);
      setConversionFunnel([
        { step: "Visitors",      count: data.visitors,               dropoff: null },
        { step: "Product Views", count: data.product_view_sessions,  dropoff: Math.round((1 - data.product_view_sessions / (data.visitors || 1)) * 100) },
        { step: "Add to Cart",   count: data.add_to_cart_sessions,   dropoff: Math.round((1 - data.add_to_cart_sessions / (data.product_view_sessions || 1)) * 100) },
        { step: "Checkout",      count: data.checkout_sessions,      dropoff: Math.round((1 - data.checkout_sessions / (data.add_to_cart_sessions || 1)) * 100) },
        { step: "Purchase",      count: data.purchase_sessions,      dropoff: Math.round((1 - data.purchase_sessions / (data.checkout_sessions || 1)) * 100) },
      ]);
    } catch {}
  }

  async function loadAcquisition(period: DateRange) {
    try {
      const data = await fetchAcquisitionChannels(period);
      if (!data) return;
      setAcquisitionChannels(data.map((r: any) => ({
        source: r.source, sessions: r.sessions, conversions: r.conversions,
        convRate: r.conversion_rate, revenue: r.revenue,
      })));
    } catch {}
  }

  async function loadPagePerf(period: DateRange) {
    try {
      const data = await fetchPagePerformance(period);
      if (!data) return;
      setPagePerformance(data.map((r: any) => ({
        page: r.page_location, views: r.views, users: r.users,
        avgTime: r.avg_time_seconds, engagementRate: r.engagement_rate,
        bounceRate: r.bounce_rate, conversions: r.conversions,
      })));
    } catch {}
  }

  async function loadProductRevenue(period: DateRange) {
    try {
      const data = await fetchProductRevenue(period);
      if (!data) return;
      setProductRevenue(data.map((r: any) => ({
        itemId: r.item_id, name: r.item_name, brand: r.item_brand,
        category: r.item_category, unitsSold: r.units_sold,
        revenue: r.revenue, transactions: r.transactions,
      })));
    } catch {}
  }

  async function loadCohortRetention(period: DateRange) {
    try {
      const data = await fetchCohortRetention(period);
      if (!data) return;
      setCohortRetention(data.map((r: any) => ({
        cohortMonth: r.cohort_month, monthNumber: r.month_number,
        usersRetained: r.users_retained, cohortUsers: r.cohort_users,
        retentionRate: r.retention_rate,
      })));
    } catch {}
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOverviewData(dateRange);
    loadTrafficAnalysis(dateRange);
    loadCountries(dateRange);
    loadDeviceData(dateRange);
    loadAcquisition(dateRange);
    loadPagePerf(dateRange);
    loadProductRevenue(dateRange);
    loadCohortRetention(dateRange);
  }, [dateRange, isAuthenticated]);

  function renderPage() {
    switch (activePage) {
      case "overview":      return <OverviewPage period={dateRange} sessionsTrafficAnalysis={trafficAnalysis} topCountries={topCountries} deviceBreakdown={deviceBreakdown} conversionFunnel={conversionFunnel} />;
      case "analytics":     return <AnalyticsPage acquisitionChannels={acquisitionChannels} landingPageData={landingPageData} revenueByProduct={revenueByProduct} retentionData={retentionData} />;
      case "insights":      return <InsightsPage />;
      case "growth":        return <GrowthPlanPage />;
      case "reports":       return <ReportsPage />;
      case "settings":      return <SettingsPage />;
      case "subscription":  return <SubscriptionPage />;
    }
  }

  // ── Auth loading ──
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Auth screens ──
  if (!isAuthenticated) {
    return authPage === "signin" ? (
      <SignInPage
        onSignIn={() => {}}
        onGoToSignUp={() => setAuthPage("signup")}
      />
    ) : (
      <SignUpPage
        onSignUp={() => {}}
        onGoToSignIn={() => setAuthPage("signin")}
      />
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // ── Dashboard ──
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-foreground/20 backdrop-blur-sm lg:hidden cursor-default w-full border-0"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex flex-col bg-card border-r border-border shadow-card
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? "w-60 translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 lg:w-60
        md:relative md:translate-x-0 md:w-[72px] md:flex
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm tracking-tight lg:block md:hidden block">
            GrowthAdvisor
          </span>
          <button
            type="button"
            className="ml-auto text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan badge */}
        {user?.subscription && (
          <div className="px-4 py-2 border-b border-border">
            <button
              type="button"
              onClick={() => { setActivePage("subscription"); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors lg:flex md:hidden flex"
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold capitalize">{user.subscription.plan.displayName} Plan</span>
              {user.subscription.plan.name === "free" && (
                <span className="ml-auto text-primary font-bold text-[10px]">Upgrade →</span>
              )}
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 group relative
                  ${isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r-full" />
                )}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="lg:block md:hidden block">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom user */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 shrink-0">
              {user?.picture && <AvatarImage src={user.picture} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-col lg:flex md:hidden flex overflow-hidden">
              <span className="text-xs font-semibold text-foreground truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.role?.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Navbar */}
        <header className="shrink-0 flex items-center gap-4 px-6 py-4 bg-card border-b border-border shadow-xs">
          <button
            type="button"
            className="lg:hidden md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{pageTitles[activePage]}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              AI-powered business intelligence
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="hidden sm:flex">
              <ThemeSwitcher />
            </div>

            {/* Search */}
            <button type="button" className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">
              <Search className="w-4 h-4" />
              <span className="hidden md:block text-xs">Search…</span>
            </button>

            {/* Date range */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 hidden sm:flex">
                  <span className="font-medium">{dateRangeLabels[dateRange]}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {(Object.entries(dateRangeLabels) as [DateRange, string][]).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setDateRange(value)}
                    className={dateRange === value ? "text-primary font-medium" : ""}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <button type="button" className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg hover:bg-muted px-2 py-1.5 transition-colors">
                  <Avatar className="w-7 h-7">
                    {user?.picture && <AvatarImage src={user.picture} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground leading-none">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.subscription?.plan?.displayName || "Free"} plan</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => setActivePage("settings")}>
                  <User className="w-3.5 h-3.5 mr-2" /> Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActivePage("subscription")}>
                  <CreditCard className="w-3.5 h-3.5 mr-2" /> Subscription
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-3.5 h-3.5 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-background">
          <div className="p-6 max-w-screen-2xl mx-auto animate-fade-in">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
