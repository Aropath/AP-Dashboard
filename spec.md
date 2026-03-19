# AI Business Growth Advisor Dashboard

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full SaaS analytics dashboard UI with 6 pages: Overview, Analytics, Insights, Growth Plan, Reports, Settings
- Left sidebar navigation with icons and labels
- Top navbar with profile avatar and date range filter
- All data is mock/static (no backend needed)

### Modify
N/A

### Remove
N/A

## Implementation Plan

### Layout Shell
- App shell: fixed left sidebar (240px) + main area
- Sidebar: logo, nav links (Overview, Analytics, Insights, Growth Plan, Reports, Settings) with active state
- Top navbar: page title, date range filter dropdown, user profile avatar + name
- Responsive: sidebar collapses to icon-only on small screens

### Overview Page
1. Business Health card: Growth Score gauge (0-100), monthly % change badge, revenue mini sparkline, Risk badge (Low/Medium/High)
2. Key Metrics grid (6 cards): Total Users, Sessions, Conversion Rate, Revenue, Engagement Rate, Bounce Rate — each with value, % change arrow, mini sparkline (Recharts)
3. Traffic Analysis section:
   - Line chart: Sessions over time (last 30 days)
   - Bar chart: Traffic source (Organic, Paid, Social, Direct)
   - Pie chart: Device breakdown (Mobile, Desktop, Tablet)
   - Bar chart: Top 5 Countries
4. Conversion Funnel: horizontal funnel visualization with drop-off % labels
5. AI Insights cards: title, short description, priority badge, suggested action, "Mark as Done" button

### Analytics Page
- Date filter at top
- Detailed Sessions line chart (multi-series)
- Acquisition table: Source, Sessions, Conversions, Revenue (sortable)
- Landing page performance table
- Revenue by product bar chart
- Customer retention line chart

### Insights Page
- AI insight cards in list/grid layout
- Filter bar: All / High / Medium / Low priority
- Sort by: Impact / Date / Priority
- Each card: title, description, priority badge, impact score, suggested action, mark-done toggle

### Growth Plan Page
- 30-Day Action Checklist: task cards with name, difficulty chip, estimated impact %, status toggle checkbox
- ROI Analysis: grouped bar chart comparing channels, ROI % badges
- Revenue Forecast: 3-month projection line chart with confidence band shading, expected growth %

### Reports Page
- Two action cards: Generate Weekly Report, Generate Monthly Report
- Download PDF button per report
- Report history list (mock)

### Settings Page
- Integration card: Connect Google Analytics (button + status)
- Upload CSV card: drag-and-drop zone
- Preferences: Currency selector, Timezone selector
- Save button

## UX Notes
- Color palette: white background (#FFFFFF), primary blue (#4F6EF7), soft grays for borders/text
- Card style: rounded-2xl, shadow-sm, white bg, p-6
- Typography: clean sans-serif, data values in large bold text
- Charts via Recharts library
- All data is mock/static — no backend required
- Smooth page transitions via React state routing (no react-router needed)
- Responsive: sidebar icon-only at md breakpoint, hidden at sm
