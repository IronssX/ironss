import { MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useVideoComments } from '@/hooks/useVideoComments';
import { MAX_COMMENT_LENGTH } from '@/types/comment';
import { formatExactCount, formatTimeAgo } from '@/utils/format';
import { useLanguage } from '@/hooks/useLanguage';

interface CommentsSectionProps {
  videoId: string;
}

export function CommentsSection({ videoId }: CommentsSectionProps) {
  const { language, t } = useLanguage();
  const { profile } = useAuth();
  const { comments, addComment, saveFailed } = useVideoComments(videoId);
  const authorName = profile?.username ?? t('profile.guest');
  const [draft, setDraft] = useState('');
  const trimmedDraft = draft.trim();
  const canSubmit = trimmedDraft.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    addComment(trimmedDraft, authorName);
    setDraft('');
  };

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-neon-300" />
        <h2 id="comments-heading" className="text-lg font-bold text-white">
          {formatExactCount(comments.length, language)} {comments.length === 1 ? t('comments.one') : t('comments.other')}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-500 to-neon-700 text-sm font-bold text-white"
        >
          {authorName.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="comment-input" className="sr-only">
            {t('comments.write')}
          </label>
          <textarea
            id="comment-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            rows={3}
            placeholder={t('comments.placeholder')}
            className="w-full resize-y rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/30"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-gray-500">
              {draft.length}/{MAX_COMMENT_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-lg bg-neon-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-neon-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-gray-500"
            >
              <Send className="h-4 w-4" />
              {t('comments.send')}
            </button>
          </div>
        </div>
      </form>

      {saveFailed && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {t('comments.saveFailed')}
        </p>
      )}

      {comments.length > 0 ? (
        <ul className="flex flex-col gap-5">
          {comments.map((comment) => (
            <li key={comment.id} className="flex animate-fade-in gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-bold text-neon-300"
              >
                {comment.author.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-bold text-gray-100">{comment.author}</span>
                  <time dateTime={comment.createdAt} className="text-xs text-gray-500">
                    {formatTimeAgo(comment.createdAt, Date.now(), language)}
                  </time>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-surface-border px-4 py-8 text-center text-sm text-gray-400">
          {t('comments.empty')}
        </p>
      )}
    </section>
  );
}
