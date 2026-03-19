// Mock data for the AI Business Growth Advisor Dashboard

// Helper to generate sparkline data
function generateSparkline(base: number, variance: number, count = 8): number[] {
  return Array.from({ length: count }, (_, i) => {
    const trend = i * (variance * 0.05);
    const noise = (Math.random() - 0.4) * variance;
    return Math.max(0, base + trend + noise);
  });
}

// Sessions last 30 days
export const sessionsLast30Days = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 1 + i);
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sessions: Math.floor(10000 + Math.sin(i * 0.4) * 2000 + i * 150 + Math.random() * 1500),
    pageviews: Math.floor(28000 + Math.sin(i * 0.4) * 5000 + i * 400 + Math.random() * 3000),
    uniqueVisitors: Math.floor(7000 + Math.sin(i * 0.4) * 1500 + i * 80 + Math.random() * 1000),
  };
});

// Mini sparklines for metrics
export const metricsSparklines = {
  users: generateSparkline(10000, 800),
  sessions: generateSparkline(30000, 2000),
  conversion: generateSparkline(3.5, 0.3),
  revenue: generateSparkline(20000, 3000),
  engagement: generateSparkline(65, 5),
  bounce: generateSparkline(38, 4),
};

// Revenue sparkline for health card
export const revenueSparkline = generateSparkline(220000, 25000, 12);

// Traffic sources
export const trafficSources = [
  { source: "Organic", sessions: 163577, percentage: 42 },
  { source: "Paid", sessions: 109038, percentage: 28 },
  { source: "Social", sessions: 70096, percentage: 18 },
  { source: "Direct", sessions: 46709, percentage: 12 },
];

// Device breakdown
export const deviceBreakdown = [
  { name: "Mobile", value: 54, fill: "#4f46e5" },
  { name: "Desktop", value: 36, fill: "#6ee7b7" },
  { name: "Tablet", value: 10, fill: "#fbbf24" },
];

// Top countries
export const topCountries = [
  { country: "United States", sessions: 148920, flag: "🇺🇸" },
  { country: "United Kingdom", sessions: 62340, flag: "🇬🇧" },
  { country: "Germany", sessions: 45120, flag: "🇩🇪" },
  { country: "Canada", sessions: 38670, flag: "🇨🇦" },
  { country: "Australia", sessions: 29450, flag: "🇦🇺" },
];

// Conversion funnel
export const conversionFunnel = [
  { step: "Visitors", count: 100000, dropoff: null },
  { step: "Product View", count: 68000, dropoff: -32 },
  { step: "Add to Cart", count: 34000, dropoff: -50 },
  { step: "Checkout", count: 18000, dropoff: -47 },
  { step: "Purchase", count: 9500, dropoff: -47 },
];

// AI Insights
export interface AIInsight {
  id: number;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  action: string;
  impact: number;
  date: string;
}

export const aiInsights: AIInsight[] = [
  {
    id: 1,
    title: "Increase mobile ad spend",
    description: "Mobile converts 2.3x better this week across all campaigns",
    priority: "High",
    action: "Shift 15% budget to mobile ads",
    impact: 9.2,
    date: "Feb 25, 2026",
  },
  {
    id: 2,
    title: "Re-engage dormant users",
    description: "8,200 users inactive 30+ days — strong win-back potential",
    priority: "Medium",
    action: "Launch win-back email sequence",
    impact: 7.8,
    date: "Feb 24, 2026",
  },
  {
    id: 3,
    title: "Optimize checkout flow",
    description: "47% cart abandonment detected in last 7 days",
    priority: "High",
    action: "Add progress indicator + trust badges",
    impact: 9.6,
    date: "Feb 24, 2026",
  },
  {
    id: 4,
    title: "Expand to European market",
    description: "UK traffic up 34% MoM — untapped demand signal",
    priority: "Low",
    action: "Create UK-targeted landing page",
    impact: 6.1,
    date: "Feb 23, 2026",
  },
  {
    id: 5,
    title: "Fix slow landing pages",
    description: "3 pages have >4s LCP — impacting 12K weekly sessions",
    priority: "High",
    action: "Compress images and defer JS",
    impact: 8.7,
    date: "Feb 22, 2026",
  },
  {
    id: 6,
    title: "Upsell premium tier",
    description: "2,400 Pro users hitting plan limits daily",
    priority: "Medium",
    action: "Show upgrade nudge at limit threshold",
    impact: 8.1,
    date: "Feb 22, 2026",
  },
  {
    id: 7,
    title: "Partner with influencers",
    description: "Competitor saw 3x acquisition lift from micro-influencers",
    priority: "Low",
    action: "Identify 5 niche influencers for pilot",
    impact: 5.4,
    date: "Feb 21, 2026",
  },
  {
    id: 8,
    title: "A/B test pricing page",
    description: "Pricing page has 68% bounce rate — higher than benchmark",
    priority: "Medium",
    action: "Test annual billing toggle above fold",
    impact: 7.2,
    date: "Feb 20, 2026",
  },
];

