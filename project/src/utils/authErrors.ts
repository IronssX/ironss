import { SUPABASE_NOT_CONFIGURED_MESSAGE } from '@/lib/supabase';
import { translate, type Language, type TranslationKey } from '@/i18n';

const ERROR_RULES: Array<{ match: string; key: TranslationKey }> = [
  { match: SUPABASE_NOT_CONFIGURED_MESSAGE, key: 'auth.accountUnavailable' },
  { match: 'Invalid login credentials', key: 'auth.invalidCredentials' },
  { match: 'Email not confirmed', key: 'auth.emailUnconfirmed' },
  { match: 'User already registered', key: 'auth.emailRegistered' },
  { match: 'Database error saving new user', key: 'auth.usernameTaken' },
  { match: 'Password should be at least', key: 'auth.passwordPolicy' },
  { match: 'Unable to validate email address', key: 'auth.emailInvalid' },
  { match: 'rate limit', key: 'auth.tooManyAttempts' },
  { match: 'security purposes', key: 'auth.securityWait' },
  { match: 'Failed to fetch', key: 'auth.connectionFailed' },
  { match: 'NetworkError', key: 'auth.connectionFailed' },
];

export function describeAuthError(error: unknown, language: Language = 'tr'): string {
  const message = error instanceof Error ? error.message : '';
  const rule = ERROR_RULES.find((candidate) => message.toLowerCase().includes(candidate.match.toLowerCase()));
  return translate(language, rule?.key ?? 'auth.unexpected');
}
