import { useState } from "react";
import { CheckCircle, ArrowUpDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiInsights, type AIInsight } from "../mockData";

type Priority = "All" | "High" | "Medium" | "Low";
type SortBy = "impact" | "priority" | "date";

const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export default function InsightsPage() {
  const [filter, setFilter] = useState<Priority>("All");
  const [sortBy, setSortBy] = useState<SortBy>("impact");
  const [doneInsights, setDoneInsights] = useState<Set<number>>(new Set());

  function toggleInsight(id: number) {
    setDoneInsights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered: AIInsight[] = aiInsights
    .filter((i) => filter === "All" || i.priority === filter)
    .sort((a, b) => {
      if (sortBy === "impact") return b.impact - a.impact;
      if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const priorityStyle = (p: string) => {
    if (p === "High") return { color: "#dc2626", bg: "#fee2e2" };
    if (p === "Medium") return { color: "#d97706", bg: "#fef3c7" };
    return { color: "#16a34a", bg: "#dcfce7" };
  };

  const impactColor = (score: number) => {
    if (score >= 8.5) return "#4f46e5";
    if (score >= 7) return "#d97706";
    return "#6b7280";
  };

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["High", "Medium", "Low"] as const).map((p) => {
          const count = aiInsights.filter((i) => i.priority === p).length;
          const style = priorityStyle(p);
          return (
            <div key={p} className="bg-card rounded-2xl p-4 shadow-card border border-border">
              <div
                className="text-xs font-semibold mb-1"
                style={{ color: style.color }}
              >
                {p} Priority
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">insights</div>
            </div>
          );
        })}
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["All", "High", "Medium", "Low"] as Priority[]).map((p) => {
            const style = p !== "All" ? priorityStyle(p) : null;
            return (
              <button
                type="button"
                key={p}
                onClick={() => setFilter(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  filter === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                style={filter === p && style ? { backgroundColor: style.bg, color: style.color } : undefined}
              >
                {p}
                {p !== "All" && (
                  <span className="ml-1 opacity-70">
                    ({aiInsights.filter((i) => i.priority === p).length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Sort:</span>
          {(["impact", "priority", "date"] as SortBy[]).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                sortBy === s
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((insight) => {
          const isDone = doneInsights.has(insight.id);
          const pStyle = priorityStyle(insight.priority);
          const iColor = impactColor(insight.impact);

          return (
            <div
              key={insight.id}
              className={`bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col gap-3 transition-all duration-300 hover:shadow-elevated ${
                isDone ? "opacity-55" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <h3
                    className={`text-sm font-semibold text-foreground leading-snug ${
                      isDone ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {insight.title}
                  </h3>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: pStyle.color, backgroundColor: pStyle.bg }}
                >
                  {insight.priority}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>

              {/* Impact + Date */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: iColor }}>
                  Impact: {insight.impact}/10
                </span>
                <span className="text-muted-foreground">{insight.date}</span>
              </div>

              {/* Action */}
              <div className="bg-accent rounded-lg px-3 py-2.5">
                <p className="text-xs font-medium text-accent-foreground">
                  <span className="text-muted-foreground">→ </span>
                  {insight.action}
                </p>
              </div>

              {/* Done button */}
              <Button
                type="button"
                variant={isDone ? "default" : "outline"}
                size="sm"
                className={`h-8 text-xs mt-auto transition-all duration-200 ${
                  isDone ? "bg-green-600 hover:bg-green-700 text-white border-0" : ""
                }`}
                onClick={() => toggleInsight(insight.id)}
              >
                {isDone ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1.5" />
                    Completed
                  </>
                ) : (
                  "Mark as Done"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-card">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No insights for this filter</p>
        </div>
      )}
    </div>
  );
}
