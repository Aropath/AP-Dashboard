import { useState, useRef } from "react";
import { Check, Upload, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
];

export default function SettingsPage() {
  const [gaConnected, setGaConnected] = useState(false);
  const [gaConnecting, setGaConnecting] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("America/New_York (EST/EDT)");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleConnectGA() {
    setGaConnecting(true);
    setTimeout(() => {
      setGaConnecting(false);
      setGaConnected(true);
    }, 1800);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file.name);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      setUploadedFile(file.name);
    }
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Integrations */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Integrations</h2>
        <div className="space-y-4">
          {/* Google Analytics */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 text-xl">
                  📊
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Google Analytics</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {gaConnected ? "Connected — syncing GA4 data" : "Connect your GA4 property to import real data"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {gaConnected && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: "#16a34a", backgroundColor: "#dcfce7" }}
                  >
                    Connected
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={gaConnected ? "outline" : "default"}
                  className="h-8 text-xs gap-1.5"
                  disabled={gaConnecting}
                  onClick={gaConnected ? () => setGaConnected(false) : handleConnectGA}
                  style={gaConnected ? { color: "#dc2626", borderColor: "#fca5a5" } : undefined}
                >
                  {gaConnecting ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Connecting...
                    </>
                  ) : gaConnected ? (
                    "Disconnect"
                  ) : (
                    <>
                      <Link2 className="w-3 h-3" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* CSV Upload */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-1">CSV Data Import</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Upload a CSV file to import historical data. Supports GA exports and custom formats.
            </p>
            <button
              type="button"
              className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                isDragging
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
                  <p className="text-sm font-medium text-foreground">
                    Drop your CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or{" "}
                    <span className="text-primary font-medium">click to browse</span>
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
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Preferences</h2>
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-5">
          {/* Currency */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Currency</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Used for all revenue and ROI displays</p>
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-border" />

          {/* Timezone */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Timezone</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Affects date groupings and report times</p>
            </div>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-56 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz} className="text-sm">
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="default"
          className="h-10 px-6 text-sm"
          onClick={handleSave}
          style={saved ? { backgroundColor: "#16a34a" } : undefined}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              Saved!
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
        {saved && (
          <span className="text-xs text-muted-foreground">All preferences updated</span>
        )}
      </div>

      {/* Footer */}
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
