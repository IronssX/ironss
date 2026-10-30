import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Eye,
  Heart,
  LayoutDashboard,
  ListVideo,
  MessageSquare,
  Settings,
  Upload,
  Users,
  Video as VideoIcon,
  type LucideIcon,
} from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/i18n';
import { fetchOwnDailyVideoViews, fetchOwnVideos, type DailyVideoViews } from '@/services/videoService';
import { fetchSubscriberCount } from '@/services/channelService';
import type { Page } from '@/types/navigation';
import type { Video, VideoType } from '@/types/video';
import { formatExactCount, formatUploadDate, formatViews } from '@/utils/format';

interface CreatorStudioPageProps {
  onNavigate: (page: Page) => void;
  onSelectVideo: (videoId: string) => void;
}

type StudioSection = 'overview' | 'content' | 'analytics' | 'settings';

const STUDIO_SECTIONS: { id: StudioSection; label: TranslationKey; icon: LucideIcon }[] = [
  { id: 'overview', label: 'studio.overview', icon: LayoutDashboard },
  { id: 'content', label: 'studio.content', icon: ListVideo },
  { id: 'analytics', label: 'studio.analytics', icon: BarChart3 },
  { id: 'settings', label: 'studio.settings', icon: Settings },
];

export function CreatorStudioPage({ onNavigate, onSelectVideo }: CreatorStudioPageProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [section, setSection] = useState<StudioSection>('overview');
  const [videos, setVideos] = useState<Video[]>([]);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [dailyViews, setDailyViews] = useState<DailyVideoViews[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videosFailed, setVideosFailed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let isCurrent = true;
    setIsLoading(true);
    Promise.allSettled([
      fetchOwnVideos(user.id),
      fetchSubscriberCount(user.id),
      fetchOwnDailyVideoViews(),
    ]).then(([videosResult, subscriberResult, dailyResult]) => {
      if (!isCurrent) return;

      if (videosResult.status === 'fulfilled') {
        setVideos(videosResult.value);
        setVideosFailed(false);
      } else {
        setVideos([]);
        setVideosFailed(true);
      }

      setSubscriberCount(subscriberResult.status === 'fulfilled' ? subscriberResult.value : null);
      setDailyViews(dailyResult.status === 'fulfilled' ? dailyResult.value : null);
      setIsLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  if (isAuthLoading) return <LoadingSpinner label={t('loading.account')} />;

  if (!user) {
    return (
      <AuthCard title={t('studio.signInTitle')} subtitle={t('studio.signInDescription')}>
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-neon-500 px-5 text-sm font-medium text-white transition-colors hover:bg-neon-400"
        >
          {t('studio.signIn')}
        </button>
      </AuthCard>
    );
  }

  if (isLoading) return <LoadingSpinner label={t('loading.video')} />;

  const ownVideos = videos.filter((video) => video.ownerId === user.id);
  const totalViews = ownVideos.reduce((total, video) => total + video.views, 0);
  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 animate-fade-in">
      <header className="flex flex-col gap-2 border-b border-white/[0.07] pb-6">
        <p className="eyebrow">IRONSS / CREATOR</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{t('studio.title')}</h1>
      </header>

      <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:gap-8">
        <nav aria-label={t('studio.title')} className="flex gap-2 overflow-x-auto pb-1 xl:w-56 xl:shrink-0 xl:flex-col xl:overflow-visible">
          {STUDIO_SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors xl:w-full ${
                  isActive ? 'nav-item-active text-neon-200' : 'text-gray-400 hover:bg-white/[0.045] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(label)}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 flex-1">
          {videosFailed && (
            <p role="alert" className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {t('studio.loadError')}
            </p>
          )}

          {section === 'overview' && (
            <OverviewSection
              videos={ownVideos}
              totalViews={totalViews}
              subscriberCount={subscriberCount}
              language={language}
              t={t}
              onSelectVideo={onSelectVideo}
              onShowAll={() => setSection('content')}
              onUpload={() => onNavigate('upload')}
            />
          )}
          {section === 'content' && (
            <ContentSection
              videos={ownVideos}
              language={language}
              t={t}
              onSelectVideo={onSelectVideo}
              onUpload={() => onNavigate('upload')}
            />
          )}
          {section === 'analytics' && (
            <AnalyticsSection videos={ownVideos} dailyViews={dailyViews} language={language} t={t} />
          )}
          {section === 'settings' && (
            <SettingsSection
              email={user.email ?? ''}
              language={language}
              setLanguage={setLanguage}
              t={t}
              onOpenProfile={() => onNavigate('profile')}
            />
          )}
        </section>
      </div>
    </div>
  );
}

interface SectionTranslationProps {
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

interface OverviewSectionProps extends SectionTranslationProps {
  videos: Video[];
  totalViews: number;
  subscriberCount: number | null;
  language: 'tr' | 'en';
  onSelectVideo: (videoId: string) => void;
  onShowAll: () => void;
  onUpload: () => void;
}

function OverviewSection({
  videos,
  totalViews,
  subscriberCount,
  language,
  t,
  onSelectVideo,
  onShowAll,
  onUpload,
}: OverviewSectionProps) {
  const metrics = [
    { label: t('studio.metricVideos'), value: formatExactCount(videos.length, language), detail: null, icon: VideoIcon },
    { label: t('studio.metricViews'), value: formatExactCount(totalViews, language), detail: null, icon: Eye },
    { label: t('studio.metricSubscribers'), value: subscriberCount === null ? '—' : formatExactCount(subscriberCount, language), detail: subscriberCount === null ? t('studio.metricUnavailable') : null, icon: Users },
    { label: t('studio.metricLikes'), value: '—', detail: t('studio.notTracked'), icon: Heart },
    { label: t('studio.metricComments'), value: '—', detail: t('studio.notTracked'), icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="text-xl font-bold text-white">{t('studio.overviewTitle')}</h2>
        <p className="mt-1 text-sm text-gray-400">{t('studio.overviewDescription')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="min-w-0 rounded-lg border border-surface-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2 text-gray-400">
              <span className="truncate text-xs font-medium uppercase">{label}</span>
              <Icon className="h-4 w-4 shrink-0 text-neon-300" />
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tabular-nums text-white">{value}</p>
            {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">{t('studio.recentVideos')}</h3>
          {videos.length > 0 && (
            <button type="button" onClick={onShowAll} className="flex shrink-0 items-center gap-1 text-sm font-medium text-neon-300 hover:text-white">
              {t('studio.viewAll')} <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>
        {videos.length > 0 ? (
          <div className="divide-y divide-surface-border border-y border-surface-border">
            {videos.slice(0, 5).map((video) => (
              <StudioVideoItem key={video.id} video={video} language={language} t={t} onSelect={onSelectVideo} />
            ))}
          </div>
        ) : (
          <EmptyVideos t={t} onUpload={onUpload} />
        )}
      </section>
    </div>
  );
}

interface ContentSectionProps extends SectionTranslationProps {
  videos: Video[];
  language: 'tr' | 'en';
  onSelectVideo: (videoId: string) => void;
  onUpload: () => void;
}

function ContentSection({ videos, language, t, onSelectVideo, onUpload }: ContentSectionProps) {
  const [videoType, setVideoType] = useState<VideoType>('standard');
  const displayedVideos = videos.filter((video) => (video.videoType ?? 'standard') === videoType);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-white">{t('studio.contentTitle')}</h2>
        <p className="mt-1 text-sm text-gray-400">{t('studio.contentDescription')}</p>
      </div>
      <div className="flex gap-2" role="group" aria-label={t('studio.contentTitle')}>
        {(['standard', 'short'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setVideoType(type)}
            aria-pressed={videoType === type}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              videoType === type
                ? 'border-neon-400/40 bg-neon-400/10 text-neon-200'
                : 'border-surface-border text-gray-400 hover:text-white'
            }`}
          >
            {t(type === 'short' ? 'studio.shortsVideos' : 'studio.standardVideos')}
            <span className="ml-1.5 text-gray-500">
              ({videos.filter((video) => (video.videoType ?? 'standard') === type).length})
            </span>
          </button>
        ))}
      </div>
      {displayedVideos.length > 0 ? (
        <div className="divide-y divide-surface-border border-y border-surface-border">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_10rem] gap-4 py-3 text-xs font-semibold uppercase text-gray-500 md:grid">
            <span>{t('studio.tableVideo')}</span>
            <span>{t('studio.tableViews')}</span>
            <span>{t('studio.tableLikes')}</span>
            <span>{t('studio.tableDate')}</span>
          </div>
          {displayedVideos.map((video) => (
            <StudioVideoItem key={video.id} video={video} language={language} t={t} onSelect={onSelectVideo} detailed />
          ))}
        </div>
      ) : videos.length > 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border bg-surface/50 px-6 py-10 text-center text-sm text-gray-400">
          {t('studio.noVideosOfType')}
        </p>
      ) : (
        <EmptyVideos t={t} onUpload={onUpload} />
      )}
    </div>
  );
}

interface StudioVideoItemProps extends SectionTranslationProps {
  video: Video;
  language: 'tr' | 'en';
  onSelect: (videoId: string) => void;
  detailed?: boolean;
}

function StudioVideoItem({ video, language, t, onSelect, detailed = false }: StudioVideoItemProps) {
  return (
    <div className={`grid min-w-0 items-center gap-3 py-3 md:gap-4 ${detailed ? 'md:grid-cols-[minmax(0,1fr)_8rem_8rem_10rem]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}>
      <button type="button" onClick={() => onSelect(video.id)} className="flex min-w-0 items-center gap-3 text-left">
        <span className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-surface-border bg-surface-raised">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <VideoIcon className="h-5 w-5 text-gray-500" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-gray-100">{video.title}</span>
          {detailed && <span className="mt-1 block text-xs text-gray-500">{formatUploadDate(video.uploadedAt, Date.now(), language)}</span>}
            {detailed && <span className="mt-1 block text-xs text-gray-500 md:hidden">— {t('studio.notTracked')}</span>}
        </span>
      </button>
      <span className="text-right text-sm tabular-nums text-gray-300 md:text-left">{formatViews(video.views, language)}</span>
      {detailed && (
        <>
          <span className="hidden text-sm text-gray-500 md:block">— <span className="text-xs">{t('studio.notTracked')}</span></span>
          <span className="hidden text-sm text-gray-400 md:block">{formatUploadDate(video.uploadedAt, Date.now(), language)}</span>
        </>
      )}
    </div>
  );
}

interface EmptyVideosProps extends SectionTranslationProps {
  onUpload: () => void;
}

function EmptyVideos({ t, onUpload }: EmptyVideosProps) {
  return (
    <div className="flex flex-col items-center gap-3 border-y border-dashed border-surface-border px-6 py-12 text-center">
      <VideoIcon className="h-8 w-8 text-gray-500" />
      <p className="text-sm text-gray-400">{t('studio.emptyVideos')}</p>
      <button type="button" onClick={onUpload} className="mt-1 flex items-center gap-2 rounded-lg bg-neon-500 px-4 py-2 text-sm font-medium text-white hover:bg-neon-400">
        <Upload className="h-4 w-4" /> {t('studio.uploadFirst')}
      </button>
    </div>
  );
}

interface AnalyticsSectionProps extends SectionTranslationProps {
  videos: Video[];
  dailyViews: DailyVideoViews[] | null;
  language: 'tr' | 'en';
}

function AnalyticsSection({ videos, dailyViews, language, t }: AnalyticsSectionProps) {
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const countsByDate = new Map((dailyViews ?? []).map((item) => [item.date, item.views]));
  const series = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, views: countsByDate.get(key) ?? 0 };
  });
  const maxViews = Math.max(0, ...series.map((item) => item.views));
  const hasRecordedViews = Boolean(dailyViews?.length);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="text-xl font-bold text-white">{t('studio.analyticsTitle')}</h2>
        <p className="mt-1 text-sm text-gray-400">{t('studio.analyticsDescription')}</p>
      </div>

      <section className="rounded-lg border border-surface-border bg-surface p-4 sm:p-6">
        <h3 className="text-base font-semibold text-white">{t('studio.dailyViews')}</h3>
        {dailyViews === null ? (
          <p className="mt-5 rounded-md bg-surface-raised px-4 py-5 text-sm leading-relaxed text-gray-400">{t('studio.analyticsUnavailable')}</p>
        ) : !hasRecordedViews ? (
          <p className="mt-5 rounded-md bg-surface-raised px-4 py-5 text-sm text-gray-400">{t('studio.noAnalytics')}</p>
        ) : (
          <div className="mt-6">
            <div role="img" aria-label={t('studio.viewsPerDay')} className="flex h-48 items-end gap-1 border-b border-l border-surface-border px-2">
              {series.map((item) => {
                const dateLabel = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.date}T00:00:00Z`));
                const height = item.views === 0 ? 1 : Math.max(5, (item.views / maxViews) * 100);
                return (
                  <div key={item.date} title={`${dateLabel}: ${formatExactCount(item.views, language)}`} className="flex h-full min-w-0 flex-1 items-end justify-center">
                    <span className="w-full max-w-3 rounded-t-sm bg-neon-400/80 transition-colors hover:bg-neon-300" style={{ height: `${height}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-5 text-xs text-gray-500">
              {[0, 7, 14, 21, 29].map((index) => (
                <span key={index} className={index === 29 ? 'text-right' : undefined}>
                  {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${series[index].date}T00:00:00Z`))}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{t('studio.videoStats')}</h3>
          <p className="mt-1 text-sm text-gray-400">{t('studio.videoStatsDescription')}</p>
        </div>
        {videos.length > 0 && (
          <div className="divide-y divide-surface-border border-y border-surface-border">
            {videos.map((video) => (
              <div key={video.id} className="grid grid-cols-[minmax(0,1fr)_7rem_6rem] items-center gap-3 py-3">
                <span className="truncate text-sm text-gray-200">{video.title}</span>
                <span className="text-right text-sm tabular-nums text-gray-300">{formatViews(video.views, language)}</span>
                <span className="text-right text-xs text-gray-500">— {t('studio.notTracked')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface SettingsSectionProps extends SectionTranslationProps {
  email: string;
  language: 'tr' | 'en';
  setLanguage: (language: 'tr' | 'en') => void;
  onOpenProfile: () => void;
}

function SettingsSection({ email, language, setLanguage, t, onOpenProfile }: SettingsSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-white">{t('studio.settingsTitle')}</h2>

      <section className="flex flex-col gap-3 border-b border-surface-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{t('studio.language')}</h3>
          <p className="mt-1 text-sm text-gray-400">{t('language.select')}</p>
        </div>
        <div role="group" aria-label={t('studio.language')} className="flex w-fit rounded-lg border border-surface-border p-1">
          {(['tr', 'en'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLanguage(option)}
              aria-pressed={language === option}
              className={`rounded-md px-4 py-2 text-sm font-medium ${language === option ? 'bg-neon-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {option === 'tr' ? 'Türkçe' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-b border-surface-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{t('studio.account')}</h3>
          <p className="mt-1 text-sm text-gray-400">{t('studio.signedInAs')}: {email}</p>
        </div>
        <button type="button" onClick={onOpenProfile} className="flex h-10 w-fit items-center gap-2 rounded-lg border border-surface-border px-4 text-sm text-gray-200 hover:bg-surface-hover">
          {t('studio.openProfile')} <ArrowUpRight className="h-4 w-4" />
        </button>
      </section>

      <p className="max-w-3xl text-sm leading-relaxed text-gray-400">{t('studio.manageNotice')}</p>
    </div>
  );
}
