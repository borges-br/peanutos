const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getTargetUrl(endpoint: string): string {
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If the endpoint already starts with /api/v1, strip it from the baseUrl to prevent double prefixing
  if (cleanEndpoint.startsWith('/api/v1')) {
    return `${baseUrl.replace('/api/v1', '')}${cleanEndpoint}`;
  }

  return `${baseUrl}${cleanEndpoint}`;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('peanut_token') : null;

  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const targetUrl = getTargetUrl(endpoint);

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Ocorreu um erro no servidor';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function apiBlobRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('peanut_token') : null;

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const targetUrl = getTargetUrl(endpoint);

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Ocorreu um erro no servidor';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.blob();
}
