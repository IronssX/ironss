import type { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

export function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-200">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`h-11 w-full rounded-xl border bg-surface px-4 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500/70 focus:ring-red-500/30'
            : 'border-surface-border focus:border-neon-500 focus:ring-neon-500/30'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
