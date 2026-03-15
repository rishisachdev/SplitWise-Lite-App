const BASE = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}


let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  
  if (res.status === 401) {
    localStorage.removeItem("token");
    if (_onUnauthorized) _onUnauthorized();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  
  login: (email, password) => request("POST", "/auth/login", { email, password }),
  register: (name, email, password) => request("POST", "/auth/register", { name, email, password }),
  logout: () => request("POST", "/auth/logout"),

  
  getExpenses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request("GET", `/expenses${qs ? "?" + qs : ""}`);
  },
  createExpense: (data) => request("POST", "/expenses", data),
  updateExpense: (id, data) => request("PUT", `/expenses/${id}`, data),
  deleteExpense: (id) => request("DELETE", `/expenses/${id}`),
  getExpenseSummary: () => request("GET", "/expenses/summary"),

  
  listGroups: () => request("GET", "/groups"),
  createGroup: (data) => request("POST", "/groups", data),
  getGroup: (id) => request("GET", `/groups/${id}`),
  addGroupExpense: (groupId, data) => request("POST", `/groups/${groupId}/expenses`, data),
  settleUp: (groupId, data) => request("POST", `/groups/${groupId}/settle`, data),

  
  getDashboard: () => request("GET", "/dashboard"),
};