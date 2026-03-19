import { useState } from "react";
import {
  LayoutDashboard,
  BarChart2,
  Lightbulb,
  TrendingUp,
  FileText,
  Settings,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import OverviewPage from "./pages/OverviewPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import InsightsPage from "./pages/InsightsPage";
import GrowthPlanPage from "./pages/GrowthPlanPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

import SignUpPage from "./auth/Signup";
import SignInPage from "./auth/SignIn";

type Page =
  | "overview"
  | "analytics"
  | "insights"
  | "growth"
  | "reports"
  | "settings";

type DateRange = "7d" | "30d" | "90d" | "custom";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "growth", label: "Growth Plan", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const pageTitles: Record<Page, string> = {
  overview: "Overview",
  analytics: "Analytics",
  insights: "AI Insights",
  growth: "Growth Plan",
  reports: "Reports",
  settings: "Settings",
};

const dateRangeLabels: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom range",
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPage, setAuthPage] = useState<"signin" | "signup">("signin");

  const [activePage, setActivePage] = useState<Page>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ---------------- AUTH HANDLERS ---------------- */

  function handleSignIn(data: any) {
    console.log("signin", data);

    // normally you would call backend here
    // if success:

    setIsAuthenticated(true);
  }

  function handleSignUp(data: any) {
    console.log("signup", data);

    // normally call backend
    setIsAuthenticated(true);
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setAuthPage("signin");
  }

  /* ---------------- PAGE RENDER ---------------- */

  function renderPage() {
    switch (activePage) {
      case "overview":
        return <OverviewPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "insights":
        return <InsightsPage />;
      case "growth":
        return <GrowthPlanPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
    }
  }

  /* ---------------- AUTH SCREENS ---------------- */

  if (!isAuthenticated) {
    if (authPage === "signin") {
      return (
        <SignInPage
          onSignIn={handleSignIn}
          onGoToSignUp={() => setAuthPage("signup")}
        />
      );
    }

    return (
      <SignUpPage
        onSignUp={handleSignUp}
        onGoToSignIn={() => setAuthPage("signin")}
      />
    );
  }

  /* ---------------- DASHBOARD ---------------- */

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-card flex flex-col">

        <div className="flex items-center gap-3 px-5 py-5 border-b">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-bold">GrowthAdvisor</span>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm
                ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <h1 className="font-bold text-lg">
            {pageTitles[activePage]}
          </h1>

          <div className="flex items-center gap-4">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <Avatar className="w-8 h-8">
              <AvatarFallback>AJ</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>

      </div>
    </div>
  );
}
