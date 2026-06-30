"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  LucideIcon,
  Maximize2,
  Rocket,
  Shield,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type NotificationCategoryId =
  | "business"
  | "insight"
  | "growth"
  | "reports"
  | "system";

export type NotificationType =
  | "information"
  | "success"
  | "warning"
  | "critical"
  | "ai"
  | "report"
  | "opportunity"
  | "security"
  | "system";

export type NotificationPriority = "high" | "medium" | "low";

export interface NotificationDetails {
  completeDescription: string;
  whatHappened: string;
  whyItMatters: string;
  nextStep: string;
  relatedModule: string;
  exactTimestamp: string;
}

export type PageType = "overview" | "analytics" | "insights" | "growth" | "reports" | "settings" | "subscription";

export interface NotificationItem {
  id: string;
  category: NotificationCategoryId;
  type: NotificationType;
  title: string;
  summary: string;
  timestamp: string;
  unread: boolean;
  isNew: boolean;
  priority: NotificationPriority;
  details: NotificationDetails;
  targetPage?: PageType;
  targetWidgetId?: string;
}

// ─── Meta Maps ─────────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<NotificationCategoryId, {
  title: string;
  icon: typeof TrendingUp;
  accent: string;
  unreadBg: string;
  unreadBorder: string;
}> = {
  business: {
    title: "Business Performance",
    icon: BarChart3,
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    unreadBg: "bg-sky-50/60 dark:bg-sky-950/30",
    unreadBorder: "border-sky-200 dark:border-sky-800",
  },
  insight: {
    title: "Smart Insights",
    icon: Lightbulb,
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    unreadBg: "bg-violet-50/60 dark:bg-violet-950/30",
    unreadBorder: "border-violet-200 dark:border-violet-800",
  },
  growth: {
    title: "Growth Opportunities",
    icon: Rocket,
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    unreadBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    unreadBorder: "border-emerald-200 dark:border-emerald-800",
  },
  reports: {
    title: "Reports",
    icon: FileText,
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    unreadBg: "bg-amber-50/60 dark:bg-amber-950/30",
    unreadBorder: "border-amber-200 dark:border-amber-800",
  },
  system: {
    title: "System Updates",
    icon: Shield,
    accent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    unreadBg: "bg-rose-50/60 dark:bg-rose-950/30",
    unreadBorder: "border-rose-200 dark:border-rose-800",
  },
};

