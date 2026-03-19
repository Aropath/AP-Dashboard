import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell as TableCellUi,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUpRight } from "lucide-react";
import {
  sessionsLast30Days,
  acquisitionData,
  landingPageData,
  revenueByProduct,
  retentionData,
} from "../mockData";

type SortKey = "sessions" | "conversions" | "convRate" | "revenue";
type SortDir = "asc" | "desc";

const PRODUCT_COLORS = ["#4f46e5", "#5b52e5", "#665de5", "#7168e5", "#7c73e5", "#8880e8"];

type Props = {
  acquisitionChannels: any[];
  landingPageData: any[];
  revenueByProduct: any[];
  retentionData: any[];
};

export default function AnalyticsPage({ acquisitionChannels, landingPageData }: Props) {
  const [dateFilter, setDateFilter] = useState<"today" | "7d" | "30d" | "90d">("30d");
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedAcquisition = [...acquisitionChannels].sort((a, b) => {
    const mult = sortDir === "asc" ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * mult;
  });

  const dataSlice =
    dateFilter === "7d"
      ? sessionsLast30Days.slice(-7)
      : sessionsLast30Days;

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Period:</span>
        {(["today", "7d", "30d", "90d"] as const).map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => setDateFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              dateFilter === v
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
          {v === "today" ? "Today" : v === "7d" ? "Last 7 days" : v === "30d" ? "Last 30 days" : "Last 90 days"}
          </button>
        ))}
      </div>

      {/* Sessions Multi-Series Chart */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Traffic Overview</h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={dataSlice} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 255)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }}
              tickLine={false}
              interval={dateFilter === "7d" ? 0 : 4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 255)" }}
              formatter={(v: number) => [v.toLocaleString(), ""]}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="sessions" stroke="#4f46e5" strokeWidth={2} dot={false} name="Sessions" />
            <Line type="monotone" dataKey="pageviews" stroke="#6ee7b7" strokeWidth={2} dot={false} name="Pageviews" />
            <Line type="monotone" dataKey="uniqueVisitors" stroke="#fbbf24" strokeWidth={2} dot={false} name="Unique Visitors" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Acquisition Table */}
      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Acquisition Channels</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-44 text-xs font-semibold">Source</TableHead>
                <TableHead className="text-xs font-semibold cursor-pointer" onClick={() => toggleSort("sessions")}>
                  <span className="flex items-center gap-1">Sessions <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold cursor-pointer" onClick={() => toggleSort("conversions")}>
                  <span className="flex items-center gap-1">Conversions <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold cursor-pointer" onClick={() => toggleSort("convRate")}>
                  <span className="flex items-center gap-1">Conv. Rate <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold cursor-pointer" onClick={() => toggleSort("revenue")}>
                  <span className="flex items-center gap-1">Revenue <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAcquisition.map((row) => (
                <TableRow key={row.source} className="hover:bg-muted/30 transition-colors">
                  <TableCellUi className="text-sm font-medium text-foreground">{row.source}</TableCellUi>
                  <TableCellUi className="text-sm font-mono text-foreground">{row.sessions.toLocaleString()}</TableCellUi>
                  <TableCellUi className="text-sm font-mono text-foreground">{row.conversions.toLocaleString()}</TableCellUi>
                  <TableCellUi>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: "#16a34a", backgroundColor: "#dcfce7" }}
                    >
                      {row.convRate}%
                    </span>
                  </TableCellUi>
                  <TableCellUi className="text-sm font-mono font-semibold text-foreground">
                    ${row.revenue.toLocaleString()}
                  </TableCellUi>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Landing Page Performance */}
      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Landing Page Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Page</TableHead>
                <TableHead className="text-xs font-semibold">Views</TableHead>
                <TableHead className="text-xs font-semibold">Avg. Time</TableHead>
                <TableHead className="text-xs font-semibold">Bounce Rate</TableHead>
                <TableHead className="text-xs font-semibold">Conversions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {landingPageData.map((row) => (
                <TableRow key={row.page} className="hover:bg-muted/30 transition-colors">
                  <TableCellUi className="text-sm font-mono text-primary">{row.page}</TableCellUi>
                  <TableCellUi className="text-sm font-mono text-foreground">{row.views.toLocaleString()}</TableCellUi>
                  <TableCellUi className="text-sm font-mono text-foreground">{row.avgTime}</TableCellUi>
                  <TableCellUi>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: row.bounceRate > 55 ? "#dc2626" : row.bounceRate > 40 ? "#d97706" : "#16a34a",
                        backgroundColor:
                          row.bounceRate > 55 ? "#fee2e2" : row.bounceRate > 40 ? "#fef3c7" : "#dcfce7",
                      }}
                    >
                      {row.bounceRate}%
                    </span>
                  </TableCellUi>
                  <TableCellUi>
                    <span className="flex items-center gap-1 text-sm font-mono text-foreground">
                      {row.conversions.toLocaleString()}
                      <ArrowUpRight className="w-3 h-3 text-green-600" />
                    </span>
                  </TableCellUi>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Revenue by Product */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Product</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={revenueByProduct} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 255)" vertical={false} />
            <XAxis dataKey="product" tick={{ fontSize: 11, fill: "oklch(0.52 0.018 255)" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 255)" }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
            />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} name="Revenue">
              {revenueByProduct.map((item) => (
                <Cell key={item.product} fill={PRODUCT_COLORS[revenueByProduct.indexOf(item)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Retention */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Customer Retention by Cohort</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={retentionData} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 255)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.52 0.018 255)" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "oklch(0.52 0.018 255)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 255)" }}
              formatter={(v: number) => [`${v}%`, ""]}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="cohortA" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, fill: "#4f46e5" }} name="Cohort A (Dec)" />
            <Line type="monotone" dataKey="cohortB" stroke="#6ee7b7" strokeWidth={2} dot={{ r: 4, fill: "#6ee7b7" }} name="Cohort B (Jan)" />
            <Line type="monotone" dataKey="cohortC" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, fill: "#fbbf24" }} name="Cohort C (Feb)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
