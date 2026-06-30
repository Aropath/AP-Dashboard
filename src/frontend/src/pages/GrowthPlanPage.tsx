import { useEffect, useState } from "react";
import { fetchGrowthChecklist } from "../services/fetchMetrics";
import { useState } from "react";
import { formatCurrencyCompact } from "../services/currencies";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { roiData, revenueForecast } from "../mockData";

type Difficulty = "Easy" | "Medium" | "Hard";


const difficultyStyle: Record<Difficulty, { color: string; bg: string }> = {
  Easy: { color: "#16a34a", bg: "#dcfce7" },
  Medium: { color: "#d97706", bg: "#fef3c7" },
  Hard: { color: "#dc2626", bg: "#fee2e2" },
};

export default function GrowthPlanPage() {
  const [growthTasks, setGrowthTasks] = useState<any[]>([]);
const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

useEffect(() => {
    async function loadChecklist() {
      const data = await fetchGrowthChecklist();
      
      setGrowthTasks(data.items);

      setCompletedTasks(
        new Set(
          data.items
            .filter((item: any) => item.completed)
            .map((item: any) => item.id)
        )
      );
    }

    loadChecklist();
  }, []);

  function toggleTask(id: string) {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const completedCount = completedTasks.size;
  const totalTasks = growthTasks.length;
  const progressPct = Math.round((completedCount / totalTasks) * 100);

  // Forecast chart with both actual and projected
  const forecastChartData = revenueForecast.map((d) => ({
    month: d.month,
    revenue: d.revenue,
    projected: d.projected,
  }));

  return (
    <div className="space-y-6">
      {/* Growth headline badge */}
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
        style={{ backgroundColor: "#eef2ff", color: "#4f46e5" }}
      >
        <TrendingUp className="w-4 h-4" />
        Expected Growth: +23.4% in 90 days
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: 30-Day Checklist (~60%) */}
        <div id="growth-action-checklist" className="lg:col-span-3 bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">30-Day Action Checklist</h3>
              <span className="text-xs font-medium text-muted-foreground">
                {completedCount} of {totalTasks} completed
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
          <div className="divide-y divide-border">
            {growthTasks.map((task) => {
              const isDone = completedTasks.has(task.id);
              const diffStyle = difficultyStyle[task.difficulty];
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors ${
                    isDone ? "opacity-60" : ""
                  }`}
                >
                  <button type="button" className="shrink-0" onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} aria-label="Toggle task">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isDone ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{ color: diffStyle.color, backgroundColor: diffStyle.bg }}
                    >
                      {task.difficulty}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{ color: "#4f46e5", backgroundColor: "#eef2ff" }}
                    >
                      {task.estimatedRevenueLift}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: ROI Analysis */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-card border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">ROI Analysis by Channel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roiData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 255)" vertical={false} />
              <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "oklch(0.52 0.018 255)" }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 255)" }}
                formatter={(v: number) => [`${v}%`, ""]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="currentROI" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Current ROI" />
              <Bar dataKey="targetROI" fill="#e0e7ff" radius={[4, 4, 0, 0]} name="Target ROI" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {roiData.map((item) => (
              <div key={item.channel} className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{item.channel}</p>
                <p className="text-base font-bold font-mono" style={{ color: "#4f46e5" }}>
                  {item.currentROI}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Forecast */}
      <div id="growth-revenue-forecast" className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Revenue Forecast</h3>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: "#eef2ff", color: "#4f46e5" }}
          >
            +23.4% projected growth in 90 days
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={forecastChartData} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a5b4fc" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 255)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.52 0.018 255)" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrencyCompact(v, currency)}
              domain={[180000, 360000]}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 255)" }}
              formatter={(v) => {
                const num = typeof v === "number" ? v : null;
                return num ? [formatCurrencyCompact(num, currency), ""] : ["—", ""];
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x="Feb '26" stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: "Today", position: "top", fontSize: 10, fill: "#94a3b8" }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fill="url(#actualGrad)"
              name="Actual Revenue"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#a5b4fc"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#projectedGrad)"
              name="Projected Revenue"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
