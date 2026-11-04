import { MessageSquare, Reply, Send, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useVideoComments } from '@/hooks/useVideoComments';
import { MAX_COMMENT_LENGTH } from '@/types/comment';
import { formatExactCount, formatTimeAgo } from '@/utils/format';
import { useLanguage } from '@/hooks/useLanguage';
import { UserAvatar } from '@/components/UserAvatar';
import type { VideoComment } from '@/types/comment';

interface CommentsSectionProps {
  videoId: string;
}

export function CommentsSection({ videoId }: CommentsSectionProps) {
  const { language, t } = useLanguage();
  const { profile, avatarUrl } = useAuth();
  const { comments, addComment, saveFailed, hasError, isSignedIn } = useVideoComments(videoId);
  const authorName = profile?.username ?? t('profile.guest');
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<VideoComment | null>(null);
  const trimmedDraft = draft.trim();
  const canSubmit = trimmedDraft.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (await addComment(trimmedDraft, authorName, replyTarget?.id)) {
      setDraft('');
      setReplyTarget(null);
    }
  };

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-neon-300" />
          <h2 id="comments-heading" className="text-lg font-bold text-white">
            {formatExactCount(comments.length, language)} {comments.length === 1 ? t('comments.one') : t('comments.other')}
          </h2>
        </div>
        <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-gray-500">
          {t('comments.write')}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <UserAvatar name={authorName} imageUrl={avatarUrl} className="h-10 w-10" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {replyTarget && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-300/10 bg-violet-300/[0.05] px-3 py-2 text-xs text-violet-100">
              <span>{t('comments.replyingTo', { name: replyTarget.author })}</span>
              <button type="button" onClick={() => setReplyTarget(null)} aria-label={t('comments.cancelReply')} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
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
            className="w-full min-h-24 resize-y rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/30"
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
      {hasError && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {t('comments.fetchFailed')}
        </p>
      )}
      {!isSignedIn && (
        <p className="text-xs leading-relaxed text-gray-500">{t('comments.guestLocalOnly')}</p>
      )}

      {comments.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => (
            <li key={comment.id} className={`flex animate-fade-in gap-3 rounded-xl border border-white/[0.045] bg-white/[0.015] p-3 sm:p-4 ${comment.parentCommentId ? 'ml-6 border-l-violet-300/20 pl-3 sm:ml-10' : ''}`}>
              <UserAvatar name={comment.author} imageUrl={comment.avatarUrl ?? null} className="h-10 w-10" />
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
                {isSignedIn && comment.userId && (
                  <button
                    type="button"
                    onClick={() => setReplyTarget(comment)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-100"
                  >
                    <Reply className="h-3.5 w-3.5" /> {t('comments.reply')}
                  </button>
                )}
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
