
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

/** Error thrown for non-2xx responses; carries the HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

class ApiClient {
  private getToken(): string | null {
    const tokenKeys = [
      'access_token',
      'token',
      'jwt',
      'authToken',
      'auth_token',
    ];

    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);

      if (token) {
        return token;
      }
    }

    return null;
  }

  async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      headers: customHeaders,
      body,
      ...requestOptions
    } = options;

    const headers = new Headers(customHeaders);
    const token = this.getToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const isFormData =
      typeof FormData !== 'undefined' && body instanceof FormData;

    if (body !== undefined && !isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(
      `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
      {
        ...requestOptions,
        headers,
        body:
          body === undefined
            ? undefined
            : isFormData
              ? body
              : JSON.stringify(body),
        credentials: 'include',
      },
    );

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';

    let responseData: unknown;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorData = responseData as {
        message?: string | string[];
        error?: string;
      } | null;

      let message = `Request failed (${response.status})`;

      if (errorData && typeof errorData === 'object') {
        if (Array.isArray(errorData.message)) {
          message = errorData.message.join(', ');
        } else if (errorData.message) {
          message = errorData.message;
        } else if (errorData.error) {
          message = errorData.error;
        }
      } else if (typeof responseData === 'string' && responseData) {
        message = responseData;
      }

      throw new ApiError(message, response.status);
    }

    return responseData as T;
  }

  get<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  post<T = unknown>(
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
    });
  }

  patch<T = unknown>(
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body,
    });
  }

  put<T = unknown>(
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body,
    });
  }

  delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

const apiClient = new ApiClient();

export { apiClient };
export default apiClient;
