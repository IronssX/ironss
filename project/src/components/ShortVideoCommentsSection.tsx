import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { ShortVideoComment } from '@/services/shortVideoInteractionService';
import { MAX_COMMENT_LENGTH } from '@/types/comment';
import { formatExactCount, formatTimeAgo } from '@/utils/format';
import type { Page } from '@/types/navigation';

interface ShortVideoCommentsSectionProps {
  onNavigate: (page: Page) => void;
  comments: ShortVideoComment[];
  commentCount: number;
  isLoading: boolean;
  isBusy: boolean;
  hasError: boolean;
  addComment: (body: string) => Promise<boolean>;
  removeComment: (commentId: string) => Promise<boolean>;
}

export function ShortVideoCommentsSection({
  onNavigate,
  comments,
  commentCount,
  isLoading,
  isBusy,
  hasError,
  addComment,
  removeComment,
}: ShortVideoCommentsSectionProps) {
  const { language, t } = useLanguage();
  const { user, profile, avatarUrl } = useAuth();
  const [draft, setDraft] = useState('');
  const trimmedDraft = draft.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedDraft || trimmedDraft.length > MAX_COMMENT_LENGTH) return;
    if (await addComment(trimmedDraft)) setDraft('');
  };

  return (
    <section aria-labelledby="short-comments-heading" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-neon-300" />
        <h3 id="short-comments-heading" className="text-sm font-bold text-white">
          {formatExactCount(commentCount, language)} {commentCount === 1 ? t('comments.one') : t('comments.other')}
        </h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2.5">
          <UserAvatar
            name={profile?.username ?? user.email ?? t('profile.guest')}
            imageUrl={avatarUrl}
            className="h-8 w-8 text-xs"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="short-comment-input" className="sr-only">
              {t('comments.write')}
            </label>
            <textarea
              id="short-comment-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              rows={2}
              disabled={isBusy}
              placeholder={t('shorts.commentPlaceholder')}
              className="w-full resize-y rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/30"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] tabular-nums text-gray-500">
                {draft.length}/{MAX_COMMENT_LENGTH}
              </span>
              <button
                type="submit"
                disabled={!trimmedDraft || isBusy}
                className="flex items-center gap-1.5 rounded-lg bg-neon-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neon-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {t('comments.send')}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="rounded-xl border border-surface-border px-3 py-3 text-left text-xs text-gray-300 transition-colors hover:border-neon-400/40 hover:text-white"
        >
          {t('shorts.signInToComment')}
        </button>
      )}

      {hasError && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {t('shorts.commentActionFailed')}
        </p>
      )}

      {isLoading ? (
        <p role="status" className="py-4 text-center text-xs text-gray-400">{t('shorts.commentsLoading')}</p>
      ) : comments.length > 0 ? (
        <ul className="flex max-h-[34dvh] flex-col gap-4 overflow-y-auto pr-1 sm:max-h-[calc(100dvh-20rem)]">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              <UserAvatar name={comment.username} imageUrl={comment.avatarUrl} className="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs">
                    <span className="font-semibold text-gray-100">{comment.username}</span>
                    <time dateTime={comment.createdAt} className="ml-2 text-[10px] text-gray-500">
                      {formatTimeAgo(comment.createdAt, Date.now(), language)}
                    </time>
                  </p>
                  {user?.id === comment.userId && (
                    <button
                      type="button"
                      onClick={() => void removeComment(comment.id)}
                      disabled={isBusy}
                      aria-label={t('shorts.deleteComment')}
                      className="icon-button h-7 w-7 shrink-0 text-gray-500 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-300">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-surface-border px-3 py-6 text-center text-xs text-gray-400">
          {t('comments.empty')}
        </p>
      )}
    </section>
  );
}
