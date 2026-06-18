import { useState } from "react";
import { useEffect } from "react";
import { fetchLatestMetrics } from "../services/fetchMetrics";
import { fetchDashboardData } from "../services/fetchMetrics";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sessionsLast30Days,
  metricsSparklines,
  revenueSparkline,
  // trafficSources,
  deviceBreakdown,
  topCountries,
  conversionFunnel,
  aiInsights,
} from "../mockData";

// Sparkline mini chart
function Sparkline({ data, color = "#4f46e5", positive = true }: { data: number[]; color?: string; positive?: boolean }) {
  const chartColor = positive ? color : "#dc2626";
  const normalized = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={normalized} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={chartColor}
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Metric card
interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  sparkData: number[];
  invertChange?: boolean;
}

function MetricCard({ label, value, change, sparkData, invertChange = false }: MetricCardProps) {
  const isPositive = invertChange ? change < 0 : change > 0;
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border hover:shadow-elevated transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span
          className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${isPositive
            ? "text-success-DEFAULT bg-success-light"
            : "text-danger-DEFAULT bg-danger-light"
            }`}
          style={{
            color: isPositive ? "#16a34a" : "#dc2626",
            backgroundColor: isPositive ? "#dcfce7" : "#fee2e2",
          }}
        >
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground font-mono tracking-tight mb-2">{value}</p>
      <div className="mt-1 -mx-1">
        <Sparkline data={sparkData} positive={isPositive} />
      </div>
    </div>
  );
}

const COLORS = ["#4f46e5", "#6ee7b7", "#fbbf24"];

type topCountry = {
  country: string;
  users: number;
  flag: string;
};

type DeviceBreakdown = {
  name: string;
  value: number;
  sessions: number;
  fill?: string;
};

type ConversionStep = {
  step: string;
  count: number;
  dropoff: number | null;
};

type OverviewPageProps = {
  period: string;
  sessionsTrafficAnalysis: {
    date: string;
    sessions: number;
    users: number;
    uniqueVisitors: number;
  }[];
  topCountries: topCountry[];
  deviceBreakdown: DeviceBreakdown[];
  conversionFunnel: ConversionStep[];
};


export default function OverviewPage({ period, sessionsTrafficAnalysis, topCountries, deviceBreakdown, conversionFunnel }: OverviewPageProps) {
  const [doneInsights, setDoneInsights] = useState<Set<number>>(new Set());

  function toggleInsight(id: number) {
    setDoneInsights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Max country sessions for bar width calculation
  const maxCountrySessions = Math.max(...topCountries.map((c) => c.users), 1);

  const [metrics, setMetrics] = useState<any>(null);

  const totalSessions = metrics?.sessions || 1;

  const trafficSources = metrics
    ? [
      {
        source: "Organic",
        sessions: metrics.organic_sessions,
        percentage: Math.round((metrics.organic_sessions / totalSessions) * 100),
      },
      {
        source: "Monetary",
        sessions: metrics.paid_sessions,
        percentage: Math.round((metrics.paid_sessions / totalSessions) * 100),
      },
      {
        source: "Social",
        sessions: metrics.social_sessions,
        percentage: Math.round((metrics.social_sessions / totalSessions) * 100),
      },
      {
        source: "Direct",
        sessions: metrics.direct_sessions,
        percentage: Math.round((metrics.direct_sessions / totalSessions) * 100),
      },
    ]
    : [];

  useEffect(() => {
    fetchDashboardData(period)
      .then((data) => setMetrics(data))
      .catch(console.error);
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Business Health Card */}
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Growth Score */}
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-2xl font-bold text-primary font-mono">74</span>
                  <span className="text-xs text-muted-foreground block">/100</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Growth Score</p>
              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary rounded-full" style={{ width: "74%" }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-green-600">+8.3% vs last month</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: "#16a34a", backgroundColor: "#dcfce7" }}
                >
                  Low Risk
                </span>
              </div>
            </div>
          </div>

          {/* Revenue sparkline */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Revenue Trend</p>
            <div className="h-14">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueSparkline.map((v, i) => ({ v, i }))} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <Line type="monotone" dataKey="v" stroke="#4f46e5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
              <p className="text-lg font-bold text-foreground font-mono">
                {metrics?.revenue !== undefined
                  ? `$${(metrics.revenue / 1000).toFixed(0)}K`
                  : "..."}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Users</p>
              <p className="text-lg font-bold text-foreground font-mono">
                {metrics?.users !== undefined
                  ? `${(metrics.users / 1000).toFixed(0)}K`
                  : "..."}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Conv. Rate</p>
              <p className="text-lg font-bold text-foreground font-mono">
                {metrics?.conversion_rate !== undefined
                  ? `${Number(metrics.conversion_rate).toFixed(2)}%`
                  : "..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Users"
          value={metrics ? metrics.users.toLocaleString() : "..."}
          change={metrics?.users_change}
          sparkData={metricsSparklines.users}
        />

        <MetricCard
          label="Sessions"
          value={metrics ? metrics.sessions.toLocaleString() : "..."}
          change={metrics?.sessions_change}
          sparkData={metricsSparklines.sessions}
        />

        <MetricCard
          label="Conversion Rate"
          value={
            metrics?.conversion_rate !== undefined
              ? `${Number(metrics.conversion_rate).toFixed(2)}%`
              : "..."
          }
          change={metrics?.conversion_change}
          sparkData={metricsSparklines.conversion}
        />

        <MetricCard
          label="Revenue"
          value={metrics ? `$${metrics.revenue.toLocaleString()}` : "..."}
          change={metrics?.revenue_change}
          sparkData={metricsSparklines.revenue}
        />

        <MetricCard
          label="Engagement Rate"
          value={metrics ? `${metrics.engagement_rate}%` : "..."}
          change={metrics?.engagement_change}
          sparkData={metricsSparklines.engagement}
        />

        <MetricCard
          label="Bounce Rate"
          value={metrics ? `${metrics.bounce_rate}%` : "..."}
          change={metrics?.bounce_change}
          sparkData={metricsSparklines.bounce}
          invertChange
        />
      </div>

      {/* Traffic Analysis */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Traffic Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sessions Over Time */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Sessions Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sessionsTrafficAnalysis} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 255)" />
                <XAxis
                  dataKey="date"
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }}
                  tickLine={false}
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 255)" }}
                />
                <Line type="monotone" dataKey="sessions" stroke="#4f46e5" strokeWidth={2} dot={false} name="Sessions" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Traffic Sources */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Traffic Sources</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trafficSources} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 255)" vertical={false} />
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: "oklch(0.52 0.018 255)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 255)" }}
                />
                <Bar dataKey="sessions" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Device Breakdown */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Device Breakdown</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {deviceBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {deviceBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-sm text-muted-foreground flex-1">
                      {item.name} ({item.sessions.toLocaleString()})
                    </span>
                    <span className="text-sm font-semibold text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Countries */}
          <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top Countries</h3>
            <div className="space-y-3">
              {topCountries.map((country) => (
                <div key={country.country} className="flex items-center gap-3">
                  <span className="text-base leading-none">{country.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{country.country}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {country.users.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(country.users / maxCountrySessions) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">Conversion Funnel</h2>
        <div className="space-y-2">
          {conversionFunnel.map((step, index) => {
            const maxCount = conversionFunnel[0].count;
            const widthPct = (step.count / maxCount) * 100;
            console.log(`Step: ${step.step}, Count: ${step.count}, Dropoff: ${step.dropoff}%, Width%: ${widthPct}%`);
            return (
              <div key={step.step} className="flex items-center gap-3">
                <div className="w-28 text-right shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">{step.step}</span>
                </div>
                <div className="flex-1 relative">
                  <div
                    className="h-9 rounded-lg flex items-center justify-between px-3 transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      minWidth: "20%",
                      backgroundColor: index === 0 ? "#4f46e5" : `oklch(${0.511 + index * 0.07} ${0.22 - index * 0.03} 264)`,
                    }}
                  >
                    <span className="text-xs font-bold text-white font-mono">
                      {step.count.toLocaleString()}
                    </span>
                    {widthPct !== null && (
                      <span className="text-xs text-white/75">{widthPct.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
                {step.dropoff !== null && (
                  <div className="w-21 shrink-0">
                    <span className="text-xs text-muted-foreground mr-2">Dropoff</span>
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                    >
                      {step.dropoff}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          AI Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {aiInsights.slice(0, 4).map((insight) => {
            const isDone = doneInsights.has(insight.id);
            const priorityStyle =
              insight.priority === "High"
                ? { color: "#dc2626", bg: "#fee2e2" }
                : insight.priority === "Medium"
                  ? { color: "#d97706", bg: "#fef3c7" }
                  : { color: "#16a34a", bg: "#dcfce7" };

            return (
              <div
                key={insight.id}
                className={`bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col gap-3 transition-all duration-200 ${isDone ? "opacity-60" : ""
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-semibold text-foreground ${isDone ? "line-through" : ""}`}>
                    {insight.title}
                  </h3>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: priorityStyle.color, backgroundColor: priorityStyle.bg }}
                  >
                    {insight.priority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-xs font-medium text-accent-foreground">
                    <span className="text-muted-foreground">Action: </span>
                    {insight.action}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={isDone ? "default" : "outline"}
                  size="sm"
                  className={`mt-auto h-8 text-xs transition-all duration-200 ${isDone ? "bg-green-600 hover:bg-green-700 text-white border-0" : ""
                    }`}
                  onClick={() => toggleInsight(insight.id)}
                >
                  {isDone ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Done
                    </>
                  ) : (
                    "Mark as Done"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-4 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          © 2026.
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Aropath Dashboard
          </a>
        </p>
      </footer>
    </div>
  );
}
