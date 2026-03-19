import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wraps any component — if the user's plan doesn't include the feature,
 * shows a blurred locked overlay instead.
 *
 * Usage:
 *   <FeatureGate feature="cohort_analysis">
 *     <CohortChart />
 *   </FeatureGate>
 */
export default function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, user } = useAuth();

  if (hasFeature(feature)) return <>{children}</>;

  const planName = user?.subscription?.plan?.displayName || "your current plan";

  if (fallback) return <>{fallback}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none opacity-30 blur-sm">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-center px-6 py-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Feature Locked</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              This feature is not available on <strong>{planName}</strong>.
              Upgrade your plan to unlock it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // Navigate to subscription page — dispatch event for App.tsx to handle
              window.dispatchEvent(new CustomEvent("navigate-to-subscription"));
            }}
            className="mt-1 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}
