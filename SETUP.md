# GrowthAdvisor — Full Stack Setup Guide

## Architecture Overview

```
project/
├── backend/                  ← Node.js + Express + PostgreSQL
│   ├── prisma/
│   │   └── schema.prisma     ← Full DB schema
│   └── src/
│       ├── server.ts         ← Entry point (port 5000)
│       ├── controllers/
│       │   ├── authController.ts         ← signup, signin, google, refresh, logout, me
│       │   ├── subscriptionController.ts ← plans, change, cancel, reactivate, history
│       │   ├── clientController.ts       ← CRUD for client registrations
│       │   └── analyticsController.ts    ← all dashboard API endpoints
│       ├── middleware/
│       │   ├── auth.ts          ← JWT requireAuth
│       │   └── subscription.ts  ← requireFeature() plan gating
│       ├── routes/
│       │   ├── authRoutes.ts
│       │   ├── subscriptionRoutes.ts
│       │   ├── clientRoutes.ts
│       │   └── analyticsRoutes.ts
│       ├── services/
│       │   ├── jwt.ts              ← sign/verify tokens
│       │   └── subscriptionCron.ts ← daily expiry job
│       └── db/
│           ├── prisma.ts  ← Prisma singleton
│           └── seed.ts    ← Seeds 4 plans into DB
│
└── frontend/src/
    ├── App.tsx                    ← REPLACE your existing App.tsx
    ├── main.tsx                   ← REPLACE your existing main.tsx
    ├── index.css                  ← REPLACE (adds Teal + Indigo themes)
    ├── .env                       ← ADD (VITE_API_URL)
    ├── context/
    │   ├── AuthContext.tsx        ← ADD (user state, token management)
    │   └── ThemeContext.tsx       ← ADD (teal/indigo + light/dark)
    ├── auth/
    │   ├── SignIn.tsx             ← REPLACE your existing SignIn.tsx
    │   └── Signup.tsx             ← REPLACE your existing Signup.tsx
    ├── services/
    │   └── fetchMetrics.ts        ← REPLACE (adds auth headers + subscription API)
    ├── pages/
    │   └── SubscriptionPage.tsx   ← ADD (new page)
    └── components/
        ├── FeatureGate.tsx        ← ADD (lock UI by plan)
        └── ThemeSwitcher.tsx      ← ADD (in navbar)
```

---

## Step 1 — PostgreSQL Setup

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL if not already installed
# macOS: brew install postgresql && brew services start postgresql
# Ubuntu: sudo apt install postgresql

psql -U postgres
CREATE DATABASE growthadvisor;
\q
```

### Option B: Railway (recommended for deployment)
1. Go to railway.app → New Project → PostgreSQL
2. Copy the `DATABASE_URL` from the Variables tab

---

## Step 2 — Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in:
#   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/growthadvisor
#   JWT_SECRET=any-long-random-string
#   GOOGLE_CLIENT_ID=from-google-cloud-console (optional)

# 3. Generate Prisma client
npm run db:generate

# 4. Run migrations (creates all tables)
npm run db:migrate
# When prompted, name it: "initial_schema"

# 5. Seed the 4 subscription plans
npm run db:seed

# 6. Start the development server
npm run dev
# Server runs at http://localhost:5000
```

### Verify backend is running
```bash
curl http://localhost:5000/health
# → {"status":"ok","timestamp":"..."}

curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
# → {"accessToken":"...","refreshToken":"...","user":{...}}
```

---

## Step 3 — Frontend Setup

```bash
cd frontend   # (your existing frontend folder)

# 1. Add .env file (create it in the frontend root)
echo "VITE_API_URL=http://localhost:5000/api" > .env

# 2. Copy/replace the following files from the delivered output:
#    - src/index.css              (theme variables)
#    - src/App.tsx                (wired to auth + new pages)
#    - src/main.tsx               (wrapped with providers)
#    - src/auth/SignIn.tsx        (real backend calls)
#    - src/auth/Signup.tsx        (real backend calls)
#    - src/services/fetchMetrics.ts (auth headers)
#
# 3. ADD these new files (create folders if needed):
#    - src/context/AuthContext.tsx
#    - src/context/ThemeContext.tsx
#    - src/pages/SubscriptionPage.tsx
#    - src/components/FeatureGate.tsx
#    - src/components/ThemeSwitcher.tsx

# 4. Start frontend
npm run start  # (or pnpm start / vite --port 3000)
```

