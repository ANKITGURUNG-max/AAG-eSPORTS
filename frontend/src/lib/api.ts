const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
const API = env.VITE_API_URL || (env.DEV ? "/api" : "https://aag-esports-backend.onrender.com/api");
let refreshing: Promise<boolean> | null = null;
async function refreshAccessToken() {
  const refresh = localStorage.getItem("dropzone_refresh");
  if (!refresh) return false;
  if (!refreshing) refreshing = fetch(`${API}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }) }).then(async response => {
    if (!response.ok) return false;
    const tokens = await response.json();
    localStorage.setItem("dropzone_access", tokens.access);
    if (tokens.refresh) localStorage.setItem("dropzone_refresh", tokens.refresh);
    return true;
  }).finally(() => { refreshing = null; });
  return refreshing;
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const request = async () => {
    const token = localStorage.getItem("dropzone_access");
    const adminToken = localStorage.getItem("aag_admin_token");
    return fetch(`${API}/${path}`, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(adminToken ? { "X-Admin-Token": adminToken } : {}), ...options.headers } });
  };
  let response: Response;
  try {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await request();
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    if (!response!) throw lastError;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network request failed.";
    throw new Error(`Could not connect to the AAG eSports server while requesting ${path}. ${detail}`);
  }
  if (response.status === 401 && await refreshAccessToken()) response = await request();
  if (!response.ok) {
    const raw = await response.text();
    let payload: any = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }
    const message = payload?.detail || Object.entries(payload || {}).map(([field, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return `${field}: ${values.join(", ")}`;
    }).join(" ") || (raw && !raw.trim().startsWith("<") ? raw.slice(0, 240) : `Request failed (${response.status})`);
    throw new Error(message);
  }
  return response.json();
}
export const login = (data: { username: string; password: string }) => api<{ access: string; refresh: string }>("auth/login", { method: "POST", body: JSON.stringify(data) });
export const register = (data: Record<string, string>) => api<{ player_id: string; username: string }>("auth/register", { method: "POST", body: JSON.stringify(data) });
export const adminLogin = (password: string) => api<{ token: string }>("admin/login", { method: "POST", body: JSON.stringify({ password }) });
