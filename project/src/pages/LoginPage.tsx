import { useState, type ChangeEvent, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { useAuth } from '@/hooks/useAuth';
import type { Page } from '@/types/navigation';
import { validateLogin, type FieldErrors, type LoginValues } from '@/utils/authValidation';
import { useLanguage } from '@/hooks/useLanguage';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { language, t } = useLanguage();
  const { signIn } = useAuth();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<keyof LoginValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLogin(values, language);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    const error = await signIn(values.email.trim(), values.password);
    setIsSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }
    onNavigate('profile');
  };

  return (
    <AuthCard title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          id="login-email"
          name="email"
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailExample')}
          value={values.email}
          onChange={handleChange}
          error={errors.email}
        />
        <FormField
          id="login-password"
          name="password"
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          placeholder={t('auth.passwordPlaceholder')}
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />

        {formError && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-neon-500 px-4 text-sm font-medium text-white shadow-[0_0_20px_-6px_rgba(176,38,255,0.9)] transition-all duration-200 hover:bg-neon-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" />
          {isSubmitting ? t('auth.loginProgress') : t('auth.loginTitle')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400">
        {t('auth.noAccount')}{' '}
        <button
          type="button"
          onClick={() => onNavigate('register')}
          className="font-medium text-neon-300 transition-colors hover:text-white"
        >
          {t('auth.register')}
        </button>
      </p>
    </AuthCard>
  );
}
