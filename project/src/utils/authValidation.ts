import { translate, type Language } from '@/i18n';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterFormValues extends LoginValues {
  username: string;
}

function emailError(email: string, language: Language): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return translate(language, 'auth.emailRequired');
  if (!EMAIL_PATTERN.test(trimmed)) return translate(language, 'auth.emailInvalid');
  return undefined;
}

function passwordError(password: string, language: Language): string | undefined {
  if (!password) return translate(language, 'auth.passwordRequired');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return translate(language, 'auth.passwordMin', { count: MIN_PASSWORD_LENGTH });
  }
  return undefined;
}

function compact<T extends string>(errors: Record<T, string | undefined>): FieldErrors<T> {
  const result: FieldErrors<T> = {};
  for (const key of Object.keys(errors) as T[]) {
    const message = errors[key];
    if (message) result[key] = message;
  }
  return result;
}

export function validateLogin(values: LoginValues, language: Language = 'tr'): FieldErrors<'email' | 'password'> {
  return compact({
    email: emailError(values.email, language),
    password: values.password ? undefined : translate(language, 'auth.passwordRequired'),
  });
}

export function validateRegister(
  values: RegisterFormValues,
  language: Language = 'tr',
): FieldErrors<'username' | 'email' | 'password'> {
  const username = values.username.trim();
  let usernameMessage: string | undefined;
  if (!username) {
    usernameMessage = translate(language, 'auth.usernameRequired');
  } else if (!USERNAME_PATTERN.test(username)) {
    usernameMessage = translate(language, 'auth.usernameInvalid');
  }

  return compact({
    username: usernameMessage,
    email: emailError(values.email, language),
    password: passwordError(values.password, language),
  });
}
