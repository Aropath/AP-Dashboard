import { useState, useEffect } from "react";
import { Check, Zap, Shield, Building2, Sparkles, AlertTriangle, RefreshCw, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchPlans, changePlan, cancelSubscription } from "../services/fetchMetrics";

interface PlanData {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    maxClients: number;
    maxReports: number;
    dataRetentionDays: number;
    apiCallsPerDay: number;
  };
}

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Sparkles,
  growth: Zap,
  pro: Shield,
  enterprise: Building2,
};

const FEATURE_LABELS: Record<string, string> = {
  overview_page: "Overview Dashboard",
  basic_analytics: "Basic Analytics",
  advanced_analytics: "Advanced Analytics",
  insights_page: "AI Insights",
  growth_plan: "Growth Plan",
  reports_page: "Reports & Exports",
  csv_export: "CSV Export",
  pdf_export: "PDF Export",
  api_access: "API Access",
  cohort_analysis: "Cohort Analysis",
  funnel_analysis: "Conversion Funnel",
  white_label: "White Label",
  priority_support: "Priority Support",
  custom_integrations: "Custom Integrations",
  sso: "SSO / SAML",
};

function formatLimit(key: string, val: number): string {
  if (val === -1) return "Unlimited";
  if (key === "dataRetentionDays") return `${val} days`;
  if (key === "apiCallsPerDay") return val.toLocaleString() + "/day";
  return val.toString();
}

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [billing, setBilling] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentPlan = user?.subscription?.plan?.name || "free";
  const subStatus = user?.subscription?.status;
  const periodEnd = user?.subscription?.currentPeriodEnd
    ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;
  const cancelAtEnd = user?.subscription?.cancelAtPeriodEnd;

  useEffect(() => {
    fetchPlans()
      .then((data) => setPlans(data || []))
      .catch(() => setMessage({ type: "error", text: "Failed to load plans" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleChangePlan(planName: string) {
    if (planName === currentPlan) return;
    setChanging(planName);
    setMessage(null);
    try {
      await changePlan(planName, billing);
      await refreshUser();
      setMessage({ type: "success", text: `Successfully switched to ${planName} plan!` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setChanging(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure? Your subscription will remain active until the end of the billing period.")) return;
    setCancelling(true);
    try {
      await cancelSubscription();
      await refreshUser();
      setMessage({ type: "success", text: "Subscription will be cancelled at period end." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Subscription</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan, billing, and feature access
        </p>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${message.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-600"}`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Current plan status */}
      {user?.subscription && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current Plan
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  subStatus === "ACTIVE" ? "bg-green-100 text-green-700" :
                  subStatus === "TRIALING" ? "bg-blue-100 text-blue-700" :
                  subStatus === "EXPIRED" ? "bg-red-100 text-red-600" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {subStatus}
                </span>
                {cancelAtEnd && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Cancels at period end
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">
                {user.subscription.plan.displayName}
              </p>
              {periodEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  {cancelAtEnd ? "Access until" : "Renews"}: {periodEnd}
                </p>
              )}
            </div>

            {currentPlan !== "free" && !cancelAtEnd && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cancelling ? "animate-spin" : ""}`} />
                Cancel subscription
              </button>
            )}
          </div>

          {/* Feature list */}
          <div className="mt-4 flex flex-wrap gap-2">
            {user.subscription.plan.features.map((f) => (
              <span key={f} className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <Check className="w-3 h-3 text-primary" />
                {FEATURE_LABELS[f] || f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${billing === "MONTHLY" ? "text-foreground" : "text-muted-foreground"}`}>
          Monthly
        </span>
        <button
          type="button"
          onClick={() => setBilling((b) => b === "MONTHLY" ? "YEARLY" : "MONTHLY")}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            billing === "YEARLY" ? "bg-primary" : "bg-muted"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            billing === "YEARLY" ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
        <span className={`text-sm font-medium ${billing === "YEARLY" ? "text-foreground" : "text-muted-foreground"}`}>
          Yearly
          <span className="ml-1.5 text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
            Save ~17%
          </span>
        </span>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse h-72" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.name] || Sparkles;
            const isCurrent = plan.name === currentPlan;
            const price = billing === "YEARLY" ? plan.priceYearly / 12 : plan.priceMonthly;
            const isPopular = plan.name === "pro";

            return (
              <div
                key={plan.id}
                className={`relative bg-card border rounded-2xl p-6 flex flex-col transition-all duration-200
                  ${isCurrent
                    ? "border-primary shadow-md ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
                  }`}
              >
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{plan.displayName}</h3>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-2xl font-extrabold text-foreground font-mono">
                      ${plan.priceMonthly === 0 ? "0" : Math.round(price)}
                    </span>
                    <span className="text-xs text-muted-foreground mb-1">/mo</span>
                  </div>
                  {billing === "YEARLY" && plan.priceMonthly > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      ${plan.priceYearly}/yr — saves ${(plan.priceMonthly * 12 - plan.priceYearly).toFixed(0)}
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-1.5 mb-4 text-xs text-muted-foreground">
                  {Object.entries(plan.limits).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, " $1").replace("max ", "").trim()}</span>
                      <span className="font-semibold text-foreground">{formatLimit(key, val as number)}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-1.5 mb-5">
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      {FEATURE_LABELS[f] || f}
                    </li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-xs text-primary font-medium">
                      +{plan.features.length - 6} more features
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => handleChangePlan(plan.name)}
                  disabled={isCurrent || changing !== null}
                  className={`w-full py-2 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isCurrent
                      ? "bg-muted text-muted-foreground cursor-default"
                      : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    }`}
                >
                  {changing === plan.name ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Switching…
                    </span>
                  ) : isCurrent ? "Current Plan" : plan.priceMonthly === 0 ? "Downgrade to Free" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature comparison note */}
      <p className="text-center text-xs text-muted-foreground">
        All plans include core analytics tracking. Features are unlocked/locked automatically based on your active plan.
      </p>
    </div>
  );
}
