export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const API_USER_AUTH = "http://localhost:5000/api"; // old backend port, in case we need to switch back for testing

function getToken(): string {
  return localStorage.getItem("access_token") || "";
}

async function authFetch(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (res.status === 403) {
    const data = await res.json();
    // Feature not on plan — return empty array/object gracefully
    if (data.code === "FEATURE_NOT_AVAILABLE") {
      console.warn(`Feature gate: ${data.error}`);
      return null; // caller handles null
    }
  }

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchLatestMetrics() {
  return authFetch(`${API_BASE}/metrics/latest`);
}

export async function fetchDashboardData(period: string) {
  return authFetch(`${API_BASE}/dashboard?period=${period}`);
}

export async function fetchTrafficAnalysis(period: string) {
  return authFetch(`${API_BASE}/dashboard/trafficAnalysis?period=${period}`);
}

export async function fetchTopCountries(period: string) {
  return authFetch(`${API_BASE}/dashboard/topCountries?period=${period}`);
}

export async function fetchAcquisitionChannels(period: string) {
  return authFetch(`${API_BASE}/dashboard/acquisitionChannels?period=${period}`);
}

export async function fetchPagePerformance(period: string) {
  return authFetch(`${API_BASE}/dashboard/pagePerformance?period=${period}`);
}

export async function fetchProductRevenue(period: string) {
  return authFetch(`${API_BASE}/dashboard/productRevenue?period=${period}`);
}

export async function fetchCohortRetention(period: string) {
  return authFetch(`${API_BASE}/dashboard/cohortRetention?period=${period}`);
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function fetchSubscription() {
  return authFetch(`${API_USER_AUTH}/subscription`);
}

export async function fetchPlans() {
  return authFetch(`${API_USER_AUTH}/subscription/plans`);
}

export async function changePlan(planName: string, billingCycle: "MONTHLY" | "YEARLY") {
  const res = await fetch(`${API_USER_AUTH}/subscription/change`, {
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
  const res = await fetch(`${API_USER_AUTH}/subscription/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function fetchClients() {
  return authFetch(`${API_USER_AUTH}/clients`);
}

export async function createClient(data: {
  name: string; domain: string; industry?: string; platform?: string;
}) {
  const res = await fetch(`${API_USER_AUTH}/clients`, {
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
  const res = await fetch(`${API_USER_AUTH}/clients/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}