export const TYPE_META: Record<NotificationType, {
  label: string;
  color: string;
  icon: LucideIcon;
}> = {
  information: {
    label: "Information",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: Lightbulb,
  },
  success: {
    label: "Success",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  warning: {
    label: "Warning",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
    icon: AlertTriangle,
  },
  ai: {
    label: "AI Recommendation",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
    icon: Sparkles,
  },
  report: {
    label: "Report Ready",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    icon: FileText,
  },
  opportunity: {
    label: "Growth Opportunity",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    icon: TrendingUp,
  },
  security: {
    label: "Security Alert",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
    icon: Shield,
  },
  system: {
    label: "System Update",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: Bell,
  },
};

export const PRIORITY_META: Record<NotificationPriority, { label: string; className: string }> = {
  high:     { label: "High",     className: "bg-rose-500/10 text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-800" },
  medium:   { label: "Medium",   className: "bg-orange-500/10 text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800" },
  low:      { label: "Low",      className: "bg-sky-500/10 text-sky-600 border-sky-200 dark:text-sky-400 dark:border-sky-800" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function formatRelativeTime(value: string) {
  const delta = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (delta < 60)    return "Just now";
  if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 172800) return "Yesterday";
  return `${Math.floor(delta / 86400)}d ago`;
}

export function formatExactTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function createId() {
  return `${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

export function buildInitialNotifications(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: createId(),
      category: "business",
      type: "information",
      title: "Daily revenue has seen a 16% Rise.",
      summary: "Your main product line outperformed expectations this morning.",
      timestamp: new Date(now - 1000 * 60 * 6).toISOString(),
      unread: true,
      isNew: false,
      priority: "high",
      targetPage: "overview",
      targetWidgetId: "metric-card-revenue",
      details: {
        completeDescription:
          "Revenue has seen a Rise across ads and organic channels after yesterday's launch campaign. The Rise is strongest in North America.",
        whatHappened:
          "The new pricing test led to a stronger checkout conversion across high-intent segments.",
        whyItMatters:
          "This trend indicates that your recent campaign is driving both quality visits and fast revenue growth.",
        nextStep:
          "Review the campaign performance in the Growth Plan and lock in the messaging for the next two push cycles.",
        relatedModule: "Revenue Dashboard",
        exactTimestamp: formatExactTime(new Date(now - 1000 * 60 * 6).toISOString()),
      },
    },
    {
      id: createId(),
      category: "insight",
      type: "ai",
      title: "AI detected a churn risk for last week's onboarding cohort.",
      summary: "Engagement has seen a Drop among users who signed up in the last 7 days.",
      timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
      unread: true,
      isNew: false,
      priority: "high",
      targetPage: "analytics",
      targetWidgetId: "analytics-customer-retention",
      details: {
        completeDescription:
          "The cohort is seeing a 24% Drop in feature usage compared to the historical average. Early intervention can preserve conversion momentum.",
        whatHappened:
          "Users who activated onboarding flows are not returning for their second session.",
        whyItMatters:
          "Addressing this churn risk now protects your growth projections for the next quarter.",
        nextStep:
          "Send a personalized re-engagement push and review the onboarding funnel for friction points.",
        relatedModule: "AI Insights",
        exactTimestamp: formatExactTime(new Date(now - 1000 * 60 * 20).toISOString()),
      },
    },
    {
      id: createId(),
      category: "growth",
      type: "opportunity",
      title: "New campaign idea: cross-sell your highest-converting segment.",
      summary: "Opportunity identified for expanding revenue from returning customers.",
      timestamp: new Date(now - 1000 * 60 * 52).toISOString(),
      unread: false,
      isNew: false,
      priority: "medium",
      targetPage: "growth",
      targetWidgetId: "growth-action-checklist",
      details: {
        completeDescription:
          "Customers who purchased in the last month are more likely to engage with the new add-on bundle you introduced.",
        whatHappened:
          "A group of returning users is converting at a 34% higher rate than average.",
        whyItMatters:
          "This is a strong signal to prioritize targeted messaging for high-value repeat buyers.",
        nextStep:
          "Create a Growth Plan campaign for the top 10% of returning customers.",
        relatedModule: "Campaign Suggestions",
        exactTimestamp: formatExactTime(new Date(now - 1000 * 60 * 52).toISOString()),
      },
    },
    {
      id: createId(),
      category: "reports",
      type: "report",
      title: "Weekly revenue report is ready to download.",
      summary: "Your latest performance report has finished generating.",
      timestamp: new Date(now - 1000 * 60 * 110).toISOString(),
      unread: false,
      isNew: false,
      priority: "low",
      targetPage: "reports",
      targetWidgetId: "reports-history-table",
      details: {
        completeDescription:
          "The report includes detailed metrics for sessions, conversions, and revenue trends across all active campaigns.",
        whatHappened:
          "A scheduled export completed successfully and is now available in your reports center.",
        whyItMatters:
          "Use the generated report to share performance with stakeholders and validate next steps.",
        nextStep:
          "Download the report and review the comparison against last month.",
        relatedModule: "Reports",
        exactTimestamp: formatExactTime(new Date(now - 1000 * 60 * 110).toISOString()),
      },
    },
    {
      id: createId(),
      category: "system",
      type: "security",
      title: "Security alert: suspicious sign-in blocked.",
      summary: "A login attempt from an unfamiliar device was prevented.",
      timestamp: new Date(now - 1000 * 60 * 145).toISOString(),
      unread: false,
      isNew: false,
      priority: "high",
      targetPage: "settings",
      targetWidgetId: "settings-preferences",
      details: {
        completeDescription:
          "The system flagged an unauthorized access attempt and enforced additional authentication for the account.",
        whatHappened:
          "A sign-in attempt was blocked because it originated from a new browser and location.",
        whyItMatters:
          "Keeping your workspace secure ensures compliance and prevents unauthorized access to sensitive data.",
        nextStep:
          "Review your login security settings and confirm you recognize the activity.",
        relatedModule: "Security Center",
        exactTimestamp: formatExactTime(new Date(now - 1000 * 60 * 145).toISOString()),
      },
    },
  ];
}

const TEMPLATE_ITEMS: Array<Omit<NotificationItem, "id" | "timestamp" | "unread" | "isNew">> = [
  {
    category: "business",
    type: "information",
    title: "Revenue forecast for today has seen a Rise.",
    summary: "The system updated the forecast after a Rise in morning performance.",
    priority: "high",
    targetPage: "growth",
    targetWidgetId: "growth-revenue-forecast",
    details: {
      completeDescription:
        "A recent Rise in transactions pushed the daily forecast higher, especially in the subscription funnel.",
      whatHappened: "The revenue engine recalculated projections using the latest traffic and conversion data.",
      whyItMatters: "This helps you allocate resources and campaigns more confidently for the remainder of the day.",
      nextStep: "Review the latest revenue dashboard and validate your closing strategy for priority segments.",
      relatedModule: "Revenue Dashboard",
      exactTimestamp: "",
    },
  },
  {
    category: "insight",
    type: "ai",
    title: "AI suggests updating your headline for better trial activation.",
    summary: "A recommendation was generated to improve first-time conversion.",
    priority: "medium",
    targetPage: "insights",
    targetWidgetId: "insights-grid",
    details: {
      completeDescription: "The AI model found that a more benefit-driven headline could increase trial starts by 8%.",
      whatHappened: "A content analysis compared your current headline against top-performing peers.",
      whyItMatters: "Small copy changes can create meaningful lift in early funnel performance.",
      nextStep: "Test the new starter headline in your onboarding campaign.",
      relatedModule: "AI Insights",
      exactTimestamp: "",
    },
  },
  {
    category: "growth",
    type: "opportunity",
    title: "A cross-sell segment has seen a 22% Rise above average.",
    summary: "A high-potential upsell audience has emerged.",
    priority: "medium",
    targetPage: "growth",
    targetWidgetId: "growth-action-checklist",
    details: {
      completeDescription: "Returning customers who engaged with the webinar are converting at an above-average rate.",
      whatHappened: "The system detected a strong response pattern in an active growth segment.",
      whyItMatters: "This is a prime moment to capture additional revenue from existing customers.",
      nextStep: "Launch a targeted campaign to the segment and push the new bundle offer.",
      relatedModule: "Growth Plan",
      exactTimestamp: "",
    },
  },
  {
    category: "reports",
    type: "report",
    title: "New export completed: executive summary.",
    summary: "Your summary report is ready for review and sharing.",
    priority: "low",
    targetPage: "reports",
    targetWidgetId: "reports-history-table",
    details: {
      completeDescription: "The executive summary now includes fresh KPIs, trend analysis, and the latest conversion status.",
      whatHappened: "An export job finished successfully and is available in your reports panel.",
      whyItMatters: "This gives stakeholders a clean, up-to-date snapshot of performance.",
      nextStep: "Open the report and confirm the metrics before distribution.",
      relatedModule: "Reports",
      exactTimestamp: "",
    },
  },
  {
    category: "system",
    type: "security",
    title: "System update scheduled for tonight.",
    summary: "A maintenance window has been reserved for platform improvements.",
    priority: "low",
    targetPage: "settings",
    targetWidgetId: "settings-preferences",
    details: {
      completeDescription: "A behind-the-scenes system update will run during off-peak hours to minimize impact.",
      whatHappened: "The platform scheduled routine maintenance with a short downtime window.",
      whyItMatters: "Planning ahead prevents surprises and keeps your workflows stable.",
      nextStep: "Review the maintenance notes and notify your team if needed.",
      relatedModule: "System Status",
      exactTimestamp: "",
    },
  },
];

export function buildMockNotification(): NotificationItem {
  const template = TEMPLATE_ITEMS[Math.floor(Math.random() * TEMPLATE_ITEMS.length)];
  const now = new Date();
  return {
    ...template,
    id: createId(),
    timestamp: now.toISOString(),
    unread: true,
    isNew: true,
    details: {
      ...template.details,
      exactTimestamp: formatExactTime(now.toISOString()),
    },
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Animated unread badge */
function UnreadBadge({ count, pulse }: { count: number; pulse: boolean }) {
  if (count === 0) return null;
  return (
    <span
      key={count}                         // re-mount triggers CSS animation
      className={cn(
        "absolute -top-1 -right-1 min-h-[1.125rem] min-w-[1.125rem] flex items-center justify-center",
        "rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground shadow-md px-1",
        "transition-transform duration-150",
        pulse ? "scale-125" : "scale-100",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Expanded detail grid shown inside a notification card */
function NotificationDetail({ 
  notification,
  onInvestigate
}: { 
  notification: NotificationItem;
  onInvestigate?: () => void;
}) {
  return (
    <div className="space-y-3 px-4 pb-4 pt-2">
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {notification.details.completeDescription}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-muted/60 p-3 border border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">What happened</p>
          <p className="text-[12px] text-foreground leading-relaxed">{notification.details.whatHappened}</p>
        </div>
        <div className="rounded-2xl bg-muted/60 p-3 border border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">Why it matters</p>
          <p className="text-[12px] text-foreground leading-relaxed">{notification.details.whyItMatters}</p>
        </div>
        <div className="rounded-2xl bg-muted/60 p-3 border border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">Suggested next step</p>
          <p className="text-[12px] text-foreground leading-relaxed">{notification.details.nextStep}</p>
        </div>
        <div className="rounded-2xl bg-muted/60 p-3 border border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">Exact timestamp</p>
          <p className="text-[12px] text-foreground leading-relaxed">{notification.details.exactTimestamp}</p>
        </div>
      </div>
      {notification.targetPage && onInvestigate && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="sm"
            className="h-7 text-[10px] font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onInvestigate}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Investigate Metric
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export interface NotificationCenterProps {
  setActivePage: (page: PageType) => void;
  onNavigateToWidget: (page: PageType, widgetId: string) => void;
  notifications: NotificationItem[];
  loading: boolean;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onExpandFullView: () => void;
}

function NotificationCenter({
  setActivePage,
  onNavigateToWidget,
  notifications,
  loading,
  setNotifications,
  onExpandFullView,
}: NotificationCenterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);   // tracks CSS enter/leave
  const [openCategories, setOpenCategories] = useState<NotificationCategoryId[]>([
    "business", "insight", "growth", "reports", "system",
  ]);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [badgePulse, setBadgePulse] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const bellRef    = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const cardRefs   = useRef<Record<string, HTMLDivElement | null>>({});
  const firstRender = useRef(true);

  // ── Badge pulse when unread count changes ──────────────────────────────────
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setBadgePulse(true);
    const t = window.setTimeout(() => setBadgePulse(false), 400);
    return () => window.clearTimeout(t);
  }, [unreadCount]);

  // ── Dropdown open/close with animation ────────────────────────────────────
  const openDropdown = useCallback(() => {
    setDropdownOpen(true);
    // Small rAF delay so the element mounts before we flip visibility
    requestAnimationFrame(() => setDropdownVisible(true));
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownVisible(false);
    // Wait for CSS transition to finish, then unmount
    const t = window.setTimeout(() => setDropdownOpen(false), 200);
    return t;
  }, []);

  const handleBellToggle = useCallback(() => {
    if (dropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [dropdownOpen, openDropdown, closeDropdown]);

  // ── Click-outside / Escape ─────────────────────────────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        bellRef.current?.contains(e.target as Node)
      ) return;
      closeDropdown();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdown();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen, closeDropdown]);



  // ── Highlight timeout ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!highlightedId) return;
    const t = window.setTimeout(() => setHighlightedId(null), 3500);
    return () => window.clearTimeout(t);
  }, [highlightedId]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const sortedNotifications = useMemo(() => {
    const priorityWeight: Record<NotificationPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    return [...notifications].sort((a, b) => {
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return sortedNotifications.filter((n) => n.unread);
    }
    return sortedNotifications;
  }, [sortedNotifications, filter]);

  const lastUpdated = useMemo(() => {
    if (sortedNotifications.length === 0) return "just now";
    return formatRelativeTime(sortedNotifications[0].timestamp);
  }, [sortedNotifications]);

  const groupedNotifications = useMemo(() => ({
    business: filteredNotifications.filter((n) => n.category === "business"),
    insight:  filteredNotifications.filter((n) => n.category === "insight"),
    growth:   filteredNotifications.filter((n) => n.category === "growth"),
    reports:  filteredNotifications.filter((n) => n.category === "reports"),
    system:   filteredNotifications.filter((n) => n.category === "system"),
  }), [filteredNotifications]);

  const categoryOrder: NotificationCategoryId[] = ["business", "insight", "growth", "reports", "system"];

  // ── Actions ───────────────────────────────────────────────────────────────
  const openCategory = (category: NotificationCategoryId) => {
    setOpenCategories((prev) =>
      prev.includes(category) ? prev.filter((id) => id !== category) : [...prev, category],
    );
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, unread: false, isNew: false } : n),
    );
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, isNew: false })));
  };

  const openDropdownForNotification = (notificationId: string, category: NotificationCategoryId) => {
    if (!openCategories.includes(category)) {
      setOpenCategories((prev) => [...prev, category]);
    }
    openDropdown();
    setHighlightedId(notificationId);
    window.setTimeout(() => {
      cardRefs.current[notificationId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  };

  // ── Notification card renderer ────────────────────────────────────────────
  const renderNotificationCard = (notification: NotificationItem) => {
    const categoryMeta = CATEGORY_META[notification.category];
    const priorityMeta = PRIORITY_META[notification.priority];
    const typeMeta     = TYPE_META[notification.type];
    const TypeIcon     = typeMeta.icon;
    const isExpanded   = expandedCards.includes(notification.id);
    const isHighlighted = highlightedId === notification.id;

    const handleCardNavigation = () => {
      if (notification.targetPage) {
        onNavigateToWidget(notification.targetPage, notification.targetWidgetId || "");
        closeDropdown();
      } else {
        toggleCard(notification.id);
      }
    };

    return (
      <div
        key={notification.id}
        ref={(el) => { cardRefs.current[notification.id] = el; }}
        className={cn(
          "group rounded-2xl border bg-card shadow-sm transition-all duration-200 overflow-hidden relative",
          "hover:-translate-y-px hover:shadow-md",
          notification.unread
            ? cn(categoryMeta.unreadBg, categoryMeta.unreadBorder)
            : "border-border/70",
          isHighlighted && "ring-2 ring-primary/40 ring-offset-1",
        )}
      >
        {/* Individual X close/dismiss button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearNotification(notification.id);
          }}
          className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 rounded-md z-10 cursor-pointer"
          title="Dismiss alert"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Card header */}
        <div 
          onClick={handleCardNavigation}
          className="flex flex-col gap-2.5 p-4 cursor-pointer"
        >
          {/* Top row: icon + title + badges */}
          <div className="flex items-start gap-3">
            <span className={cn(
              "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm shadow-sm",
              categoryMeta.accent,
            )}>
              <TypeIcon className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1 pr-10">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <h3 className={cn(
                  "text-[13px] leading-snug",
                  notification.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80",
                )}>
                  {notification.title}
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
                  priorityMeta.className,
                )}>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {priorityMeta.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {notification.summary}
              </p>
            </div>
          </div>

          {/* Bottom row: timestamp + actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(notification.timestamp)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {notification.unread && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCard(notification.id);
                }}
                className="flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                {isExpanded ? "Collapse" : "Expand"}
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  isExpanded ? "rotate-180" : "rotate-0",
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable details accordion */}
        <div className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}>
          <div className="overflow-hidden border-t border-border/50">
            <NotificationDetail 
              notification={notification} 
              onInvestigate={() => {
                if (notification.targetPage) {
                  onNavigateToWidget(notification.targetPage, notification.targetWidgetId || "");
                  closeDropdown();
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* ── Bell button ─────────────────────────────────────────────────── */}
      <button
        ref={bellRef}
        type="button"
        onClick={handleBellToggle}
        aria-label="Notifications"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg",
          "text-muted-foreground transition-all duration-150",
          "hover:bg-muted hover:text-foreground",
          dropdownOpen && "bg-muted/80 text-foreground",
        )}
      >
        <Bell className="h-4 w-4" />
        <UnreadBadge count={unreadCount} pulse={badgePulse} />
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────────────── */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute right-0 top-full z-50 mt-2.5",
            "w-[min(460px,90vw)] rounded-[22px]",
            "border border-border/80 bg-card shadow-elevated backdrop-blur-xl",
            "flex flex-col",
            "transition-all duration-200 origin-top-right",
            dropdownVisible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-1 pointer-events-none",
          )}
          style={{ maxHeight: "76vh" }}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-20 rounded-t-[22px] border-b border-border/70 bg-card/95 px-5 pt-4 pb-0 backdrop-blur-sm shrink-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {unreadCount} unread
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Last updated {lastUpdated}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 px-2.5 text-muted-foreground hover:text-destructive"
                    onClick={() => setNotifications([])}
                  >
                    Clear all
                  </Button>
                )}
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 px-2.5 text-muted-foreground hover:text-foreground"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onExpandFullView();
                    closeDropdown();
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Expand to Full View"
                  aria-label="Expand to Full View"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => closeDropdown()}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex border-b border-border/40 mt-3.5">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "flex-1 pb-2 text-[11px] font-semibold border-b-2 text-center transition-colors cursor-pointer",
                  filter === "all"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={cn(
                  "flex-1 pb-2 text-[11px] font-semibold border-b-2 text-center transition-colors cursor-pointer",
                  filter === "unread"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {loading ? (
              /* Skeleton placeholders */
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border/70 bg-card p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-3/4 rounded" />
                        <Skeleton className="h-3 w-full rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              /* Empty state */
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-8 text-center animate-fade-in">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {filter === "unread" ? "No unread notifications" : "You're all caught up!"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filter === "unread" ? "Switch to 'All' to view older read alerts." : "New updates and alerts will appear here."}
                  </p>
                </div>
              </div>
            ) : (
              /* Grouped categories */
              categoryOrder.map((category) => {
                const items = groupedNotifications[category];
                if (items.length === 0) return null;
                const meta = CATEGORY_META[category];
                const categoryUnread = items.filter((n) => n.unread).length;
                const isOpen = openCategories.includes(category);

                return (
                  <div key={category} className="rounded-2xl border border-border/70 bg-background shadow-sm overflow-hidden">
                    {/* Category header */}
                    <button
                      type="button"
                      onClick={() => openCategory(category)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "grid h-9 w-9 place-items-center rounded-xl border text-sm",
                          meta.accent,
                        )}>
                          <meta.icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-foreground leading-none mb-1">
                            {meta.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {items.length} notification{items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {categoryUnread > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {categoryUnread} new
                          </span>
                        )}
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                          isOpen ? "rotate-180" : "rotate-0",
                        )} />
                      </div>
                    </button>

                    {/* Category items — CSS grid accordion */}
                    <div className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}>
                      <div className="overflow-hidden">
                        <div className="space-y-2.5 p-3 border-t border-border/50">
                          {items.map(renderNotificationCard)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer block to expand to full screen */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border/70 bg-muted/20 flex justify-center shrink-0 rounded-b-[22px]">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs font-semibold gap-1.5 text-primary hover:text-primary/80 hover:bg-primary/5 rounded-xl cursor-pointer"
                onClick={() => {
                  onExpandFullView();
                  closeDropdown();
                }}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Expand to Full Screen View
              </Button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default NotificationCenter;