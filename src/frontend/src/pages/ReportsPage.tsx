import { useState } from "react";
import { FileText, Download, RefreshCw, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportState = "idle" | "generating" | "done";

interface ReportHistoryRow {
  name: string;
  period: string;
  generated: string;
  status: string;
}

// Placeholder seed rows shown before any report has been downloaded.
// Mirrors mockData.ts's reportHistory shape. Replace with a real API
// call (e.g. fetchReportHistory()) when the backend endpoint exists.
const initialReportHistory: ReportHistoryRow[] = [
  { name: "Weekly Growth Report", period: "Feb 17–23, 2026", generated: "Feb 24, 2026", status: "Ready" },
  { name: "Monthly Analytics Report", period: "January 2026", generated: "Feb 1, 2026", status: "Ready" },
  { name: "Weekly Growth Report", period: "Feb 10–16, 2026", generated: "Feb 17, 2026", status: "Ready" },
  { name: "Q4 Business Review", period: "Oct–Dec 2025", generated: "Jan 5, 2026", status: "Ready" },
  { name: "Weekly Growth Report", period: "Feb 3–9, 2026", generated: "Feb 10, 2026", status: "Ready" },
  { name: "Monthly Analytics Report", period: "December 2025", generated: "Jan 2, 2026", status: "Ready" },
];

/**
 * Builds a minimal, valid single-page blank PDF as a Blob.
 * This is a placeholder for real report generation — swap the byte
 * content here once a backend PDF-generation endpoint exists.
 */
function buildBlankPdfBlob(): Blob {
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 0 >>
stream
endstream
endobj
xref
0 5
0000000000 65535 f 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
0
%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadBlankPdf(filename: string) {
  const blob = buildBlankPdfBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatNow(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  lastGenerated: string;
}

const reportCards: ReportCard[] = [
  {
    id: "weekly",
    title: "Weekly Report",
    description: "Comprehensive overview of the past 7 days including traffic, conversions, revenue, and AI-generated insights.",
    icon: Calendar,
    lastGenerated: "Feb 24, 2026",
  },
  {
    id: "monthly",
    title: "Monthly Report",
    description: "In-depth monthly analysis with trend comparisons, cohort retention, and strategic growth recommendations.",
    icon: FileText,
    lastGenerated: "Feb 1, 2026",
  },
];

export default function ReportsPage() {
  const [reportStates, setReportStates] = useState<Record<string, ReportState>>({
    weekly: "idle",
    monthly: "idle",
  });
  const [reportHistory, setReportHistory] = useState<ReportHistoryRow[]>(initialReportHistory);

  function generateReport(id: string) {
    setReportStates((prev) => ({ ...prev, [id]: "generating" }));
    setTimeout(() => {
      setReportStates((prev) => ({ ...prev, [id]: "done" }));
    }, 2200);
  }

  function resetReport(id: string) {
    setReportStates((prev) => ({ ...prev, [id]: "idle" }));
  }

  // Downloads a blank PDF for a given report card and logs it into history.
  function handleDownloadCard(card: ReportCard) {
    const generatedAt = formatNow();
    downloadBlankPdf(`${card.title.replace(/\s+/g, "_")}_${Date.now()}`);
    setReportHistory((prev) => [
      {
        name: card.id === "weekly" ? "Weekly Growth Report" : "Monthly Analytics Report",
        period: card.id === "weekly" ? "Last 7 days" : "Last 30 days",
        generated: generatedAt,
        status: "Ready",
      },
      ...prev,
    ]);
  }

  // Re-downloads a blank PDF for an existing history row (doesn't re-log).
  function handleDownloadHistoryRow(row: ReportHistoryRow) {
    downloadBlankPdf(`${row.name.replace(/\s+/g, "_")}_${Date.now()}`);
  }

  return (
    <div className="space-y-6">
      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((card) => {
          const state = reportStates[card.id];
          const Icon = card.icon;
          return (
            <div key={card.id} className="bg-card rounded-2xl p-6 shadow-card border border-border">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last generated: {state === "done" ? "Just now" : card.lastGenerated}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{card.description}</p>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 text-xs flex-1"
                  disabled={state === "generating"}
                  onClick={() => state === "done" ? resetReport(card.id) : generateReport(card.id)}
                  variant={state === "done" ? "outline" : "default"}
                  style={state === "done" ? { color: "#16a34a", borderColor: "#16a34a" } : undefined}
                >
                  {state === "generating" ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : state === "done" ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Generated!
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Generate Report
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  disabled={state === "generating"}
                  onClick={() => handleDownloadCard(card)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </Button>
              </div>

              {state === "done" && (
                <div
                  className="mt-3 rounded-lg px-3 py-2.5 flex items-center gap-2 text-xs font-medium"
                  style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Report ready! Click "Download PDF" to save.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Report History */}
      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Report History</h3>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#eef2ff", color: "#4f46e5" }}
          >
            {reportHistory.length} reports
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Report Name</TableHead>
                <TableHead className="text-xs font-semibold">Period</TableHead>
                <TableHead className="text-xs font-semibold">Generated</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportHistory.map((row, i) => (
                <TableRow key={`${row.name}-${i}`} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-sm font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.period}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.generated}</TableCell>
                  <TableCell>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: "#16a34a", backgroundColor: "#dcfce7" }}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleDownloadHistoryRow(row)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
