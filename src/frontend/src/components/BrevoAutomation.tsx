// src/frontend/src/components/BrevoAutomation.tsx
// Drop this anywhere — it manages its own state and API calls.
// Props:
//   hasProjects — pass true once the user has at least one tracking project.
//                 The connect button stays disabled until then.

import { useState, useEffect, useCallback } from "react";
import { Zap, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000/api";

interface BrevoStatus {
  connected: boolean;
  accountEmail?: string;
  connectedAt?: string;
}

interface Props {
  hasProjects?: boolean;
}

const token = () => {
  const t = localStorage.getItem("access_token");
  if (!t) throw new Error("No auth token");
  return t;
};

const safeFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
  const res = await fetch(url, options);
  let data: any;
  try { data = await res.json(); } catch { throw new Error("Invalid server response"); }
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
};

export function BrevoAutomation({ hasProjects = false }: Props) {
  const [status, setStatus] = useState<BrevoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await safeFetch(`${AUTH_API}/brevo/status`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Handle redirect back from Brevo OAuth
    const params = new URLSearchParams(window.location.search);
    const result = params.get("brevo");
    if (result) {
      window.history.replaceState({}, "", window.location.pathname);
      if (result === "error") {
        setError(`Brevo connection failed: ${params.get("reason") || "unknown error"}`);
      }
      loadStatus();
    }
  }, [loadStatus]);

  async function handleConnect() {
    setConnecting(true);
    setError("");
    try {
      const data = await safeFetch(`${AUTH_API}/brevo/url`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Brevo? Automated campaign triggers will stop working.")) return;
    try {
      await safeFetch(`${AUTH_API}/brevo/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      setStatus({ connected: false });
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">CRM &amp; Email Automation</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect Brevo to automatically trigger email campaigns based on your tracking
              events — discount alerts, re-engagement flows, and more.
            </p>
          </div>
        </div>
        {status?.connected && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Checking connection...</p>
      ) : status?.connected ? (
        <>
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-green-700">
                ✓ Brevo connected — automation active
              </p>
              {status.accountEmail && (
                <p className="mt-0.5 text-xs text-green-600">{status.accountEmail}</p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Campaign triggers fire automatically when coupon or discount events arrive from
            any of your tracking projects.
          </p>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Connect your Brevo account to enable automated campaigns. Once connected,
              events from your tracker projects will trigger the right email flows to your
              contacts automatically.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={connecting || !hasProjects}
            onClick={handleConnect}
            title={!hasProjects ? "Add a tracking project first" : undefined}
          >
            {connecting
              ? <><RefreshCw className="w-3 h-3 animate-spin" />Connecting...</>
              : <><Zap className="w-3 h-3" />Enable CRM Automation</>}
          </Button>
          {!hasProjects && (
            <p className="text-xs text-muted-foreground">
              Add a tracking project above to enable CRM automation.
            </p>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
