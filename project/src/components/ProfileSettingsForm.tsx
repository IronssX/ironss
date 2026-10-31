import { useEffect, useState, type FormEvent } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { MAX_CHANNEL_DESCRIPTION_LENGTH } from '@/services/channelService';

interface ProfileSettingsFormProps {
  initialUsername: string;
  initialDescription: string | null;
  onSave: (username: string, description: string) => Promise<string | null>;
}

export function ProfileSettingsForm({
  initialUsername,
  initialDescription,
  onSave,
}: ProfileSettingsFormProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState(initialUsername);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUsername(initialUsername);
    setDescription(initialDescription ?? '');
  }, [initialUsername, initialDescription]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    const saveError = await onSave(username, description);
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="profile-username" className="text-sm font-medium text-gray-200">
          {t('profile.username')}
        </label>
        <div className="flex h-11 items-center rounded-xl border border-surface-border bg-surface-raised px-3 focus-within:border-neon-500 focus-within:ring-2 focus-within:ring-neon-500/25">
          <span className="text-sm text-neon-300">@</span>
          <input
            id="profile-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setSaved(false);
            }}
            autoComplete="username"
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]{3,20}"
            required
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-100 outline-none"
            aria-describedby="profile-username-help"
          />
        </div>
        <p id="profile-username-help" className="text-xs text-gray-500">{t('profile.usernameHelp')}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="profile-description" className="text-sm font-medium text-gray-200">
          {t('profile.bio')}
        </label>
        <textarea
          id="profile-description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setSaved(false);
          }}
          maxLength={MAX_CHANNEL_DESCRIPTION_LENGTH}
          rows={4}
          placeholder={t('profile.bioPlaceholder')}
          className="w-full resize-y rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/30"
        />
        <p className="text-right text-xs text-gray-500">
          {description.length}/{MAX_CHANNEL_DESCRIPTION_LENGTH} {t('profile.characters')}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {saved && <p role="status" className="text-sm text-neon-200">{t('profile.profileSaved')}</p>}
        <button
          type="submit"
          disabled={isSaving}
          className="primary-button h-10 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t('profile.saving') : t('profile.save')}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </form>
  );
}
