import {
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Thumbnail } from '@/components/Thumbnail';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { searchIronssContent, type IronssAiSearchResults } from '@/services/ironssAiService';
import {
  IronssAssistantError,
  requestIronssAssistantReply,
  type AssistantErrorCode,
  type AssistantHistoryItem,
} from '@/services/ironssAssistantService';
import type { Video } from '@/types/video';
import { formatViews } from '@/utils/format';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

interface IronssAIProps {
  isAvailable: boolean;
  onSelectVideo: (videoId: string, video?: Video) => void;
  onOpenChannel: (channelId: string) => void;
  onSignIn: () => void;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  searchResults?: IronssAiSearchResults;
  error?: AssistantErrorCode | 'search_failed';
}

const SEARCH_INTENT = /\b(video|videos|videolari|videolar|videoyu|clip|clips|shorts|ara|aramak|bul|goster|search|find|edits?|editleri)\b/;
const CHANNEL_CONTEXT_INTENT = /\b(kanal|channel|icerik|content)\b/;
const DESCRIPTION_INTENT = /\b(aciklama|description|oneri|suggest|yaz|write|olustur|create|baslik|title)\b/;

export function IronssAI({ isAvailable, onSelectVideo, onOpenChannel, onSignIn }: IronssAIProps) {
  const { language, t } = useLanguage();
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [copyFailedMessageId, setCopyFailedMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const messageId = useRef(0);

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [user?.id]);

  useEffect(() => {
    if (!isAvailable) setIsOpen(false);
  }, [isAvailable]);

  useEffect(() => {
    panelRef.current?.toggleAttribute('inert', !isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const id = ++messageId.current;
    setMessages((current) => [...current, { ...message, id }]);
  };

  const getErrorText = (code: ChatMessage['error']): string => {
    if (code === 'auth_required') return t('assistant.authRequired');
    if (code === 'rate_limit') return t('assistant.rateLimit');
    if (code === 'ai_not_configured') return t('assistant.notConfigured');
    if (code === 'ai_unavailable') return t('assistant.aiUnavailable');
    if (code === 'search_failed') return t('assistant.searchFailed');
    return t('assistant.requestFailed');
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isLoading) return;
    setInput('');
    addMessage({ role: 'user', content: text });
    setIsLoading(true);

    const normalizedText = text
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/ı/g, 'i')
      .toLowerCase();
    if (SEARCH_INTENT.test(normalizedText)) {
      try {
        const searchResults = await searchIronssContent(text);
        addMessage({
          role: 'assistant',
          content: searchResults.videos.length + searchResults.users.length > 0
            ? t('assistant.searchResults')
            : t('assistant.noSearchResults'),
          searchResults,
        });
      } catch (error) {
        logSupabaseFailure('IRONSS AI', 'assistant content search', error);
        addMessage({ role: 'assistant', content: getErrorText('search_failed'), error: 'search_failed' });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!user) {
      addMessage({ role: 'assistant', content: getErrorText('auth_required'), error: 'auth_required' });
      setIsLoading(false);
      return;
    }

    try {
      let channelContext: string | undefined;
      if (
        user?.id &&
        CHANNEL_CONTEXT_INTENT.test(normalizedText) &&
        DESCRIPTION_INTENT.test(normalizedText)
      ) {
        channelContext = profile?.channelDescription?.slice(0, 500) || undefined;
      }

      const history: AssistantHistoryItem[] = messages
        .slice(-10)
        .map(({ role, content }) => ({ role, content: content.slice(0, 2_000) }));
      const reply = await requestIronssAssistantReply(text, history, channelContext, language);
      addMessage({ role: 'assistant', content: reply });
    } catch (error) {
      const code = error instanceof IronssAssistantError ? error.code : 'assistant_request_failed';
      if (code === 'assistant_request_failed') {
        logSupabaseFailure('IRONSS AI', 'assistant response', error);
      }
      addMessage({ role: 'assistant', content: getErrorText(code), error: code });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setCopyFailedMessageId(null);
      window.setTimeout(() => setCopiedMessageId(null), 1800);
    } catch (error) {
      logSupabaseFailure('IRONSS AI', 'copy assistant response', error);
      setCopyFailedMessageId(message.id);
      setCopiedMessageId(null);
    }
  };

  const handleOpenVideo = (video: Video) => {
    setIsOpen(false);
    onSelectVideo(video.id, video);
  };

  const handleOpenChannel = (channelId: string) => {
    setIsOpen(false);
    onOpenChannel(channelId);
  };

  if (!isAvailable) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t(isOpen ? 'assistant.close' : 'assistant.open')}
        aria-expanded={isOpen}
        aria-controls="ironss-ai-assistant-panel"
        onClick={() => setIsOpen((open) => !open)}
        className={`fixed z-[80] flex items-center justify-center border border-neon-200/40 bg-[#21152e] font-black text-neon-100 shadow-[0_0_26px_-5px_rgba(181,110,255,.85)] transition duration-200 hover:border-neon-100/70 hover:shadow-[0_0_34px_-4px_rgba(181,110,255,.95)] motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-200 ${
          isOpen
            ? 'right-16 top-5 h-10 w-10 rounded-xl text-base'
            : 'bottom-24 right-3 h-12 w-12 rounded-2xl text-xl hover:scale-105 sm:bottom-8 sm:right-5'
        }`}
      >
        <span aria-hidden="true" className="drop-shadow-[0_0_8px_rgba(220,190,255,.9)]">S</span>
      </button>

      <div
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-[65] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 sm:bg-black/35 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        id="ironss-ai-assistant-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('assistant.title')}
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-[70] flex h-[100dvh] w-full flex-col overflow-hidden border-l border-neon-300/20 bg-[#100d15] shadow-[-24px_0_80px_-35px_rgba(168,85,247,.55)] transition-transform duration-300 ease-out motion-reduce:transition-none sm:inset-y-4 sm:right-4 sm:h-auto sm:w-[400px] sm:rounded-2xl sm:border ${
          isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,.16),transparent_65%)] px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neon-200/25 bg-neon-300/[0.10] text-lg font-black text-neon-100 shadow-[0_0_20px_-8px_rgba(181,110,255,.9)]">
              S
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                IRONSS AI <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-neon-200" />
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-gray-500">{t('assistant.subtitle')}</span>
            </span>
          </div>
          <button
            type="button"
            aria-label={t('assistant.close')}
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-200"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
          >
            {messages.length === 0 && (
              <div className="mt-4 rounded-2xl border border-neon-300/[0.13] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-neon-200">
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  <span className="text-xs font-semibold">{t('assistant.welcomeTitle')}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-300">{t('assistant.welcome')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void sendMessage(t('assistant.sampleSearch'))}
                    className="rounded-full border border-neon-300/20 bg-neon-300/[0.06] px-3 py-2 text-left text-xs text-neon-100 transition hover:bg-neon-300/[0.12]"
                  >
                    {t('assistant.searchSuggestion')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput(t('assistant.sampleWriting'))}
                    className="rounded-full border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-left text-xs text-gray-300 transition hover:border-neon-300/25 hover:text-white"
                  >
                    {t('assistant.writingSuggestion')}
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[94%] min-w-0 rounded-2xl px-3.5 py-3 ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-neon-300/[0.14] text-white'
                    : message.error
                      ? 'rounded-bl-md border border-amber-300/15 bg-amber-300/[0.05] text-amber-100'
                      : 'rounded-bl-md border border-white/[0.07] bg-white/[0.035] text-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-6">{message.content}</p>
                  {message.role === 'assistant' && !message.searchResults && !message.error && (
                    <div className="mt-2 flex items-center justify-end gap-2">
                      {copyFailedMessageId === message.id && (
                        <span role="status" className="text-[10px] text-amber-200">{t('assistant.copyFailed')}</span>
                      )}
                      <button
                        type="button"
                        aria-label={t(copiedMessageId === message.id ? 'assistant.copied' : 'assistant.copy')}
                        onClick={() => void copyMessage(message)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gray-500 transition hover:bg-white/[0.06] hover:text-neon-100"
                      >
                        {copiedMessageId === message.id
                          ? <Check aria-hidden="true" className="h-3 w-3" />
                          : <Copy aria-hidden="true" className="h-3 w-3" />}
                        {t(copiedMessageId === message.id ? 'assistant.copied' : 'assistant.copy')}
                      </button>
                    </div>
                  )}
                  {message.searchResults && (
                    <SearchResultList
                      results={message.searchResults}
                      language={language}
                      translate={t}
                      onOpenVideo={handleOpenVideo}
                      onOpenChannel={handleOpenChannel}
                    />
                  )}
                </div>
              </article>
            ))}

            {isLoading && (
              <div role="status" className="flex items-center gap-2 px-2 text-xs text-neon-100">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                {t('assistant.thinking')}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {!user && (
            <div className="shrink-0 border-t border-white/[0.07] px-4 py-3">
              <p className="text-xs leading-5 text-gray-400">{t('assistant.signInPrompt')}</p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignIn();
                }}
                className="mt-2 h-9 rounded-lg bg-neon-300 px-3 text-xs font-bold text-[#17111d] transition hover:bg-neon-200"
              >
                {t('assistant.signIn')}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/[0.07] bg-black/15 p-3 sm:p-4">
            <label htmlFor="ironss-ai-chat-input" className="sr-only">{t('assistant.messageLabel')}</label>
            <div className="flex items-end gap-2 rounded-2xl border border-white/[0.09] bg-[#17131d] p-2 transition focus-within:border-neon-300/40 focus-within:ring-2 focus-within:ring-neon-300/10">
              <textarea
                id="ironss-ai-chat-input"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                maxLength={2_000}
                rows={1}
                disabled={isLoading}
                placeholder={t('assistant.placeholder')}
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-white outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                aria-label={t('assistant.send')}
                disabled={!input.trim() || isLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-300 text-[#17111d] transition hover:bg-neon-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isLoading
                  ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                  : <Send aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] text-gray-600">{t('assistant.disclaimer')}</p>
          </form>
        </div>
      </aside>
    </>
  );
}

function SearchResultList({
  results,
  language,
  translate,
  onOpenVideo,
  onOpenChannel,
}: {
  results: IronssAiSearchResults;
  language: 'tr' | 'en';
  translate: (key: import('@/i18n').TranslationKey, params?: Record<string, string | number>) => string;
  onOpenVideo: (video: Video) => void;
  onOpenChannel: (channelId: string) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      {results.videos.length > 0 && (
        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neon-100">
            <Clapperboard aria-hidden="true" className="h-3.5 w-3.5" />
            {translate('assistant.searchVideos')}
          </h3>
          <div className="space-y-1.5">
            {results.videos.slice(0, 5).map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => onOpenVideo(video)}
                className="group flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-2 text-left transition hover:border-neon-300/30 hover:bg-white/[0.04]"
              >
                <Thumbnail
                  src={video.thumbnailUrl}
                  alt={translate('video.thumbnailAlt', { title: video.title })}
                  className="aspect-video w-20 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2 text-xs font-semibold leading-4 text-gray-100 group-hover:text-neon-100">{video.title}</span>
                  <span className="mt-1 block truncate text-[10px] text-gray-500">
                    {video.creator} · {formatViews(video.views, language)}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gray-600 group-hover:text-neon-100" />
              </button>
            ))}
          </div>
        </section>
      )}
      {results.users.length > 0 && (
        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neon-100">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            {translate('assistant.searchUsers')}
          </h3>
          <div className="space-y-1">
            {results.users.slice(0, 5).map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => onOpenChannel(profile.id)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/[0.05]"
              >
                <UserAvatar name={profile.username} imageUrl={profile.avatarUrl} className="h-8 w-8" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-200">{profile.username}</span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-gray-600" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
