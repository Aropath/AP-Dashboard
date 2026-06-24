"use client";

import { useMemo, useState } from "react";
import {
  X,
  Bell,
  Clock,
  TrendingUp,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NotificationItem,
  NotificationCategoryId,
  NotificationPriority,
  CATEGORY_META,
  TYPE_META,
  PRIORITY_META,
  formatRelativeTime,
} from "./NotificationCenter";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onNavigateToWidget: (page: any, widgetId: string) => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  setNotifications,
  onNavigateToWidget,
}: NotificationsModalProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [collapsedCategories, setCollapsedCategories] = useState<NotificationCategoryId[]>(() => {
    try {
      const stored = sessionStorage.getItem("notifications_collapsed_categories");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleCategory = (category: NotificationCategoryId) => {
    setCollapsedCategories((prev) => {
      const next = prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category];
      try {
        sessionStorage.setItem("notifications_collapsed_categories", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

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

  const groupedNotifications = useMemo(() => ({
    business: filteredNotifications.filter((n) => n.category === "business"),
    insight:  filteredNotifications.filter((n) => n.category === "insight"),
    growth:   filteredNotifications.filter((n) => n.category === "growth"),
    reports:  filteredNotifications.filter((n) => n.category === "reports"),
    system:   filteredNotifications.filter((n) => n.category === "system"),
  }), [filteredNotifications]);

  const categoryOrder: NotificationCategoryId[] = ["business", "insight", "growth", "reports", "system"];

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

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "absolute inset-0 z-40 bg-slate-950/15 backdrop-blur-sm",
        "flex items-center justify-center p-4 sm:p-6 transition-all duration-300 animate-in fade-in"
      )}
    >
      <div 
        className={cn(
          "bg-card border border-border/80 shadow-elevated rounded-[24px]",
          "w-[94%] max-w-[1240px] h-[84vh] flex flex-col overflow-hidden relative",
          "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        )}
      >
        {/* Sticky header */}
        <div className="p-6 border-b border-border bg-card/95 backdrop-blur-sm shrink-0 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-primary" />
                Notification Center (Full Stream)
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {unreadCount} unread
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Monitor all system alerts, smart insights, and key metrics in full detail.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl cursor-pointer"
                  onClick={clearAllNotifications}
                >
                  Clear all
                </Button>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl cursor-pointer"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer border border-border/50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-border/40 w-fit">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "pb-2.5 px-4 text-xs font-semibold border-b-2 text-center transition-colors cursor-pointer",
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
                "pb-2.5 px-4 text-xs font-semibold border-b-2 text-center transition-colors cursor-pointer",
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            /* Empty state */
            <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center animate-fade-in">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Bell className="h-8 w-8" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {filter === "unread" ? "No unread notifications" : "You're all caught up!"}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
                  {filter === "unread" ? "Switch to the 'All' tab to view older read alerts." : "New updates, anomaly alerts, and performance metrics will appear here."}
                </p>
              </div>
            </div>
          ) : (
            /* Grouped categories */
            <div className="space-y-8">
              {categoryOrder.map((category) => {
                const items = groupedNotifications[category];
                if (items.length === 0) return null;
                const meta = CATEGORY_META[category];
                const isCollapsed = collapsedCategories.includes(category);

                return (
                  <div key={category} className="flex flex-col gap-2.5">
                    {/* Category Title Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer border border-transparent focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "grid h-8 w-8 place-items-center rounded-lg border text-xs shadow-xs transition-transform duration-200 group-hover:scale-105",
                          meta.accent,
                        )}>
                          <meta.icon className="h-4 w-4" />
                        </span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          {meta.title}
                          <span className="text-[10px] text-muted-foreground font-normal lowercase">
                            ({items.length} item{items.length !== 1 ? "s" : ""})
                          </span>
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
                        <span className="text-[9px] font-semibold tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {isCollapsed ? "Expand" : "Collapse"}
                        </span>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isCollapsed ? "-rotate-90 text-muted-foreground/60" : "rotate-0"
                        )} />
                      </div>
                    </button>

                    {/* Full-width stack of notification items (Accordion grid transition) */}
                    <div className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      isCollapsed ? "grid-rows-[0fr] opacity-0 pointer-events-none" : "grid-rows-[1fr] opacity-100"
                    )}>
                      <div className="overflow-hidden">
                        <div className="flex flex-col gap-4 pt-2.5 pb-1">
                          {items.map((notification) => {
                        const priorityMeta = PRIORITY_META[notification.priority];
                        const typeMeta     = TYPE_META[notification.type];
                        const TypeIcon     = typeMeta.icon;

                        return (
                          <div
                            key={notification.id}
                            className={cn(
                              "group rounded-2xl border bg-card/65 shadow-sm p-5 relative transition-all duration-200 overflow-hidden",
                              "hover:shadow-md hover:bg-card/90",
                              notification.unread
                                ? cn(meta.unreadBg, meta.unreadBorder)
                                : "border-border/70",
                              "flex flex-col lg:flex-row gap-5 items-stretch justify-between"
                            )}
                          >
                            {/* Card close button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-destructive opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-1 rounded-md z-10 cursor-pointer"
                              title="Dismiss alert"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>

                            {/* Left Section: Icon, Title, Priority, Summary */}
                            <div className="flex flex-col justify-center min-w-0 lg:w-[28%] shrink-0 gap-2">
                              <div className="flex items-start gap-3">
                                <span className={cn(
                                  "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm shadow-sm",
                                  meta.accent,
                                )}>
                                  <TypeIcon className="h-4 w-4" />
                                </span>

                                <div className="min-w-0 flex-1 pr-6">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                    <h4 className={cn(
                                      "text-xs leading-snug",
                                      notification.unread ? "font-bold text-foreground" : "font-semibold text-foreground/80",
                                    )}>
                                      {notification.title}
                                    </h4>
                                    <span className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.1em]",
                                      priorityMeta.className,
                                    )}>
                                      <span className="h-1 w-1 rounded-full bg-current" />
                                      {priorityMeta.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {notification.summary}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Middle Section: Complete Narrative & Detailed Diagnostics */}
                            <div className="flex flex-col gap-2.5 flex-1 border-t lg:border-t-0 lg:border-l border-border/40 pt-3 lg:pt-0 lg:pl-5">
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {notification.details.completeDescription}
                              </p>
                              
                              <div className="flex flex-col sm:flex-row gap-4 border-t border-border/30 pt-2.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">What happened</p>
                                  <p className="text-[11px] text-foreground leading-relaxed">{notification.details.whatHappened}</p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">Why it matters</p>
                                  <p className="text-[11px] text-foreground leading-relaxed">{notification.details.whyItMatters}</p>
                                </div>
                              </div>
                            </div>

                            {/* Right Section: Recommended Next Step & Actions */}
                            <div className="flex flex-col justify-between min-w-0 lg:w-[28%] border-t lg:border-t-0 lg:border-l border-border/40 pt-3 lg:pt-0 lg:pl-5 gap-3">
                              <div className="min-w-0">
                                <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">Suggested Next Step</p>
                                <p className="text-[11px] font-medium text-foreground leading-relaxed">{notification.details.nextStep}</p>
                              </div>

                              {/* Time Context & Actions Bar */}
                              <div className="flex items-center justify-between gap-3 mt-auto pt-2 border-t border-border/30 lg:border-t-0">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatRelativeTime(notification.timestamp)}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/80 pl-4">
                                    {notification.details.exactTimestamp}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {notification.unread && (
                                    <button
                                      type="button"
                                      onClick={() => markAsRead(notification.id)}
                                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                      Mark read
                                    </button>
                                  )}
                                  {notification.targetPage && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 text-[9px] font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg cursor-pointer"
                                      onClick={() => {
                                        onNavigateToWidget(notification.targetPage!, notification.targetWidgetId || "");
                                      }}
                                    >
                                      <TrendingUp className="h-3 w-3" />
                                      Investigate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
