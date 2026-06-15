export const ANALYTICS_ENABLED =
  import.meta.env.VITE_ANALYTICS_ENABLED === "true";

export const API_BASE =
  import.meta.env.VITE_ANALYTICS_API_URL || "";

export const AUTH_API =
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000/api";

function getToken(): string {
  return localStorage.getItem("access_token") || "";
}

// Active projectId — set this when user selects a project
let activeProjectId: string =
  localStorage.getItem("active_project_id") || "";

export function setActiveProject(projectId: string) {
  activeProjectId = projectId;
  localStorage.setItem("active_project_id", projectId);
}

export function getActiveProject(): string {
  return activeProjectId;
}

async function authFetch(url: string) {
  if (!ANALYTICS_ENABLED) {
    console.warn("Analytics temporarily disabled");
    return null;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (res.status === 403) {
    const data = await res.json();

    if (data.code === "FEATURE_NOT_AVAILABLE") {
      console.warn(`Feature gate: ${data.error}`);
      return null;
    }

    console.warn(`Analytics unavailable: ${data.error}`);
    return null;
  }

  if (!res.ok) {
    console.warn(`Analytics request failed: ${res.status}`);
    return null;
  }

  return res.json();
}

function withProject(url: string): string {
  if (!activeProjectId) return url;

  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}projectId=${activeProjectId}`;
}

// ─── Analytics (temporarily disabled-safe) ────────────────────────────────

export async function fetchLatestMetrics() {
  return authFetch(withProject(`${API_BASE}/metrics/latest`));
}

export async function fetchDashboardData(period: string) {
  return authFetch(
    withProject(`${API_BASE}/dashboard?period=${period}`)
  );
}

export async function fetchTrafficAnalysis(period: string) {
  return authFetch(
    withProject(`${API_BASE}/dashboard/trafficAnalysis?period=${period}`)
  );
}

export async function fetchTopCountries(period: string) {
  return authFetch(
    withProject(`${API_BASE}/dashboard/topCountries?period=${period}`)
  );
}

export async function fetchAcquisitionChannels(period: string) {
  return authFetch(
    withProject(
      `${API_BASE}/dashboard/acquisitionChannels?period=${period}`
    )
  );
}

export async function fetchPagePerformance(period: string) {
  return authFetch(
    withProject(
      `${API_BASE}/dashboard/pagePerformance?period=${period}`
    )
  );
}

export async function fetchProductRevenue(period: string) {
  return authFetch(
    withProject(
      `${API_BASE}/dashboard/productRevenue?period=${period}`
    )
  );
}

export async function fetchCohortRetention(period: string) {
  return authFetch(
    withProject(
      `${API_BASE}/dashboard/cohortRetention?period=${period}`
    )
  );
}

// ─── Subscription ─────────────────────────────────────────────────────────

export async function fetchSubscription() {
  return null;
}

export async function fetchPlans() {
  return null;
}

export async function changePlan(
  planName: string,
  billingCycle: "MONTHLY" | "YEARLY"
) {
  console.warn("Subscriptions temporarily disabled");
  return null;
}

export async function cancelSubscription() {
  console.warn("Subscriptions temporarily disabled");
  return null;
}

// ─── Clients ───────────────────────────────────────────────────────────────

export async function fetchClients() {
  const res = await fetch(`${AUTH_API}/clients`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Clients API error ${res.status}`);
  }

  return res.json();
}

export async function createClient(data: {
  name: string;
  domain: string;
  industry?: string;
  platform?: string;
}) {
  const res = await fetch(`${AUTH_API}/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error);
  }

  return json;
}

export async function deleteClient(id: string) {
  const res = await fetch(`${AUTH_API}/clients/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error((await res.json()).error);
  }

  return res.json();
}