---

## Step 4 — File Placement Guide

Your zip lost folder structure. Here is where each of your original files belongs:

```
frontend/
├── src/
│   ├── App.tsx                         ← root
│   ├── main.tsx                        ← root
│   ├── index.css                       ← root
│   ├── mockData.ts                     ← root
│   ├── backend.ts / backend.d.ts       ← root (ICP/Dfinity, keep as-is)
│   ├── auth/
│   │   ├── SignIn.tsx                  ← was "SignIn.tsx"
│   │   └── Signup.tsx                  ← was "Signup.tsx"
│   ├── components/
│   │   └── ui/
│   │       ├── accordion.tsx           ← all shadcn components go here
│   │       ├── alert.tsx
│   │       ├── avatar.tsx
│   │       ├── button.tsx
│   │       ├── ... (all other ui/*.tsx)
│   │       └── googleLoginButton.tsx
│   ├── context/
│   │   ├── AuthContext.tsx             ← NEW
│   │   └── ThemeContext.tsx            ← NEW
│   ├── pages/
│   │   ├── OverviewPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── InsightsPage.tsx
│   │   ├── GrowthPlanPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── SubscriptionPage.tsx        ← NEW
│   └── services/
│       ├── fetchMetrics.ts             ← REPLACE
│       ├── countryFlags.ts
│       └── api.ts                      ← REPLACE with .env variable
│
├── .env                                ← NEW
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## How the System Works

### Authentication Flow
```
User signs up → POST /api/auth/signup
             → bcrypt hashes password
             → Creates User in DB
             → Auto-assigns FREE plan subscription
             → Returns accessToken (7d) + refreshToken (30d)
             → Frontend stores in localStorage
             → AuthContext sets user state

User signs in → POST /api/auth/signin
             → Validates credentials
             → Returns tokens + user with subscription

Token expires → AuthContext catches 401
             → Auto-calls POST /api/auth/refresh
             → Issues new access + refresh tokens (rotation)
```

### Subscription Plans

| Plan       | Price      | Clients | Data Retention | Key Features                          |
|------------|-----------|---------|---------------|---------------------------------------|
| Free       | $0/mo      | 1       | 7 days        | Overview, Basic Analytics             |
| Growth     | $29/mo     | 5       | 30 days       | + AI Insights, CSV Export             |
| Pro        | $79/mo     | 20      | 90 days       | + Growth Plan, Reports, Cohort, Funnel|
| Enterprise | $199/mo    | ∞       | 365 days      | + White Label, SSO, API Access        |

### Feature Gating
Two layers of enforcement:

**Backend** — `requireFeature("feature_key")` middleware on routes:
```
GET /api/dashboard/cohortRetention → requireFeature("cohort_analysis")
GET /api/dashboard/acquisitionChannels → requireFeature("advanced_analytics")
```

**Frontend** — `<FeatureGate feature="reports_page">` component:
```tsx
<FeatureGate feature="growth_plan">
  <GrowthPlanPage />
