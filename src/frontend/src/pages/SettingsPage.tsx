import { useState, useEffect, useCallback } from "react";
import {
  Check, RefreshCw, X, Plus, Copy, Eye, EyeOff,
  KeyRound, Trash2, AlertTriangle,
} from "lucide-react";
// import { BrevoAutomation } from "../components/BrevoAutomation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "../context/AuthContext";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000/api";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK"];
const timezones = [
  "UTC (Coordinated Universal Time)",
  "America/New_York (EST/EDT)",
  "America/Chicago (CST/CDT)",
  "America/Denver (MST/MDT)",
  "America/Los_Angeles (PST/PDT)",
  "Europe/London (GMT/BST)",
  "Europe/Paris (CET/CEST)",
  "Europe/Berlin (CET/CEST)",
  "Asia/Tokyo (JST)",
  "Australia/Sydney (AEST/AEDT)",
  "Asia/Kolkata (IST)",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface SdkProject {
  id: string;
  name: string;
  domain: string | null;
  trackingId: string;
  activeApiKey: { masked: string } | null;
  isActive: boolean;
  createdAt: string;
}

interface NewKeyReveal {
  projectId: string;
  projectName: string;
  apiKey: string; // raw — shown once only
}


// ─── Helpers (match existing SettingsPage pattern exactly) ──────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();

  // Preferences
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [saved, setSaved] = useState(false);

  // ── SDK Projects ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<SdkProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDomain, setNewProjectDomain] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [lastIssuedKey, setLastIssuedKey] = useState<NewKeyReveal | null>(null);
  const [showRawKey, setShowRawKey] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);



  // ── Load projects ─────────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    try {
      const data = await safeFetch(`${AUTH_API}/sdk/projects`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load projects:", err.message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);



  // ── Project actions ───────────────────────────────────────────────────────

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreatingProject(true);
    setProjectError("");
    setLastIssuedKey(null);
    setShowRawKey(false);

    try {
      const data = await safeFetch(`${AUTH_API}/sdk/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          domain: newProjectDomain.trim() || undefined,
        }),
      });

      // Raw key shown once — mirrors the tracker SDK frontend behaviour exactly
      setLastIssuedKey({
        projectId: data.project.id,
        projectName: data.project.name,
        apiKey: data.apiKey,
      });
      setShowRawKey(true);
      setNewProjectName("");
      setNewProjectDomain("");
      await loadProjects();
    } catch (err: any) {
      setProjectError(err.message);
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleRegenerate(project: SdkProject) {
    if (!confirm(`Regenerate the API key for "${project.name}"?\n\nThe current key will stop working immediately.`)) return;

    setRegeneratingId(project.id);
    setLastIssuedKey(null);
    setShowRawKey(false);

    try {
      const data = await safeFetch(
        `${AUTH_API}/sdk/projects/${project.id}/api-key/regenerate`,
        { method: "POST", headers: { Authorization: `Bearer ${token()}` } }
      );

      setLastIssuedKey({
        projectId: data.project.id,
        projectName: data.project.name,
        apiKey: data.apiKey,
      });
      setShowRawKey(true);
      await loadProjects();
    } catch (err: any) {
      setProjectError(err.message);
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleDelete(project: SdkProject) {
    if (!confirm(`Delete "${project.name}"?\n\nThis cannot be undone.`)) return;

    setDeletingId(project.id);
    try {
      await safeFetch(`${AUTH_API}/sdk/projects/${project.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (lastIssuedKey?.projectId === project.id) setLastIssuedKey(null);
    } catch (err: any) {
      setProjectError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setProjectError("Clipboard copy failed.");
    }
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── SDK Tracking Projects ──────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          SDK &amp; Tracking
        </h2>

        <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-5">

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Tracking Projects</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each project gets a unique API key for the tracker SDK. Keys are stored hashed —
                the raw key is shown only once, on creation or after a regenerate.
              </p>
            </div>
          </div>

          {/* Create project form */}
          <form
            onSubmit={handleCreateProject}
            className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-foreground">New project</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Project name *</Label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Acme storefront"
                  autoComplete="off"
                  required
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Domain (optional)</Label>
                <input
                  type="text"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  placeholder="acme.com"
                  autoComplete="off"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={creatingProject || !newProjectName.trim()}
            >
              {creatingProject
                ? <><RefreshCw className="w-3 h-3 animate-spin" />Creating...</>
                : <><Plus className="w-3 h-3" />Create Project</>}
            </Button>
          </form>

          {/* Error */}
          {projectError && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
              <span>{projectError}</span>
              <button type="button" onClick={() => setProjectError("")}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* One-time raw key reveal — shown after create or regen */}
          {lastIssuedKey && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    API key for &quot;{lastIssuedKey.projectName}&quot; — save it now
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This raw key won&apos;t be shown again. Copy it into your environment variables before leaving this page.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2">
                <code className="flex-1 break-all font-mono text-xs text-amber-900">
                  {showRawKey
                    ? lastIssuedKey.apiKey
                    : "trk_live_••••••••••••••••••••••••••••••••"}
                </code>
                <button
                  type="button"
                  className="shrink-0 text-amber-700 hover:text-amber-900"
                  onClick={() => setShowRawKey((v) => !v)}
                >
                  {showRawKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  className="shrink-0 text-amber-700 hover:text-amber-900"
                  onClick={() => handleCopy(lastIssuedKey.apiKey, lastIssuedKey.projectId)}
                >
                  {copiedId === lastIssuedKey.projectId
                    ? <Check className="w-4 h-4 text-green-600" />
                    : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Project list */}
          {loadingProjects ? (
            <p className="text-xs text-muted-foreground">Loading projects...</p>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 text-center">
              <p className="text-xs text-muted-foreground">
                No projects yet. Create your first one above — the backend will generate a fresh{" "}
                <code className="font-mono text-xs">trk_live_*</code> key for it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-border bg-background p-4 space-y-3"
                >
                  {/* Project header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
                      {project.domain && (
                        <p className="text-xs text-muted-foreground mt-0.5">{project.domain}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        disabled={regeneratingId === project.id}
                        onClick={() => handleRegenerate(project)}
                        title="Regenerate API key"
                      >
                        <RefreshCw className={`w-3 h-3 ${regeneratingId === project.id ? "animate-spin" : ""}`} />
                        Regen key
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50"
                        disabled={deletingId === project.id}
                        onClick={() => handleDelete(project)}
                        title="Delete project"
                      >
                        {deletingId === project.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>

                  {/* Active key (masked) */}
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Active API Key
                      </p>
                      <code className="font-mono text-xs text-foreground">
                        {project.activeApiKey?.masked ?? "No active key"}
                      </code>
                    </div>
                    {project.activeApiKey?.masked && (
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(project.activeApiKey!.masked, project.id)}
                        title="Copy masked key"
                      >
                        {copiedId === project.id
                          ? <Check className="w-4 h-4 text-green-600" />
                          : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {/* Tracking ID */}
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Tracking ID (public — embed in your site)
                    </p>
                    <code className="font-mono text-xs text-foreground break-all">
                      {project.trackingId}
                    </code>
                  </div>

                  {/* SDK snippet */}
                  <details>
                    <summary className="cursor-pointer select-none text-xs text-primary hover:underline">
                      View SDK snippet
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-cyan-100">
{`<script>
  window.TRACKER_KEY = "${project.activeApiKey?.masked ?? "<your-api-key>"}";
  window.TRACKER_ID  = "${project.trackingId}";
</script>
<script src="https://cdn.yourapp.com/tracker.js" defer></script>`}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CRM & Email Automation (Brevo) ─────────────────────────────── */}
      {/* <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Marketing Automation
        </h2>
        <BrevoAutomation hasProjects={projects.length > 0} />
      </section> */}

      {/* ── Preferences ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Preferences
        </h2>
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Currency</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Used for all revenue displays</p>
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Timezone</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Affects date groupings</p>
            </div>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-56 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz} className="text-sm">{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── Save ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="default"
          className="h-10 px-6 text-sm"
          onClick={handleSave}
          style={saved ? { backgroundColor: "#16a34a" } : undefined}
        >
          {saved ? <><Check className="w-4 h-4 mr-1.5" />Saved!</> : "Save Settings"}
        </Button>
        {saved && <span className="text-xs text-muted-foreground">All preferences updated</span>}
      </div>

      <footer className="pt-4 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          © 2026. Built with ❤️ using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
