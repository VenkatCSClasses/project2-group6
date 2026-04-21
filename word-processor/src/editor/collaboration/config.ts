export type CollaborationRuntimeConfig = {
  apiBaseUrl: string;
  websocketUrl: string | null;
  isRealtimeEnabled: boolean;
  documentPollIntervalMs: number;
  presencePollIntervalMs: number;
  heartbeatIntervalMs: number;
};

export function getCollaborationConfig(): CollaborationRuntimeConfig {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '';
  const websocketUrl = import.meta.env.VITE_COLLAB_SERVER_URL?.trim() || null;

  return {
    apiBaseUrl,
    websocketUrl,
    isRealtimeEnabled: Boolean(websocketUrl),
    documentPollIntervalMs: 2000,
    presencePollIntervalMs: 3000,
    heartbeatIntervalMs: 10000,
  };
}

export function buildApiUrl(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '';

  return `${apiBaseUrl}${normalizedPath}`;
}