// Analytics page data
export const acquisitionData = [
  { source: "Organic Search", sessions: 163577, conversions: 6339, convRate: 3.87, revenue: 95420 },
  { source: "Paid Search", sessions: 109038, conversions: 4580, convRate: 4.20, revenue: 67890 },
  { source: "Social Media", sessions: 70096, conversions: 1823, convRate: 2.60, revenue: 28450 },
  { source: "Direct", sessions: 46709, conversions: 2102, convRate: 4.50, revenue: 42100 },
  { source: "Email", sessions: 28340, conversions: 1985, convRate: 7.00, revenue: 39700 },
  { source: "Referral", sessions: 18210, conversions: 637, convRate: 3.50, revenue: 12740 },
];

export const landingPageData = [
  { page: "/home", views: 98420, avgTime: "2:34", bounceRate: 28, conversions: 4920 },
  { page: "/pricing", views: 64330, avgTime: "3:12", bounceRate: 68, conversions: 1930 },
  { page: "/features", views: 48210, avgTime: "4:05", bounceRate: 42, conversions: 2891 },
  { page: "/blog/growth-hacks", views: 32180, avgTime: "5:48", bounceRate: 35, conversions: 965 },
  { page: "/trial", views: 28670, avgTime: "1:52", bounceRate: 18, conversions: 5160 },
];

export const revenueByProduct = [
  { product: "Starter Plan", revenue: 48200 },
  { product: "Pro Plan", revenue: 127400 },
  { product: "Business Plan", revenue: 68900 },
  { product: "Enterprise", revenue: 42800 },
  { product: "Add-ons", revenue: 18400 },
  { product: "Consulting", revenue: 24100 },
];

export const retentionData = [
  { month: "Month 1", cohortA: 100, cohortB: 100, cohortC: 100 },
  { month: "Month 2", cohortA: 78, cohortB: 82, cohortC: 85 },
  { month: "Month 3", cohortA: 62, cohortB: 68, cohortC: 72 },
  { month: "Month 4", cohortA: 51, cohortB: 58, cohortC: 64 },
  { month: "Month 5", cohortA: 44, cohortB: 52, cohortC: 59 },
  { month: "Month 6", cohortA: 38, cohortB: 47, cohortC: 55 },
];

// Growth Plan
export interface GrowthTask {
  id: number;
  task: string;
  difficulty: "Easy" | "Medium" | "Hard";
  impact: string;
}

export const growthTasks: GrowthTask[] = [
  { id: 1, task: "Set up Google Analytics 4 goals", difficulty: "Easy", impact: "+$3K revenue" },
  { id: 2, task: "Implement cart abandonment emails", difficulty: "Medium", impact: "+$18K revenue" },
  { id: 3, task: "Optimize top 3 landing pages for SEO", difficulty: "Medium", impact: "+$12K revenue" },
  { id: 4, task: "Launch referral program", difficulty: "Hard", impact: "+$24K revenue" },
  { id: 5, task: "Create retargeting ad campaign", difficulty: "Medium", impact: "+$9K revenue" },
  { id: 6, task: "Add live chat support widget", difficulty: "Easy", impact: "+$6K revenue" },
  { id: 7, task: "Build customer onboarding flow", difficulty: "Hard", impact: "+$31K revenue" },
  { id: 8, task: "Publish 4 SEO blog articles", difficulty: "Medium", impact: "+$8K revenue" },
];

export const roiData = [
  { channel: "SEO", currentROI: 340, targetROI: 500 },
  { channel: "PPC", currentROI: 180, targetROI: 280 },
  { channel: "Social", currentROI: 120, targetROI: 200 },
  { channel: "Email", currentROI: 420, targetROI: 600 },
];

// Revenue forecast — 3 months past + 3 months projected
export const revenueForecast = [
  { month: "Dec '25", revenue: 218000, projected: null, type: "actual" },
  { month: "Jan '26", revenue: 241000, projected: null, type: "actual" },
  { month: "Feb '26", revenue: 263000, projected: null, type: "actual" },
  { month: "Mar '26", revenue: null, projected: 290000, type: "projected" },
  { month: "Apr '26", revenue: null, projected: 318000, type: "projected" },
  { month: "May '26", revenue: null, projected: 324000, type: "projected" },
];

// Reports
export const reportHistory = [
  { name: "Weekly Growth Report", period: "Feb 17–23, 2026", generated: "Feb 24, 2026", status: "Ready" },
  { name: "Monthly Analytics Report", period: "January 2026", generated: "Feb 1, 2026", status: "Ready" },
  { name: "Weekly Growth Report", period: "Feb 10–16, 2026", generated: "Feb 17, 2026", status: "Ready" },
  { name: "Q4 Business Review", period: "Oct–Dec 2025", generated: "Jan 5, 2026", status: "Ready" },
  { name: "Weekly Growth Report", period: "Feb 3–9, 2026", generated: "Feb 10, 2026", status: "Ready" },
  { name: "Monthly Analytics Report", period: "December 2025", generated: "Jan 2, 2026", status: "Ready" },
];
