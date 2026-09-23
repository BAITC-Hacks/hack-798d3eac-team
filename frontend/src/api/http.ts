export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'ApiError'; }
}

export class HttpClient {
  constructor(private readonly baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api') {}
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init.headers },
      });
    } catch {
      throw new ApiError('Не удалось подключиться к серверу. Проверьте, что приложение запущено.', 0);
    }
    const payload = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new ApiError(payload.error ?? `Ошибка сервера (${response.status})`, response.status);
    return payload as T;
  }
}
