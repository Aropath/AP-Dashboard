import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, BarChart2, Lightbulb, TrendingUp,
  FileText, Settings, Menu, X, ChevronDown, Bell,
  Search, CreditCard, LogOut, User, Users, UserPlus,
  Moon, Sun, Copy, Check, Shield, ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";

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
  setActiveClient, getActiveClient,
} from "./services/fetchMetrics";
import { countryFlags } from "./services/countryFlags";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000/api";

type Page = "overview" | "analytics" | "insights" | "growth" | "reports" | "settings" | "subscription";
type DateRange = "today" | "7d" | "30d" | "90d" | "custom";

interface Client {
  id: string;
  name: string;
  domain: string;
  ga4Credential?: { propertyName: string } | null;
}

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: "owner" | "member";
  joinedAt: string;
}

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

// ─── Join Project Modal ────────────────────────────────────────────────────────
function JoinProjectModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleJoin() {
    if (!code.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(`${AUTH_API}/projects/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid invite code");
      }
      setStatus("success");
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to join project");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-foreground">Join a Project</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter the invite code shared by your team</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus("idle"); }}
            placeholder="e.g. GRW-X7K2"
            maxLength={12}
            className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-lg text-sm font-mono font-semibold text-foreground placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors tracking-widest"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />

          {status === "error" && (
            <p className="text-xs text-destructive font-medium">{errorMsg}</p>
          )}
          {status === "success" && (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Joined successfully!
            </p>
          )}

          <Button
            className="w-full h-9 text-sm"
            onClick={handleJoin}
            disabled={status === "loading" || status === "success" || !code.trim()}
          >
            {status === "loading" ? "Joining…" : status === "success" ? "Joined!" : "Join Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Members Modal ──────────────────────────────────────────────────────
function InviteMembersModal({
  onClose,
  userRole,
}: {
  onClose: () => void;
  userRole: "owner" | "member";
}) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    // Fetch current members
    fetch(`${AUTH_API}/projects/members`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
    })
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function generateCode() {
    setLoadingCode(true);
    try {
      const res = await fetch(`${AUTH_API}/projects/invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
      });
      const data = await res.json();
      setInviteCode(data.code);
    } catch {}
    setLoadingCode(false);
  }

  async function removeMember(memberId: string) {
    await fetch(`${AUTH_API}/projects/members/${memberId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
    }).catch(() => {});
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  function copyCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isOwner = userRole === "owner";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-foreground">Team Members</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOwner ? "Manage members and invite new ones" : "View your project team"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite code section — owner only */}
        {isOwner && (
          <div className="mb-5 p-3.5 bg-muted rounded-lg border border-border">
            <p className="text-xs font-semibold text-foreground mb-2">Invite via code</p>
            {inviteCode ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 font-mono text-sm font-bold tracking-widest text-foreground bg-background border border-border rounded-md px-3 py-2">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={generateCode}
                disabled={loadingCode}
                className="text-xs font-medium text-primary hover:underline"
              >
                {loadingCode ? "Generating…" : "Generate invite code"}
              </button>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              Anyone with this code can join as a member. Codes expire after 7 days.
            </p>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No members yet</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="w-7 h-7 shrink-0">
                  {m.picture && <AvatarImage src={m.picture} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    m.role === "owner"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  }`}>
                    {m.role === "owner" && <Shield className="w-2.5 h-2.5" />}
                    {m.role}
                  </span>
                  {isOwner && m.role !== "owner" && (
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar User Popover ──────────────────────────────────────────────────────
function SidebarUserPopover({
  user,
  initials,
  clients,
  activeClientId,
  onClientChange,
  onNavigate,
  onSignOut,
  onJoinProject,
  onManageTeam,
}: {
  user: any;
  initials: string;
  clients: Client[];
  activeClientId: string;
  onClientChange: (id: string) => void;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  onJoinProject: () => void;
  onManageTeam: () => void;
}) {
  const { theme, mode, setTheme, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isOwner = user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "admin";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted transition-colors group"
        aria-label="User menu"
      >
        <Avatar className="w-8 h-8 shrink-0">
          {user?.picture && <AvatarImage src={user.picture} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-col lg:flex md:hidden flex overflow-hidden flex-1 min-w-0">
          <span className="text-xs font-semibold text-foreground truncate text-left">{user?.name}</span>
          <span className="text-[10px] text-muted-foreground truncate text-left capitalize">{user?.role?.toLowerCase()}</span>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform lg:block md:hidden block ${open ? "rotate-90" : ""}`} />
      </button>

      {/* Popover panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">

          {/* User identity header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Avatar className="w-9 h-9 shrink-0">
              {user?.picture && <AvatarImage src={user.picture} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            {isOwner && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                <Shield className="w-2.5 h-2.5" /> Owner
              </span>
            )}
          </div>

          {/* Team section */}
          <div className="px-4 py-3 border-b border-border space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Team</p>
            {isOwner && (
              <button
                type="button"
                onClick={() => { onManageTeam(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Manage Team Members
              </button>
            )}
            <button
              type="button"
              onClick={() => { onJoinProject(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
              Join a Project
            </button>
            {!isOwner && (
              <button
                type="button"
                onClick={() => { onManageTeam(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                View Team
              </button>
            )}
          </div>

          {/* Client selector */}
          {clients.length > 0 && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Active Client</p>
              <select
                value={activeClientId}
                onChange={(e) => { onClientChange(e.target.value); setOpen(false); }}
                className="w-full text-xs font-medium text-foreground bg-muted rounded-lg px-2.5 py-2 outline-none cursor-pointer border border-border hover:border-primary/40 transition-colors"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Theme section */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Appearance</p>

            {/* Color theme */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => setTheme("teal")}
                className={`flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 border ${
                  theme === "teal"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[oklch(0.52_0.155_195)] shrink-0" />
                Teal
              </button>
              <button
                type="button"
                onClick={() => setTheme("indigo")}
                className={`flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 border ${
                  theme === "indigo"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[oklch(0.511_0.22_264)] shrink-0" />
                Indigo
              </button>
            </div>

            {/* Light / dark */}
            <button
              type="button"
              onClick={toggleMode}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <span className="text-xs font-medium text-foreground">
                {mode === "light" ? "Light mode" : "Dark mode"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Switch to {mode === "light" ? "dark" : "light"}</span>
                {mode === "light" ? <Moon className="w-3.5 h-3.5 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </button>
          </div>

          {/* Account actions */}
          <div className="px-4 py-2">
            <button
              type="button"
              onClick={() => { onNavigate("settings"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Profile & Settings
            </button>
            <button
              type="button"
              onClick={() => { onNavigate("subscription"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              Subscription
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const [authPage, setAuthPage] = useState<"signin" | "signup">("signin");

  const [activePage, setActivePage] = useState<Page>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // ── Analytics data state ──
  const [trafficAnalysis, setTrafficAnalysis] = useState<any[]>([]);
  const [topCountries, setTopCountries] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);
  const [acquisitionChannels, setAcquisitionChannels] = useState<any[]>([]);
  const [landingPageData, setPagePerformance] = useState<any[]>([]);
  const [revenueByProduct, setProductRevenue] = useState<any[]>([]);
  const [retentionData, setCohortRetention] = useState<any[]>([]);

  // ── Client state ──
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientIdState] = useState<string>(
    () => getActiveClient()
  );

  // ── Load clients on login, auto-select first ──
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch(`${AUTH_API}/clients`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
      },
    })
      .then((r) => r.json())
      .then((data: Client[]) => {
        if (!data || !Array.isArray(data)) return;
        setClients(data);

        if (data.length > 0 && !getActiveClient()) {
          setActiveClient(data[0].id);
          setActiveClientIdState(data[0].id);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  function handleClientChange(clientId: string) {
    setActiveClient(clientId);
    setActiveClientIdState(clientId);
    refreshAllData(dateRange);
  }

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
        { step: "Product Views", count: data.product_view_sessions,  dropoff: Math.round((1 - data.product_view_sessions  / (data.visitors               || 1)) * 100) },
        { step: "Add to Cart",   count: data.add_to_cart_sessions,   dropoff: Math.round((1 - data.add_to_cart_sessions   / (data.product_view_sessions  || 1)) * 100) },
        { step: "Checkout",      count: data.checkout_sessions,      dropoff: Math.round((1 - data.checkout_sessions      / (data.add_to_cart_sessions   || 1)) * 100) },
        { step: "Purchase",      count: data.purchase_sessions,      dropoff: Math.round((1 - data.purchase_sessions      / (data.checkout_sessions      || 1)) * 100) },
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

  function refreshAllData(period: DateRange) {
    fetchOverviewData(period);
    loadTrafficAnalysis(period);
    loadCountries(period);
    loadDeviceData(period);
    loadAcquisition(period);
    loadPagePerf(period);
    loadProductRevenue(period);
    loadCohortRetention(period);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshAllData(dateRange);
  }, [dateRange, isAuthenticated]);

  function renderPage() {
    switch (activePage) {
      case "overview":     return <OverviewPage period={dateRange} sessionsTrafficAnalysis={trafficAnalysis} topCountries={topCountries} deviceBreakdown={deviceBreakdown} conversionFunnel={conversionFunnel} />;
      case "analytics":    return <AnalyticsPage acquisitionChannels={acquisitionChannels} landingPageData={landingPageData} revenueByProduct={revenueByProduct} retentionData={retentionData} />;
      case "insights":     return <InsightsPage />;
      case "growth":       return <GrowthPlanPage />;
      case "reports":      return <ReportsPage />;
      case "settings":     return <SettingsPage />;
      case "subscription": return <SubscriptionPage />;
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

  if (!isAuthenticated) {
    return authPage === "signin" ? (
      <SignInPage onSignIn={() => {}} onGoToSignUp={() => setAuthPage("signup")} />
    ) : (
      <SignUpPage onSignUp={() => {}} onGoToSignIn={() => setAuthPage("signin")} />
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const activeClient = clients.find((c) => c.id === activeClientId);
  const userRole: "owner" | "member" =
    user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "admin"
      ? "owner"
      : "member";

  // ── Dashboard ──
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Modals */}
      {showJoinModal && <JoinProjectModal onClose={() => setShowJoinModal(false)} />}
      {showTeamModal && (
        <InviteMembersModal
          onClose={() => setShowTeamModal(false)}
          userRole={userRole}
        />
      )}

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

        {/* Bottom user section — now clickable to open popover */}
        <div className="p-3 border-t border-border">
          <SidebarUserPopover
            user={user}
            initials={initials}
            clients={clients}
            activeClientId={activeClientId}
            onClientChange={handleClientChange}
            onNavigate={(page) => { setActivePage(page); setSidebarOpen(false); }}
            onSignOut={signOut}
            onJoinProject={() => setShowJoinModal(true)}
            onManageTeam={() => setShowTeamModal(true)}
          />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Navbar — cleaner, Client/Theme removed */}
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
            {activeClient ? (
              <p className="text-xs text-muted-foreground hidden sm:block truncate">
                {activeClient.name}
                {activeClient.ga4Credential && (
                  <span className="ml-1.5 text-green-600 font-medium">· GA4 connected</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground hidden sm:block">
                AI-powered business intelligence
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* No clients yet — prompt to add one */}
            {clients.length === 0 && isAuthenticated && (
              <button
                type="button"
                onClick={() => setActivePage("settings")}
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
              >
                + Add client
              </button>
            )}

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
