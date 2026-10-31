import {
  Accessibility,
  Bell,
  CircleHelp,
  Clapperboard,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  LockKeyhole,
  Monitor,
  Moon,
  Play,
  Shield,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/hooks/useSettings';
import type { Language } from '@/i18n';
import type { Page } from '@/types/navigation';

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
}

type CategoryId =
  | 'account'
  | 'appearance'
  | 'eyeComfort'
  | 'accessibility'
  | 'language'
  | 'notifications'
  | 'privacy'
  | 'security'
  | 'playback'
  | 'shorts'
  | 'data'
  | 'support'
  | 'about';

const categories: { id: CategoryId; icon: LucideIcon; tr: string; en: string; descriptionTr: string; descriptionEn: string }[] = [
  { id: 'account', icon: UserRound, tr: 'Hesap ayarları', en: 'Account settings', descriptionTr: 'Profilinize ve hesap işlemlerine erişin.', descriptionEn: 'Access your profile and account actions.' },
  { id: 'appearance', icon: Monitor, tr: 'Görünüm ve tema', en: 'Appearance & theme', descriptionTr: 'Uygulamanın renk temasını kişiselleştirin.', descriptionEn: 'Personalize the app color theme.' },
  { id: 'eyeComfort', icon: Eye, tr: 'Göz konforu modu', en: 'Eye comfort mode', descriptionTr: 'Sıcak tonlar ve daha düşük parlaklık kullanın.', descriptionEn: 'Use warmer tones and a dimmer appearance.' },
  { id: 'accessibility', icon: Accessibility, tr: 'Erişilebilirlik', en: 'Accessibility', descriptionTr: 'Metin boyutunu ve hareket tercihlerini düzenleyin.', descriptionEn: 'Adjust text size and motion preferences.' },
  { id: 'language', icon: Globe2, tr: 'Dil seçenekleri', en: 'Language options', descriptionTr: 'IRONSS arayüz dilini seçin.', descriptionEn: 'Choose the IRONSS interface language.' },
  { id: 'notifications', icon: Bell, tr: 'Bildirim tercihleri', en: 'Notification preferences', descriptionTr: 'Bildirim özelliklerinin kullanılabilirlik durumu.', descriptionEn: 'Availability of notification features.' },
  { id: 'privacy', icon: Shield, tr: 'Gizlilik', en: 'Privacy', descriptionTr: 'Gizlilik politikası ve veri talepleri.', descriptionEn: 'Privacy policy and data requests.' },
  { id: 'security', icon: LockKeyhole, tr: 'Güvenlik', en: 'Security', descriptionTr: 'Hesabınız ve mevcut güvenlik seçenekleri.', descriptionEn: 'Your account and available security options.' },
  { id: 'playback', icon: Play, tr: 'Video oynatma', en: 'Video playback', descriptionTr: 'Video oynatıcı kontrolleri hakkında bilgi.', descriptionEn: 'Information about video player controls.' },
  { id: 'shorts', icon: Clapperboard, tr: 'Shorts tercihleri', en: 'Shorts preferences', descriptionTr: 'Shorts deneyiminin kullanılabilir tercihleri.', descriptionEn: 'Available preferences for the Shorts experience.' },
  { id: 'data', icon: Database, tr: 'Veri kullanımı', en: 'Data usage', descriptionTr: 'Depolama ve ağ kullanımı hakkında bilgi.', descriptionEn: 'Information about storage and network usage.' },
  { id: 'support', icon: CircleHelp, tr: 'Yardım ve destek', en: 'Help & support', descriptionTr: 'IRONSS destek ekibiyle iletişime geçin.', descriptionEn: 'Contact the IRONSS support team.' },
  { id: 'about', icon: FileText, tr: 'Hakkında', en: 'About', descriptionTr: 'IRONSS ve yasal sayfalar hakkında.', descriptionEn: 'About IRONSS and its legal pages.' },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-neon-500' : 'bg-white/15'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs leading-5 text-gray-400">
      {children}
    </p>
  );
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { language, setLanguage } = useLanguage();
  const settings = useSettings();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<CategoryId>('appearance');
  const isEnglish = language === 'en';
  const text = (tr: string, en: string) => isEnglish ? en : tr;
  const active = categories.find((category) => category.id === activeCategory) ?? categories[0];
  const ActiveIcon = active.icon;

  const openPolicy = (path: string) => window.location.assign(path);

  return (
    <div className="mx-auto w-full max-w-[1320px] animate-fade-in">
      <header className="mb-7">
        <p className="eyebrow">{text('Kişisel alanın', 'Your personal space')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
          {text('Ayarlar Merkezi', 'Settings center')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
          {text('IRONSS deneyimini tercihlerinize göre düzenleyin. Değişiklikleriniz bu tarayıcıda saklanır.', 'Personalize your IRONSS experience. Your preferences are saved in this browser.')}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
        <nav aria-label={text('Ayar kategorileri', 'Settings categories')} className="settings-category-list flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {categories.map(({ id, icon: Icon, tr, en, descriptionTr, descriptionEn }) => {
            const selected = id === activeCategory;
            return (
              <button
                type="button"
                key={id}
                onClick={() => setActiveCategory(id)}
                aria-current={selected ? 'page' : undefined}
                className={`flex min-w-[220px] items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors lg:min-w-0 ${
                  selected
                    ? 'border-neon-300/25 bg-neon-300/[0.08]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.13] hover:bg-white/[0.045]'
                }`}
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-neon-300/10 text-neon-200' : 'bg-white/[0.04] text-gray-400'}`}>
                  <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-gray-100">{text(tr, en)}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-gray-500 lg:text-[11px]">{text(descriptionTr, descriptionEn)}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="min-h-[460px] rounded-[26px] border border-white/[0.08] bg-[#121116]/80 p-5 sm:p-7">
          <div className="flex items-start gap-3 border-b border-white/[0.07] pb-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neon-300/15 bg-neon-300/[0.07] text-neon-200">
              <ActiveIcon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">{text(active.tr, active.en)}</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">{text(active.descriptionTr, active.descriptionEn)}</p>
            </div>
          </div>

          {activeCategory === 'account' && (
            <div className="space-y-4 pt-5">
              <Notice>
                {user
                  ? text(`Oturum açık: ${user.email ?? 'hesabınız'}. Profil bilgilerinizi profil sayfasından yönetebilirsiniz.`, `Signed in as ${user.email ?? 'your account'}. Manage your profile on the profile page.`)
                  : text('Hesap ayarlarını yönetmek için giriş yapın.', 'Sign in to manage your account settings.')}
              </Notice>
              <button type="button" onClick={() => onNavigate(user ? 'profile' : 'login')} className="secondary-button h-10 px-4 text-xs">
                {text(user ? 'Profili aç' : 'Giriş yap', user ? 'Open profile' : 'Sign in')}
              </button>
            </div>
          )}

          {activeCategory === 'appearance' && (
            <div className="divide-y divide-white/[0.06] pt-2">
              <SettingRow title={text('Renk teması', 'Color theme')} description={text('Uygulamanın tamamında kullanılır ve tercihiniz kaydedilir.', 'Applied across the app and saved as your preference.')}>
                <div role="group" aria-label={text('Renk teması', 'Color theme')} className="flex rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
                  {(['dark', 'light'] as const).map((theme) => (
                    <button
                      type="button"
                      key={theme}
                      aria-pressed={settings.theme === theme}
                      onClick={() => settings.updateSetting('theme', theme)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${settings.theme === theme ? 'bg-neon-500/20 text-neon-200' : 'text-gray-500 hover:text-gray-200'}`}
                    >
                      {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                      {text(theme === 'dark' ? 'Koyu' : 'Açık', theme === 'dark' ? 'Dark' : 'Light')}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>
          )}

          {activeCategory === 'eyeComfort' && (
            <div className="divide-y divide-white/[0.06] pt-2">
              <SettingRow title={text('Göz konforu modu', 'Eye comfort mode')} description={text('Ekran renklerine daha sıcak bir ton uygular.', 'Adds a warmer tint to screen colors.')}>
                <Toggle checked={settings.eyeComfort} onChange={(value) => settings.updateSetting('eyeComfort', value)} label={text('Göz konforu modunu aç', 'Enable eye comfort mode')} />
              </SettingRow>
              <SettingRow title={text('Parlaklığı azalt', 'Reduce brightness')} description={text('Tüm arayüzün üzerine hafif bir karartma uygular.', 'Applies a subtle dimming layer across the interface.')}>
                <Toggle checked={settings.reducedBrightness} onChange={(value) => settings.updateSetting('reducedBrightness', value)} label={text('Azaltılmış parlaklığı aç', 'Enable reduced brightness')} />
              </SettingRow>
            </div>
          )}

          {activeCategory === 'accessibility' && (
            <div className="divide-y divide-white/[0.06] pt-2">
              <SettingRow title={text('Yazı boyutu', 'Text size')} description={text('Arayüz metinlerini büyütür veya küçültür.', 'Scales interface text and layout.')}>
                <div role="group" aria-label={text('Yazı boyutu', 'Text size')} className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
                  {(['small', 'normal', 'large'] as const).map((size) => (
                    <button type="button" key={size} aria-pressed={settings.fontSize === size} onClick={() => settings.updateSetting('fontSize', size)} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${settings.fontSize === size ? 'bg-neon-500/20 text-neon-200' : 'text-gray-500 hover:text-gray-200'}`}>
                      {text(size === 'small' ? 'Küçük' : size === 'normal' ? 'Normal' : 'Büyük', size === 'small' ? 'Small' : size === 'normal' ? 'Default' : 'Large')}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow title={text('Animasyonları azalt', 'Reduce motion')} description={text('Arayüz animasyonlarını ve geçişleri en aza indirir.', 'Minimizes interface animations and transitions.')}>
                <Toggle checked={settings.reduceMotion} onChange={(value) => settings.updateSetting('reduceMotion', value)} label={text('Animasyonları azalt', 'Reduce motion')} />
              </SettingRow>
            </div>
          )}

          {activeCategory === 'language' && (
            <div className="divide-y divide-white/[0.06] pt-2">
              <SettingRow title={text('Arayüz dili', 'Interface language')} description={text('Dil tercihi mevcut dil sistemiyle kaydedilir.', 'Your choice is saved by the existing language system.')}>
                <div role="group" aria-label={text('Arayüz dili', 'Interface language')} className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
                  {(['tr', 'en'] as const satisfies readonly Language[]).map((nextLanguage) => (
                    <button type="button" key={nextLanguage} aria-pressed={language === nextLanguage} onClick={() => setLanguage(nextLanguage)} className={`rounded-lg px-4 py-2 text-xs font-bold ${language === nextLanguage ? 'bg-neon-500/20 text-neon-200' : 'text-gray-500 hover:text-gray-200'}`}>
                      {nextLanguage === 'tr' ? 'Türkçe' : 'English'}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>
          )}

          {activeCategory === 'notifications' && (
            <div className="pt-5">
              <Notice>{text('IRONSS bildirimleri şu anda etkin değil. Bildirim akışı ve bildirim tercihlerini kaydeden bir sistem bulunmadığından burada açma-kapama seçeneği sunulmuyor.', 'IRONSS notifications are not currently active. There is no notification feed or preference storage, so notification toggles are not shown here.')}</Notice>
              <button type="button" onClick={() => onNavigate('notifications')} className="secondary-button mt-4 h-10 px-4 text-xs">
                {text('Bildirim merkezini görüntüle', 'View notification center')}
              </button>
            </div>
          )}

          {activeCategory === 'privacy' && (
            <div className="space-y-4 pt-5">
              <Notice>{text('Gizlilik tercihleri için politika metnini inceleyebilir, veri taleplerinizi destek adresine iletebilirsiniz. Uygulamada ayrıca yönetilebilen bir izleme/çerez ayarı bulunmuyor.', 'Review the privacy policy and contact support for data requests. There are no additional tracking or cookie controls in the app.')}</Notice>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => openPolicy('/privacy-policy')} className="secondary-button h-10 px-4 text-xs">{text('Gizlilik Politikası', 'Privacy Policy')}<ExternalLink className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => window.location.assign('mailto:ironss.support@gmail.com')} className="secondary-button h-10 px-4 text-xs">{text('Veri talebi gönder', 'Submit a data request')}</button>
              </div>
            </div>
          )}

          {activeCategory === 'security' && (
            <div className="space-y-4 pt-5">
              <Notice>{text('Kimlik doğrulama Supabase Auth üzerinden yürütülür. Bu sürümde parola değiştirme, iki adımlı doğrulama veya etkin oturumları yönetme arayüzü sunulmuyor.', 'Authentication is handled by Supabase Auth. This version does not provide password changes, two-factor authentication, or active session management controls.')}</Notice>
              <button type="button" onClick={() => onNavigate(user ? 'profile' : 'login')} className="secondary-button h-10 px-4 text-xs">{text(user ? 'Hesap profilini aç' : 'Giriş yap', user ? 'Open account profile' : 'Sign in')}</button>
            </div>
          )}

          {activeCategory === 'playback' && (
            <div className="pt-5">
              <Notice>{text('Video oynatma hızı ve ses düzeyi video oynatıcı kontrollerinden ayarlanabilir. Bu değerler için kalıcı bir varsayılan tercih henüz desteklenmiyor.', 'Playback speed and volume can be adjusted in the video player. Persistent default preferences for these values are not currently supported.')}</Notice>
            </div>
          )}

          {activeCategory === 'shorts' && (
            <div className="divide-y divide-white/[0.06] pt-2">
              <SettingRow title={text('Shorts sessiz başlasın', 'Start Shorts muted')} description={text('Shorts videoları açıldığında varsayılan ses durumunu belirler.', 'Sets the default audio state when a Short opens.')}>
                <Toggle checked={settings.shortsStartMuted} onChange={(value) => settings.updateSetting('shortsStartMuted', value)} label={text('Shorts sessiz başlasın', 'Start Shorts muted')} />
              </SettingRow>
              <Notice>{text('Otomatik oynatma tercihi tarayıcı ve cihaz kısıtlamalarına bağlıdır; ayrı bir oynatma kontrolü olarak sunulmaz.', 'Autoplay is subject to browser and device restrictions and is not exposed as a separate preference.')}</Notice>
            </div>
          )}

          {activeCategory === 'data' && (
            <div className="pt-5">
              <Notice>{text('Videolar ve profil içerikleri Supabase üzerinden yüklenir. Uygulamada veri tasarrufu modu, kalite seçimi veya önbellek yönetimi bulunmuyor; bu nedenle çalışmayan kontroller gösterilmiyor.', 'Videos and profile content are served through Supabase. The app does not currently provide data saver, quality selection, or cache management controls.')}</Notice>
            </div>
          )}

          {activeCategory === 'support' && (
            <div className="space-y-4 pt-5">
              <Notice>{text('Sorularınız veya destek talepleriniz için bize e-posta gönderin.', 'Email us with questions or support requests.')}</Notice>
              <a href="mailto:ironss.support@gmail.com" className="secondary-button h-10 px-4 text-xs">ironss.support@gmail.com</a>
            </div>
          )}

          {activeCategory === 'about' && (
            <div className="space-y-4 pt-5">
              <Notice>{text('IRONSS — videoları keşfet, kendi kanalını oluştur ve toplulukla paylaş.', 'IRONSS — discover videos, create your channel, and share with the community.')}</Notice>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => openPolicy('/privacy-policy')} className="secondary-button h-10 px-4 text-xs">{text('Gizlilik Politikası', 'Privacy Policy')}</button>
                <button type="button" onClick={() => openPolicy('/terms')} className="secondary-button h-10 px-4 text-xs">{text('Kullanım Şartları', 'Terms of Use')}</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
