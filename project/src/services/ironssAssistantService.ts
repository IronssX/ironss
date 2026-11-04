import { requireSupabase } from '@/lib/supabase';

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export type AssistantErrorCode =
  | 'auth_required'
  | 'rate_limit'
  | 'ai_not_configured'
  | 'ai_unavailable'
  | 'assistant_request_failed';

export class IronssAssistantError extends Error {
  constructor(readonly code: AssistantErrorCode) {
    super(code);
    this.name = 'IronssAssistantError';
  }
}

function isAssistantResponse(value: unknown): value is { reply: string } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'reply' in value &&
    typeof value.reply === 'string'
  );
}

export async function requestIronssAssistantReply(
  message: string,
  history: AssistantHistoryItem[],
  channelContext?: string,
  language: 'tr' | 'en' = 'tr',
): Promise<string> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.access_token) throw new IronssAssistantError('auth_required');

  const { data, error } = await client.functions.invoke('ironss-ai', {
    body: { message, history, channelContext, language },
  });

  if (error) {
    const response = 'context' in error && error.context instanceof Response ? error.context : null;
    if (response) {
      let code: unknown;
      try {
        const body: unknown = await response.clone().json();
        if (body && typeof body === 'object' && 'code' in body) code = body.code;
      } catch {
        code = undefined;
      }

      if (code === 'auth_required' || response.status === 401) throw new IronssAssistantError('auth_required');
      if (code === 'rate_limit' || response.status === 429) throw new IronssAssistantError('rate_limit');
      if (code === 'ai_not_configured') throw new IronssAssistantError('ai_not_configured');
      if (code === 'ai_unavailable' || response.status === 502) throw new IronssAssistantError('ai_unavailable');
    }
    throw new IronssAssistantError('assistant_request_failed');
  }

  if (!isAssistantResponse(data) || data.reply.trim() === '') {
    throw new IronssAssistantError('assistant_request_failed');
  }
  return data.reply;
}
