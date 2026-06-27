import { useState, useEffect, useRef, useMemo } from "react";
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
import { searchIndex, SearchItem } from "./utils/searchIndex";
import NotificationCenter, {
  NotificationItem,
  buildInitialNotifications,
  buildMockNotification,
} from "./components/NotificationCenter";
import NotificationsModal from "./components/NotificationsModal";


import {
  fetchDashboardData, fetchTrafficAnalysis, fetchTopCountries,
  fetchAcquisitionChannels, fetchPagePerformance,
  fetchProductRevenue, fetchCohortRetention,
  setActiveProject, getActiveProject,
} from "./services/fetchMetrics";
import { countryFlags } from "./services/countryFlags";
import { getCurrencySymbol } from "./services/currencies";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000/api";

type Page = "overview" | "analytics" | "insights" | "growth" | "reports" | "settings" | "subscription";
type DateRange = "today" | "7d" | "30d" | "90d" | "custom";

interface Project {
  id: string;        // app.projects.id
  clientId: string;  // app.clients.id
  name: string;
  domain: string;
  trackingId?: string | null;
  isActive?: boolean;
  role?: "owner" | "member";
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
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "growth", label: "Growth Plan", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
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
function JoinProjectModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined?: (project?: Project) => void;
}) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleJoin() {
    if (!code.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(`${AUTH_API}/sdk/projects/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid invite code");
      }
      setStatus("success");
      onJoined?.(data.project);
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
  projectId,
  onChanged,
}: {
  onClose: () => void;
  userRole: "owner" | "member";
  projectId: string;
  onChanged?: () => void;
}) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    fetch(`${AUTH_API}/sdk/projects/members?projectId=${encodeURIComponent(projectId)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
    })
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, [projectId]);

  async function generateCode() {
    setLoadingCode(true);
    try {
      const res = await fetch(`${AUTH_API}/sdk/projects/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      setInviteCode(data.code);
    } catch { }
    setLoadingCode(false);
  }

  async function removeMember(memberId: string) {
    await fetch(`${AUTH_API}/sdk/projects/members/${memberId}?projectId=${encodeURIComponent(projectId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
    }).catch(() => { });
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    onChanged?.();
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
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.role === "owner"
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
  userRole,
}: {
  user: any;
  initials: string;
  clients: Project[];
  activeClientId: string;
  onClientChange: (id: string) => void;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  onJoinProject: () => void;
  onManageTeam: () => void;
  userRole: "owner" | "member";
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

  const isOwner = userRole === "owner" || user?.role?.toLowerCase() === "admin";

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
          <span className="text-[10px] text-muted-foreground truncate text-left capitalize">{userRole}</span>
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
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Active Project</p>
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
                className={`flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 border ${theme === "teal"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                <span className="w-3 h-3 rounded-full bg-[oklch(0.58_0.155_200)] shrink-0" />
                Teal
              </button>
              <button
                type="button"
                onClick={() => setTheme("indigo")}
                className={`flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 border ${theme === "indigo"
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
  const { theme, mode, setTheme, toggleMode } = useTheme();
  const [authPage, setAuthPage] = useState<"signin" | "signup">("signin");

  const [activePage, setActivePage] = useState<Page>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currency, setCurrency] = useState<string>("INR");

  // Modals
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Notifications state & background generator
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Load initial notifications
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotifications(buildInitialNotifications());
      setNotificationsLoading(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  // Generate real-time notifications every 21 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const notification = buildMockNotification();
      setNotifications((prev) => [notification, ...prev]);
    }, 21000);
    return () => window.clearInterval(interval);
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Scroll active search item into view when selectedIndex changes
  useEffect(() => {
    if (isSearchOpen && resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, isSearchOpen]);
  const [recentSearchIds, setRecentSearchIds] = useState<string[]>([]);

  // Load recents on mount/open
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent_searches");
      if (stored) {
        setRecentSearchIds(JSON.parse(stored));
      }
    } catch {}
  }, [isSearchOpen]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Global keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const scoringAlgorithm = (item: SearchItem, query: string): number => {
    const q = query.toLowerCase().trim();
    const title = item.title.toLowerCase();
    const desc = item.description.toLowerCase();

    if (title === q) return 1000;
    if (title.startsWith(q)) return 500;
    if (title.includes(q)) return 200 - title.indexOf(q);

    for (const keyword of item.keywords) {
      const kw = keyword.toLowerCase();
      if (kw === q) return 150;
      if (kw.startsWith(q)) return 100;
      if (kw.includes(q)) return 50;
    }

    if (desc.includes(q)) return 20;

    if (q.length >= 3) {
      let matches = 0;
      let queryIdx = 0;
      for (let i = 0; i < title.length; i++) {
        if (title[i] === q[queryIdx]) {
          matches++;
          queryIdx++;
          if (queryIdx === q.length) break;
        }
      }
      if (matches === q.length) return 10;
    }

    return 0;
  };

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      const recents = recentSearchIds
        .map((id) => searchIndex.find((item) => item.id === id))
        .filter((item): item is SearchItem => !!item);

      const defaultPool = [
        "analytics-traffic-overview",
        "action-toggle-theme-mode",
        "overview-ai-insights",
        "action-manage-team",
        "reports-card-weekly",
        "subscription-plans-grid",
        "page-settings",
        "action-join-project",
      ];

      const defaults = defaultPool
        .map((id) => searchIndex.find((item) => item.id === id))
        .filter((item): item is SearchItem => !!item && !recentSearchIds.includes(item.id))
        .slice(0, 4);

      return [...recents, ...defaults];
    }

    return searchIndex
      .map((item) => ({ item, score: scoringAlgorithm(item, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);
  }, [query, recentSearchIds]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation for dropdown
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSearchSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, filteredItems, selectedIndex]);

  // Group items by category to display
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    filteredItems.forEach((item) => {
      const category = !query.trim()
        ? recentSearchIds.includes(item.id)
          ? "Recent Searches"
          : "Suggested Searches"
        : item.category;

      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [filteredItems, query, recentSearchIds]);

  const clearAllRecents = () => {
    setRecentSearchIds([]);
    localStorage.removeItem("recent_searches");
  };

  const clearRecentItem = (itemId: string) => {
    const nextRecents = recentSearchIds.filter((id) => id !== itemId);
    setRecentSearchIds(nextRecents);
    localStorage.setItem("recent_searches", JSON.stringify(nextRecents));
  };

  const handleSearchSelect = (item: SearchItem) => {
    // Save to recents if not an action or page-specific settings
    const nextRecents = [item.id, ...recentSearchIds.filter((id) => id !== item.id)].slice(0, 5);
    setRecentSearchIds(nextRecents);
    localStorage.setItem("recent_searches", JSON.stringify(nextRecents));

    // Execute actions
    if (item.actionKey) {
      switch (item.actionKey) {
        case "toggleThemeMode":
        case "setTealTheme":
        case "setIndigoTheme":
          // Redirect the user to Settings page Preferences
          setActivePage("settings");
          setTimeout(() => {
            const el = document.getElementById("settings-preferences");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("search-highlight");
              setTimeout(() => el.classList.remove("search-highlight"), 2500);
            }
          }, 150);
          break;
        case "openJoinModal":
          setShowJoinModal(true);
          break;
        case "openTeamModal":
          setShowTeamModal(true);
          break;
        case "signOut":
          signOut();
          break;
      }
    } else if (item.page) {
      setActivePage(item.page);

      // Scroll to widget if it is an element ID
      if (item.id && !item.id.startsWith("page-")) {
        setTimeout(() => {
          const el = document.getElementById(item.id);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("search-highlight");
            setTimeout(() => el.classList.remove("search-highlight"), 2500);
          }
        }, 150);
      }
    }

    setIsSearchOpen(false);
    setQuery("");
  };


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
  const [clients, setClients] = useState<Project[]>([]);
  const [activeClientId, setActiveProjectIdState] = useState<string>(
    () => getActiveProject()
  );

  // ── Load projects on login, auto-select first ──
  async function loadProjects() {
    if (!isAuthenticated) return;

    try {
      const res = await fetch(`${AUTH_API}/sdk/projects`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
      });
      const data: Project[] = await res.json();
      if (!data || !Array.isArray(data)) return;

      setClients(data);

      const storedProjectId = getActiveProject();
      const stillExists = storedProjectId && data.some((p) => p.id === storedProjectId);

      if (data.length > 0 && !stillExists) {
        setActiveProject(data[0].id);
        setActiveProjectIdState(data[0].id);
      }
    } catch { }
  }

  useEffect(() => {
    loadProjects();
  }, [isAuthenticated]);

  function handleClientChange(clientId: string) {
    setActiveProject(clientId);
    setActiveProjectIdState(clientId);
    refreshAllData(dateRange);
  }

  useEffect(() => {
    const handler = () => setActivePage("subscription");
    window.addEventListener("navigate-to-subscription", handler);
    return () => window.removeEventListener("navigate-to-subscription", handler);
  }, []);

  async function fetchOverviewData(period: DateRange) {
    try { await fetchDashboardData(period); } catch { }
  }

  async function loadTrafficAnalysis(period: DateRange) {
  try {
    const data = await fetchTrafficAnalysis(period);

    if (!data) return;

    setTrafficAnalysis(
      data.map((item: any) => ({
        date: item.date?.value || item.date,
        sessions: item.sessions ?? 0,
        pageviews: item.pageviews ?? item.screenPageViews ?? 0,
        uniqueVisitors: item.uniqueVisitors ?? item.activeUsers ?? 0,
      }))
    );
  } catch (error) {
    console.error("Failed to load traffic analysis:", error);
  }
}

  async function loadCountries(period: DateRange) {
    try {
      const data = await fetchTopCountries(period);
      if (!data) return;
      setTopCountries(data.map((c: any) => ({ ...c, flag: countryFlags[c.country] || "🌍" })));
    } catch { }
  }

  async function loadDeviceData(period: DateRange) {
    try {
      const data = await fetchDashboardData(period);
      if (!data) return;
      const total = data.mobile_sessions + data.desktop_sessions + data.tablet_sessions || 1;
      setDeviceBreakdown([
        { name: "Mobile", value: Math.round((data.mobile_sessions / total) * 100), sessions: data.mobile_sessions },
        { name: "Desktop", value: Math.round((data.desktop_sessions / total) * 100), sessions: data.desktop_sessions },
        { name: "Tablet", value: Math.round((data.tablet_sessions / total) * 100), sessions: data.tablet_sessions },
      ]);
      setConversionFunnel([
        { step: "Visitors", count: data.visitors, dropoff: null },
        { step: "Product Views", count: data.product_view_sessions, dropoff: Math.round((1 - data.product_view_sessions / (data.visitors || 1)) * 100) },
        { step: "Add to Cart", count: data.add_to_cart_sessions, dropoff: Math.round((1 - data.add_to_cart_sessions / (data.product_view_sessions || 1)) * 100) },
        { step: "Checkout", count: data.checkout_sessions, dropoff: Math.round((1 - data.checkout_sessions / (data.add_to_cart_sessions || 1)) * 100) },
        { step: "Purchase", count: data.purchase_sessions, dropoff: Math.round((1 - data.purchase_sessions / (data.checkout_sessions || 1)) * 100) },
      ]);
    } catch { }
  }

  async function loadAcquisition(period: DateRange) {
    try {
      const data = await fetchAcquisitionChannels(period);
      if (!data) return;
      setAcquisitionChannels(data.map((r: any) => ({
        source: r.source, sessions: r.sessions, conversions: r.conversions,
        convRate: r.conversion_rate, revenue: r.revenue,
      })));
    } catch { }
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
    } catch { }
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
    } catch { }
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
    } catch { }
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
      case "overview": return <OverviewPage period={dateRange} sessionsTrafficAnalysis={trafficAnalysis} topCountries={topCountries} deviceBreakdown={deviceBreakdown} conversionFunnel={conversionFunnel} currency={currency} />;
      case "analytics":
        return (
          <AnalyticsPage
            trafficAnalysis={trafficAnalysis}
            acquisitionChannels={acquisitionChannels}
            landingPageData={landingPageData}
            revenueByProduct={revenueByProduct}
            retentionData={retentionData}
            currency={currency}
          />
        );
      case "insights": return <InsightsPage />;
      case "growth": return <GrowthPlanPage currency={currency} />;
      case "reports": return <ReportsPage />;
      case "settings": return <SettingsPage currency={currency} onCurrencyChange={setCurrency} />;
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
      <SignInPage onSignIn={() => { }} onGoToSignUp={() => setAuthPage("signup")} />
    ) : (
      <SignUpPage onSignUp={() => { }} onGoToSignIn={() => setAuthPage("signin")} />
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const activeClient = clients.find((c) => c.id === activeClientId);
  const userRole: "owner" | "member" =
    activeClient?.role === "owner" || user?.role?.toLowerCase() === "admin"
      ? "owner"
      : "member";

  // ── Dashboard ──
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Modals */}
      {showJoinModal && (
        <JoinProjectModal
          onClose={() => setShowJoinModal(false)}
          onJoined={(project) => {
            if (project?.id) {
              setActiveProject(project.id);
              setActiveProjectIdState(project.id);
            }
            loadProjects();
          }}
        />
      )}
      {showTeamModal && (
        <InviteMembersModal
          onClose={() => setShowTeamModal(false)}
          userRole={userRole}
          projectId={activeClientId}
          onChanged={loadProjects}
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
        lg:relative lg:translate-x-0 lg:w-60 lg:z-30
        md:relative md:translate-x-0 md:w-[72px] md:flex md:z-30
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 border-b border-border h-[72px] shrink-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm tracking-tight lg:block md:hidden block">
            AROPATH
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
            userRole={userRole}
          />
        </div>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
        {showNotificationsModal && (
          <NotificationsModal
            isOpen={showNotificationsModal}
            onClose={() => setShowNotificationsModal(false)}
            notifications={notifications}
            setNotifications={setNotifications}
            onNavigateToWidget={(page, widgetId) => {
              setActivePage(page);
              setShowNotificationsModal(false);
              if (widgetId) {
                setTimeout(() => {
                  const el = document.getElementById(widgetId);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("search-highlight");
                    setTimeout(() => el.classList.remove("search-highlight"), 2500);
                  }
                }, 150);
              }
            }}
          />
        )}
        {/* Navbar — cleaner, Client/Theme removed */}
        <header className="shrink-0 flex items-center gap-4 px-6 bg-card border-b border-border shadow-xs h-[72px]">
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
                + Add project
              </button>
            )}

            {/* Search Container */}
            <div className="relative z-50" ref={searchRef}>
              {!isSearchOpen ? (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-all duration-300 w-9 sm:w-28 h-9 border border-transparent justify-center sm:justify-start"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="text-xs hidden sm:inline">Search…</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-primary rounded-lg transition-all duration-300 w-[280px] sm:w-[400px] md:w-[460px] h-9 shadow-sm animate-in fade-in slide-in-from-right-3 duration-200">
                  <Search className="w-4 h-4 text-primary shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50 min-w-0"
                    autoFocus
                  />
                  <button 
                    type="button" 
                    onClick={() => { setIsSearchOpen(false); setQuery(""); }}
                    className="text-muted-foreground hover:text-foreground text-[10px] font-semibold bg-background border border-border px-1.5 py-0.5 rounded shrink-0 hidden sm:block"
                  >
                    ESC
                  </button>
                </div>
              )}

              {/* Dropdown Menu */}
              {isSearchOpen && (
                <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-[400px] md:w-[460px] bg-card border border-border rounded-xl shadow-elevated overflow-hidden flex flex-col max-h-[45vh] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-2 space-y-3.5 scrollbar-thin">
                    {filteredItems.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-xs text-muted-foreground">No matches for &quot;{query}&quot;</p>
                      </div>
                    ) : (
                      Object.entries(groupedResults).map(([groupTitle, items]) => (
                        <div key={groupTitle}>
                          <div className="flex items-center justify-between px-3 py-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {groupTitle}
                            </p>
                            {groupTitle === "Recent Searches" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearAllRecents();
                                }}
                                className="text-[9px] font-semibold text-primary hover:underline cursor-pointer"
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {items.map((item) => {
                              const globalIdx = filteredItems.indexOf(item);
                              const isSelected = globalIdx === selectedIndex;
                              return (
                                <div key={item.id} className="group relative flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => handleSearchSelect(item)}
                                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                                    data-selected={isSelected ? "true" : "false"}
                                    className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl transition-all duration-150 pr-8 ${
                                      isSelected
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <p className={`text-xs font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                                        {item.title}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                        {item.description}
                                      </p>
                                    </div>
                                    {isSelected && groupTitle !== "Recent Searches" && (
                                      <span className="shrink-0 text-[9px] font-semibold text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded">
                                        ↵ ENTER
                                      </span>
                                    )}
                                  </button>
                                  {groupTitle === "Recent Searches" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearRecentItem(item.id);
                                      }}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      title="Remove from recents"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      Navigate with <kbd className="font-mono font-semibold">↑↓</kbd>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Open with <kbd className="font-mono font-semibold">↵</kbd>
                    </span>
                  </div>
                </div>
              )}
            </div>

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
            <NotificationCenter
              setActivePage={setActivePage}
              onNavigateToWidget={(page, widgetId) => {
                setActivePage(page);
                if (widgetId) {
                  setTimeout(() => {
                    const el = document.getElementById(widgetId);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("search-highlight");
                      setTimeout(() => el.classList.remove("search-highlight"), 2500);
                    }
                  }, 150);
                }
              }}
              notifications={notifications}
              loading={notificationsLoading}
              setNotifications={setNotifications}
              onExpandFullView={() => setShowNotificationsModal(true)}
            />
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
