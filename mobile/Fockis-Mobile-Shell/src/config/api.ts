export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  "http://192.168.1.112:3000"
).replace(/\/+$/, "");

/**
 * Build a Fockis API URL.
 *
 * Example:
 * apiUrl("/auth/register")
 *
 * => http://192.168.1.112:3000/auth/register
 */
export function apiUrl(path: string): string {
  return `${API_URL}/${path.replace(/^\/+/, "")}`;
}

/**
 * Get the authentication token.
 */
export function getAuthToken(): string | null {
  const keys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "authToken",
  ];

  for (const key of keys) {
    const token = localStorage.getItem(key);

    if (token && token.trim()) {
      return token.trim();
    }
  }

  return null;
}

/**
 * Headers for API requests.
 */
export function getApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export default API_URL;