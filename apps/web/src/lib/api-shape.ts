function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function extractArray<T = unknown>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (!isRecord(response)) {
    return [];
  }

  if (Array.isArray(response.data)) {
    return response.data as T[];
  }

  if (Array.isArray(response.items)) {
    return response.items as T[];
  }

  return [];
}

export function extractRecord(response: unknown): Record<string, unknown> {
  return isRecord(response) ? response : {};
}
