import { useEffect, useState, type FormEvent } from 'react';
import { MAX_CHANNEL_DESCRIPTION_LENGTH } from '@/services/channelService';
import { useLanguage } from '@/hooks/useLanguage';

interface ChannelDescriptionFormProps {
  initialValue: string | null;
  onSave: (description: string) => Promise<string | null>;
}

export function ChannelDescriptionForm({ initialValue, onSave }: ChannelDescriptionFormProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState(initialValue ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(initialValue ?? '');
  }, [initialValue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    const saveError = await onSave(value);
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="channel-description" className="text-sm font-medium text-gray-200">
        {t('profile.channelDescription')}
      </label>
      <textarea
        id="channel-description"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setSaved(false);
        }}
        maxLength={MAX_CHANNEL_DESCRIPTION_LENGTH}
        rows={4}
        placeholder={t('profile.channelDescriptionPlaceholder')}
        className="w-full resize-y rounded-lg border border-surface-border bg-surface-raised px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/30"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          {value.length}/{MAX_CHANNEL_DESCRIPTION_LENGTH} {t('profile.characters')}
        </p>
        <div className="flex items-center gap-3">
          {saved && <p role="status" className="text-sm text-neon-200">{t('profile.descriptionSaved')}</p>}
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-neon-500 px-5 text-sm font-medium text-white transition-all hover:bg-neon-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </form>
  );
}
