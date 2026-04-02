export const API_BASE = import.meta.env.VITE_ANALYTICS_API_URL || "http://localhost:5001/api";
export const AUTH_API = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000/api";

function getToken(): string {
  return localStorage.getItem("access_token") || "";
}

// Active clientId — set this when user selects a client
let activeClientId: string = localStorage.getItem("active_client_id") || "";

export function setActiveClient(clientId: string) {
  activeClientId = clientId;
  localStorage.setItem("active_client_id", clientId);
}

export function getActiveClient(): string {
  return activeClientId;
}

async function authFetch(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (res.status === 403) {
    const data = await res.json();
    if (data.code === "FEATURE_NOT_AVAILABLE") {
      console.warn(`Feature gate: ${data.error}`);
      return null;
    }
    if (data.code === "GA4_NOT_CONNECTED") {
      console.warn(`GA4 not connected: ${data.error}`);
      return null;
    }
  }

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function withClient(url: string): string {
  if (!activeClientId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}clientId=${activeClientId}`;
}

// ─── Analytics (port 5001) ────────────────────────────────────────────────────

export async function fetchLatestMetrics() {
  return authFetch(withClient(`${API_BASE}/metrics/latest`));
}

export async function fetchDashboardData(period: string) {
  return authFetch(withClient(`${API_BASE}/dashboard?period=${period}`));
}

export async function fetchTrafficAnalysis(period: string) {
  return authFetch(withClient(`${API_BASE}/dashboard/trafficAnalysis?period=${period}`));
}

export async function fetchTopCountries(period: string) {
  return authFetch(withClient(`${API_BASE}/dashboard/topCountries?period=${period}`));
}

export async function fetchAcquisitionChannels(period: string) {
  return authFetch(withClient(`${API_BASE}/dashboard/acquisitionChannels?period=${period}`));
}

export async function fetchPagePerformance(period: string) {
  return authFetch(withClient(`${API_BASE}/dashboard/pagePerformance?period=${period}`));
}

export async function fetchProductRevenue(period: string) {
  return authFetch(withClient(`${API_BASE}/dashboard/productRevenue?period=${period}`));
}

export async function fetchCohortRetention(period: string) {
  return authFetch(withClient(`${API_BASE}/dashboard/cohortRetention?period=${period}`));
}

// ─── Subscription (port 5000) ─────────────────────────────────────────────────

export async function fetchSubscription() {
  return authFetch(`${AUTH_API}/subscription`);
}

export async function fetchPlans() {
  return authFetch(`${AUTH_API}/subscription/plans`);
}

export async function changePlan(planName: string, billingCycle: "MONTHLY" | "YEARLY") {
  const res = await fetch(`${AUTH_API}/subscription/change`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ planName, billingCycle }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function cancelSubscription() {
  const res = await fetch(`${AUTH_API}/subscription/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

// ─── Clients (port 5000) ──────────────────────────────────────────────────────

export async function fetchClients() {
  return authFetch(`${AUTH_API}/clients`);
}

export async function createClient(data: {
  name: string; domain: string; industry?: string; platform?: string;
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
  if (!res.ok) throw new Error(json.error);
  return json;
}

export async function deleteClient(id: string) {
  const res = await fetch(`${AUTH_API}/clients/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
