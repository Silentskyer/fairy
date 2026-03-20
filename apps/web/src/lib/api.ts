const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";

type Method = "GET" | "POST";

export async function apiRequest<T>(path: string, options?: { method?: Method; body?: unknown; token?: string | null }) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload: T | { message?: string } | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as T | { message?: string };
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload ? payload.message : response.statusText;
    throw new Error(message || "Request failed");
  }

  return payload as T;
}
