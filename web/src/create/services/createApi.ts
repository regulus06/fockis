// web/src/create/services/createApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export const CREATE_API_BASE = `${API_BASE}/create`;

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

function getToken(): string | null {
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('jwt')
  );
}

function buildHeaders(options: {
  body?: BodyInit | null;
  headers?: HeadersInit;
} = {}): Headers {
  const headers = new Headers(options.headers);

  const token = getToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  return headers;
}

async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  return text || null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${CREATE_API_BASE}${path}`, {
    ...options,
    headers: buildHeaders({
      body: options.body,
      headers: options.headers,
    }),
    credentials: 'include',
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`;

    const error: ApiError = {
      status: response.status,
      message,
      details: data,
    };

    throw error;
  }

  return data as T;
}

export const createApi = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: 'GET',
    });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: 'DELETE',
    });
  },
};

export default createApi;