import { buildApiUrl } from '../collaboration/config';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiRequest<T>(pathname: string, init: ApiRequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(pathname), {
      ...init,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(
      'The collaboration server is not reachable. Start `npm run server` in `word-processor`.',
      0,
    );
  }

  if (!response.ok) {
    let message = response.statusText;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      if (response.status === 502 || response.status === 504) {
        message =
          'The collaboration server is not reachable. Start `npm run server` in `word-processor`.';
      }
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
