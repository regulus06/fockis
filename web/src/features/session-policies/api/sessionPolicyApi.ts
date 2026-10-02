import type {
  CreateSessionPolicyInput,
  SessionPolicy,
  UpdateSessionPolicyInput,
} from '../types/sessionPolicy.types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function getToken(): string | null {
  const keys = [
    'accessToken',
    'access_token',
    'token',
    'fockis_access_token',
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? Array.isArray((body as any).message)
          ? (body as any).message.join(', ')
          : String((body as any).message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

export const sessionPolicyApi = {
  list: () =>
    request<SessionPolicy[]>('/admin/security/session-policies'),

  defaults: () =>
    request<Partial<SessionPolicy>[]>(
      '/admin/security/session-policies/defaults',
    ),

  get: (id: string) =>
    request<SessionPolicy>(`/admin/security/session-policies/${id}`),

  create: (input: CreateSessionPolicyInput) =>
    request<SessionPolicy>('/admin/security/session-policies', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateSessionPolicyInput) =>
    request<SessionPolicy>(`/admin/security/session-policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<{ success: boolean }>(
      `/admin/security/session-policies/${id}`,
      { method: 'DELETE' },
    ),
};
