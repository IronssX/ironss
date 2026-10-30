export function logSupabaseFailure(scope: string, action: string, error: unknown): void {
  if (!import.meta.env.DEV) return;

  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const rawMessage = error instanceof Error
    ? error.message
    : typeof details.message === 'string'
      ? details.message
      : 'Unknown Supabase error';
  const message = rawMessage
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/(["']?(?:password|token|access_token|refresh_token|apikey|api_key|secret)["']?\s*[:=]\s*)["']?[^\s,;}"']+["']?/gi, '$1[REDACTED]');

  console.error(`[IRONSS ${scope}] ${action} failed`, {
    code: typeof details.code === 'string' || typeof details.code === 'number' ? details.code : undefined,
    status: typeof details.status === 'number' ? details.status : undefined,
    message,
  });
}