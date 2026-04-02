import { useState, useRef, useEffect } from "react";
import { Check, Upload, Link2, RefreshCw, X, ChevronDown } from "lucide-react";
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

interface GA4Property {
  propertyId: string;
  propertyName: string;
  accountId: string;
  accountName: string;
}

interface Client {
  id: string;
  name: string;
  domain: string;
  ga4Credential?: {
    propertyId: string;
    propertyName: string;
    googleEmail: string;
    connectedAt: string;
  } | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clients + GA4 state
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // GA4 OAuth flow state
  const [ga4Step, setGa4Step] = useState<"idle" | "connecting" | "picking" | "saving" | "done" | "error">("idle");
  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [tempAuthData, setTempAuthData] = useState<any>(null);
  const [ga4Error, setGa4Error] = useState<string>("");

  const token = () => {
    const t = localStorage.getItem("access_token");
    if (!t) throw new Error("No auth token");
    return t;
  };

  const safeFetch = async (url: string, options: any = {}) => {
    const res = await fetch(url, options);

    let data
    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid server response");
    }

    if (!res.ok) {
      throw new Error(data?.error || "Request failed");
    }

    return data;
  };

  // ── Load clients ──
  useEffect(() => {
    const loadClients = async () => {
      try {
        const t = token();
        const data = await safeFetch(`${AUTH_API}/clients`, {
          headers: { Authorization: `Bearer ${t}` },
        });

        if (Array.isArray(data)) {
          setClients(data);
          if (data.length > 0 && !selectedClientId) {
            setSelectedClientId(data[0].id);
          }
        } else {
          throw new Error("Invalid clients response");
        }
      } catch (err: any) {
        console.error(err.message);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  // ── Handle GA4 OAuth callback redirect ──
  // When Google redirects back to /settings?ga4=pick_property&data=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ga4Status = params.get("ga4");
    const data = params.get("data");

    if (ga4Status === "pick_property" && data) {
      try {
        const decoded = JSON.parse(atob(data));
        if (!decoded?.accessToken || !decoded?.clientId) {
          throw new Error("Invalid OAuth payload");
        }
        setTempAuthData(decoded);
        setSelectedClientId(decoded.clientId);
        // Fetch property list using the access token
        fetchProperties(decoded.accessToken, decoded);
      } catch {
        setGa4Error("Failed to parse OAuth response");
        setGa4Step("error");
      }
      // Clean URL
      window.history.replaceState({}, "", "/settings");
    } else if (ga4Status === "error") {
      const reason = params.get("reason") || "Unknown error";
      setGa4Error(`Google authorization failed: ${reason}`);
      setGa4Step("error");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  async function fetchProperties(accessToken: string, authData: any) {
    setGa4Step("picking");

    try {
      const data = await safeFetch(`${AUTH_API}/ga4/auth/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ accessToken }),
      });

      setGa4Properties(Array.isArray(data.properties) ? data.properties : []);
      setTempAuthData(authData);

    } catch (err: any) {
      setGa4Error(err.message);
      setGa4Step("error");
    }
  }

  // ── Step 1: Initiate GA4 OAuth ──
  async function handleConnectGA4() {
    if (!selectedClientId) {
      setGa4Error("Please select a client first");
      return;
    }

    setGa4Step("connecting");
    setGa4Error("");

    try {
      const data = await safeFetch(
        `${AUTH_API}/ga4/auth/url?clientId=${selectedClientId}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );

      window.location.href = data.url;

    } catch (err: any) {
      setGa4Error(err.message);
      setGa4Step("error");
    }
  }

  // ── Step 2: Save selected property ──
  async function handleSaveProperty() {
    if (!selectedPropertyId || !tempAuthData) return;

    const property = ga4Properties.find((p) => p.propertyId === selectedPropertyId);
    if (!property) return;

    setGa4Step("saving");

    try {
      const data = await safeFetch(`${AUTH_API}/ga4/auth/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          clientId: tempAuthData.clientId,
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          accountId: property.accountId,
          accessToken: tempAuthData.accessToken,
          refreshToken: tempAuthData.refreshToken,
          expiresAt: tempAuthData.expiresAt,
          googleEmail: tempAuthData.googleEmail,
        }),
      });

      setClients((prev) =>
        prev.map((c) =>
          c.id === tempAuthData.clientId
            ? { ...c, ga4Credential: data.credential }
            : c
        )
      );

      setGa4Step("done");
      setTempAuthData(null);
      setGa4Properties([]);

    } catch (err: any) {
      setGa4Error(err.message);
      setGa4Step("error");
    }
  }

  // ── Disconnect GA4 ──
  async function handleDisconnect(clientId: string) {
    if (!confirm("Disconnect GA4 from this client?")) return;

    try {
      await safeFetch(`${AUTH_API}/ga4/auth/disconnect/${clientId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });

      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId ? { ...c, ga4Credential: null } : c
        )
      );

    } catch (err: any) {
      setGa4Error(err.message);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file.name);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) setUploadedFile(file.name);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const selectedClient = Array.isArray(clients)
    ? clients.find((c) => c.id === selectedClientId)
    : undefined;
  const isConnected = !!selectedClient?.ga4Credential;

  return (
    <div className="max-w-2xl space-y-6">

      {/* Integrations */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Integrations
        </h2>
        <div className="space-y-4">

          {/* Google Analytics */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 text-xl">
                  📊
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Google Analytics 4</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect a GA4 property to pull real analytics data
                  </p>
                </div>
              </div>
            </div>

            {/* Client selector */}
            {!loadingClients && clients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Select client to connect
                </Label>
                <Select
                  value={selectedClientId}
                  onValueChange={(v) => {
                    setSelectedClientId(v);
                    setGa4Step("idle");
                    setGa4Error("");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Pick a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">
                        <span className="flex items-center gap-2">
                          {c.name}
                          <span className="text-xs text-muted-foreground">— {c.domain}</span>
                          {c.ga4Credential && (
                            <span className="text-xs text-green-600 font-semibold">✓ Connected</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loadingClients && (
              <p className="text-xs text-muted-foreground">Loading clients...</p>
            )}

            {!loadingClients && clients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No clients yet. Add a client first to connect GA4.
              </p>
            )}

            {/* Connected state */}
            {selectedClient?.ga4Credential && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-green-700">
                    ✓ Connected — {selectedClient.ga4Credential.propertyName}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {selectedClient.ga4Credential.googleEmail} ·{" "}
                    {selectedClient.ga4Credential.propertyId}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleDisconnect(selectedClient.id)}
                >
                  Disconnect
                </Button>
              </div>
            )}

            {/* Property picker (after OAuth) */}
            {(ga4Step === "picking" || ga4Step === "saving") && ga4Properties.length > 0 && (
              <div className="space-y-3 border border-primary/20 rounded-xl p-4 bg-accent/30">
                <p className="text-xs font-semibold text-foreground">
                  Select your GA4 property
                </p>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Choose a GA4 property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ga4Properties.map((p) => (
                      <SelectItem key={p.propertyId} value={p.propertyId} className="text-sm">
                        <span className="flex flex-col">
                          <span>{p.propertyName}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.accountName} · {p.propertyId}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!selectedPropertyId || ga4Step === "saving"}
                    onClick={handleSaveProperty}
                  >
                    {ga4Step === "saving" ? (
                      <><RefreshCw className="w-3 h-3 animate-spin mr-1" />Saving...</>
                    ) : "Connect Property"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => { setGa4Step("idle"); setGa4Properties([]); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Error message */}
            {ga4Error && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                <span>{ga4Error}</span>
                <button onClick={() => { setGa4Error(""); setGa4Step("idle"); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Connect button */}
            {!isConnected && ga4Step !== "picking" && (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={ga4Step === "connecting" || !selectedClientId}
                onClick={handleConnectGA4}
              >
                {ga4Step === "connecting" ? (
                  <><RefreshCw className="w-3 h-3 animate-spin" />Connecting...</>
                ) : (
                  <><Link2 className="w-3 h-3" />Connect GA4</>
                )}
              </Button>
            )}

            {/* Re-connect button for connected clients */}
            {isConnected && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                disabled={ga4Step === "connecting"}
                onClick={handleConnectGA4}
              >
                <RefreshCw className="w-3 h-3" />
                Re-authorise
              </Button>
            )}
          </div>

          {/* CSV Upload */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-1">CSV Data Import</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Upload a CSV file to import historical data. Supports GA exports and custom formats.
            </p>
            <button
              type="button"
              className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${isDragging
                ? "border-primary bg-accent"
                : uploadedFile
                  ? "border-green-400 bg-green-50"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadedFile ? (
                <div>
                  <Check className="w-8 h-8 mx-auto mb-2" style={{ color: "#16a34a" }} />
                  <p className="text-sm font-semibold text-foreground">{uploadedFile}</p>
                  <p className="text-xs text-muted-foreground mt-1">File ready to import</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Drop your CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or <span className="text-primary font-medium">click to browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">Supports .csv files up to 50MB</p>
                </div>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Preferences */}
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

      {/* Save */}
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
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