</FeatureGate>
```
→ Shows a blurred, locked overlay with an "Upgrade Plan" CTA if not on plan.

### Subscription Expiry
A cron job runs every day at midnight:
- Finds all subscriptions where `currentPeriodEnd < now`
- If `cancelAtPeriodEnd = true` → downgrades to Free
- Otherwise → marks as `EXPIRED` (pending renewal)

### Theme Switching
- **Teal** (new primary): Cyan/teal palette `oklch(0.52 0.155 195)`
- **Indigo** (original): Indigo palette `oklch(0.511 0.22 264)`
- Both support **light** and **dark** mode
- Preference saved to `localStorage`, applied via `data-theme` on `<html>`
- ThemeSwitcher component appears in the top navbar

---

## API Reference

### Auth
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| POST | `/api/auth/signup` | `{name, email, password}` | — |
| POST | `/api/auth/signin` | `{email, password}` | — |
| POST | `/api/auth/google` | `{idToken}` | — |
| POST | `/api/auth/refresh` | `{refreshToken}` | — |
| POST | `/api/auth/logout` | `{refreshToken}` | — |
| GET | `/api/auth/me` | — | Bearer |

### Subscription
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| GET | `/api/subscription` | — | Bearer |
| GET | `/api/subscription/plans` | — | Bearer |
| GET | `/api/subscription/history` | — | Bearer |
| POST | `/api/subscription/change` | `{planName, billingCycle}` | Bearer |
| POST | `/api/subscription/cancel` | — | Bearer |
| POST | `/api/subscription/reactivate` | — | Bearer |

### Clients
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| GET | `/api/clients` | — | Bearer |
| POST | `/api/clients` | `{name, domain, industry?, platform?}` | Bearer |
| PUT | `/api/clients/:id` | `{...fields}` | Bearer |
| DELETE | `/api/clients/:id` | — | Bearer |

### Analytics
| Method | Endpoint | Query | Auth |
|--------|----------|-------|------|
| GET | `/api/dashboard` | `?period=today\|7d\|30d\|90d` | Bearer |
| GET | `/api/dashboard/trafficAnalysis` | `?period=` | Bearer |
| GET | `/api/dashboard/topCountries` | `?period=` | Bearer |
| GET | `/api/dashboard/acquisitionChannels` | `?period=` | Bearer (Growth+) |
| GET | `/api/dashboard/pagePerformance` | `?period=` | Bearer (Growth+) |
| GET | `/api/dashboard/productRevenue` | `?period=` | Bearer (Pro+) |
| GET | `/api/dashboard/cohortRetention` | `?period=` | Bearer (Pro+) |
| POST | `/api/ingest` | `{trackingId, eventType, ...}` | — |

---

## Deploying to Railway

```bash
# 1. Push your backend to GitHub

# 2. Go to railway.app → New Project → Deploy from GitHub
# 3. Add PostgreSQL service (same project)
# 4. Set environment variables in Railway dashboard:
#    DATABASE_URL   → (auto-filled by Railway PostgreSQL)
#    JWT_SECRET     → (generate a strong random string)
#    GOOGLE_CLIENT_ID → (from Google Cloud Console)
#    FRONTEND_URL   → https://your-frontend.vercel.app
#    NODE_ENV       → production

# 5. Deploy frontend to Vercel:
#    vercel deploy
#    Set VITE_API_URL=https://your-backend.railway.app/api
```

---

## Google OAuth Setup (optional)

1. Go to console.cloud.google.com
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web Application
4. Add `http://localhost:3000` to Authorized JavaScript origins
5. Copy Client ID → paste into backend `.env` as `GOOGLE_CLIENT_ID`
6. In `googleLoginButton.tsx`, pass the returned `credential` (idToken) to `googleAuth(idToken)` from `useAuth()`

---

## Adding FeatureGate to Existing Pages

Wrap any section you want to lock behind a plan:

```tsx
import FeatureGate from "../components/FeatureGate";

// In InsightsPage.tsx:
<FeatureGate feature="insights_page">
  <div>... your existing content ...</div>
</FeatureGate>

// In GrowthPlanPage.tsx:
<FeatureGate feature="growth_plan">
  <div>... your existing content ...</div>
</FeatureGate>
```

Feature keys (use exactly as listed):
- `overview_page`, `basic_analytics`, `advanced_analytics`
- `insights_page`, `growth_plan`, `reports_page`
- `csv_export`, `pdf_export`, `api_access`
- `cohort_analysis`, `funnel_analysis`
- `white_label`, `priority_support`, `sso`
