import { ArrowLeft, Shield } from 'lucide-react';

const sections = [
  {
    title: '1. Genel Bilgilendirme',
    content: (
      <>
        <p>
          IRONSS, kullanıcıların video paylaşabildiği, izleyebildiği ve içerik
          üreticileriyle etkileşim kurabildiği bir sosyal medya platformudur.
        </p>
        <p>
          Bu Gizlilik Politikası, IRONSS kullanılırken hangi kişisel verilerin
          işlenebileceğini, bunların hangi amaçlarla kullanıldığını ve
          kullanıcıların gizlilik haklarını açıklar.
        </p>
        <p>
          <strong>Platform iletişim adresi:</strong>{' '}
          <a href="mailto:ironss.support@gmail.com">ironss.support@gmail.com</a>
        </p>
        <p>
          <strong>Platformun veri sorumlusu/işleticisi:</strong>{' '}
          <span className="text-neon-200">[Yasal olarak belirlenecek kişi veya kuruluş]</span>
        </p>
      </>
    ),
  },
  {
    title: '2. Toplanan Veriler',
    content: (
      <>
        <p>Platformun mevcut özellikleri kapsamında aşağıdaki veriler işlenebilir:</p>
        <ul>
          <li><strong>Hesap bilgileri:</strong> Kullanıcı adı, e-posta adresi ve hesap kimliği.</li>
          <li><strong>Profil bilgileri:</strong> Profil fotoğrafı ve hesap oluşturma/güncelleme zamanları.</li>
          <li><strong>Video bilgileri:</strong> Video başlığı, açıklaması, dosya konumu, dosya boyutu, dosya türü ve yüklenme zamanı.</li>
          <li><strong>Etkileşim bilgileri:</strong> Clips beğenileri, yorumları ve kanal bağlantıları. Uzun videolardaki beğeni, yorum, beğenmeme ve kaydetme tercihleri yalnızca kullandığınız tarayıcıda saklanır.</li>
          <li><strong>İzlenme bilgileri:</strong> İzlenen video, izlenme zamanı ve giriş yapmış kullanıcılar için kullanıcı kimliği.</li>
        </ul>
        <p>
          Şifreler IRONSS&apos;un profil tablosunda tutulmaz; kimlik doğrulama
          işlemleri Supabase Auth üzerinden yürütülür.
        </p>
      </>
    ),
  },
  {
    title: '3. Verilerin Kullanım Amaçları',
    content: (
      <>
        <p>Veriler aşağıdaki amaçlarla kullanılabilir:</p>
        <ul>
          <li>Kullanıcı hesaplarının oluşturulması ve yönetilmesi.</li>
          <li>Video yükleme ve görüntüleme özelliklerinin çalıştırılması.</li>
          <li>Beğeni, yorum ve kanal bağlantısı işlemlerinin gerçekleştirilmesi.</li>
          <li>Video izlenme sayılarının hesaplanması.</li>
          <li>Platform güvenliğinin ve işleyişinin desteklenmesi.</li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Verilerin Saklanması ve Kullanılan Hizmetler',
    content: (
      <>
        <p>
          IRONSS&apos;un mevcut teknik altyapısında Supabase kullanılmaktadır.
          Hesap, profil, video ve etkileşim verileri ilgili Supabase
          hizmetlerinde saklanabilir.
        </p>
        <p>Platform Cloudflare Pages üzerinden yayınlanmaktadır.</p>
        <p>
          Profil fotoğrafları ve video dosyaları herkese açık depolama
          alanlarında tutulabildiğinden, yüklenen içeriklerin bağlantısına sahip
          kişiler bu içerikleri görüntüleyebilir.
        </p>
      </>
    ),
  },
  {
    title: '5. Yerel Depolama',
    content: (
      <>
        <p>Platformun bazı özellikleri tarayıcının yerel depolama alanını kullanır.</p>
        <p>Örneğin:</p>
        <ul>
          <li>Dil tercihi.</li>
          <li>Standart videolara ait bazı beğeni ve yorum bilgileri.</li>
          <li>Supabase Auth oturum bilgileri.</li>
        </ul>
        <p>
          Tarayıcı ayarlarından yerel depolama verileri silinebilir. Ancak bu
          işlem sunucuda saklanan verileri otomatik olarak silmez.
        </p>
      </>
    ),
  },
  {
    title: '6. Verilerin Paylaşılması',
    content: (
      <>
        <p>
          Veriler, platformun çalışması için kullanılan teknik hizmet
          sağlayıcılarıyla işlenebilir.
        </p>
        <p>
          IRONSS, mevcut uygulamada harici reklam veya pazarlama takip sistemi
          kullanmamaktadır. Bu durum, altyapı sağlayıcılarının kendi teknik
          kayıtlarının bulunmadığı anlamına gelmez.
        </p>
      </>
    ),
  },
  {
    title: '7. Kullanıcı Hakları ve Veri Talepleri',
    content: (
      <>
        <p>
          Kullanıcılar hesaplarıyla ilişkili kişisel veriler hakkında bilgi
          almak, düzeltme veya silme talebinde bulunmak için iletişim adresine
          başvurabilir.
        </p>
        <p>
          Talepler, başvuran kişinin kimliği ve uygulanabilir mevzuat dikkate
          alınarak değerlendirilir.
        </p>
        <p>
          <strong>E-posta:</strong>{' '}
          <a href="mailto:ironss.support@gmail.com">ironss.support@gmail.com</a>
        </p>
      </>
    ),
  },
  {
    title: '8. Hesap Kapatma ve Veri Silme',
    content: (
      <>
        <p>
          Platformun mevcut sürümünde kullanıcıların kendi hesaplarını tamamen
          silebildiği otomatik bir hesap silme özelliği bulunmamaktadır.
        </p>
        <p>
          Veri silme veya hesap kapatma talepleri iletişim adresi üzerinden
          iletilebilir. Taleplerin nasıl yerine getirileceği ve hangi verilerin
          ne kadar süre saklanacağı, uygulanabilir yükümlülükler dikkate
          alınarak belirlenir.
        </p>
      </>
    ),
  },
  {
    title: '9. Politika Değişiklikleri',
    content: (
      <p>
        Bu politika, platformun özellikleri veya veri işleme uygulamaları
        değiştikçe güncellenebilir. Güncel sürüm bu sayfada yayımlanır.
      </p>
    ),
  },
  {
    title: '10. İletişim',
    content: (
      <>
        <p>Gizlilik ve kişisel verilerle ilgili sorularınız için:</p>
        <p><a href="mailto:ironss.support@gmail.com">ironss.support@gmail.com</a></p>
      </>
    ),
  },
];

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen px-4 pb-10 pt-5 text-gray-100 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex items-center justify-between border-b border-white/[0.08] pb-5">
          <a href="/" aria-label="IRONSS ana sayfa" className="group flex items-center gap-3">
            <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-[14px]">
              <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
                <path d="M10 9h20v5H15v5h15v12H10v-5h15v-2H10V9Z" fill="currentColor" />
                <path d="M10 9v22" stroke="white" strokeOpacity=".36" strokeWidth="1.5" />
              </svg>
            </span>
            <span className="text-[17px] font-extrabold tracking-[0.2em] text-white">
              IRON<span className="text-neon-300">SS</span>
            </span>
          </a>
          <a
            href="/"
            className="secondary-button h-10 px-3 text-xs sm:px-4 sm:text-sm"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            <span>Ana sayfaya dön</span>
          </a>
        </header>

        <main className="py-8 sm:py-12">
          <section className="relative overflow-hidden rounded-[26px] border border-neon-300/15 bg-gradient-to-br from-neon-500/[0.12] via-[#17141e] to-[#121116] p-6 shadow-[0_24px_70px_-48px_rgba(190,123,255,0.65)] sm:p-9">
            <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full border border-neon-300/10" />
            <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border border-neon-300/[0.08]" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-neon-300/15 bg-neon-300/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neon-200">
                <Shield aria-hidden="true" className="h-3.5 w-3.5" />
                IRONSS
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
                Gizlilik Politikası
              </h1>
              <p className="mt-3 text-sm text-gray-400">
                Son güncelleme: 31 Ekim 2026
              </p>
            </div>
          </section>

          <div className="mt-6 rounded-2xl border border-neon-300/15 bg-neon-300/[0.045] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-neon-200">
              Veri sorumlusu / platform işleticisi
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              [Yasal olarak belirlenecek kişi veya kuruluş]
            </p>
          </div>

          <div className="mt-8 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#121116]/80 px-5 sm:px-8">
            {sections.map(({ title, content }) => (
              <section key={title} className="py-6 sm:py-7">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                  {title}
                </h2>
                <div className="policy-copy mt-4 space-y-3 text-sm leading-7 text-gray-400 sm:text-[15px]">
                  {content}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-5 text-xs leading-6 text-gray-400 sm:p-6 sm:text-sm">
            Bu metin ilk taslaktır. Yayınlanmadan önce platformun yasal
            işletmecisi ve veri sorumlusu belirlenmeli, uygulamanın gerçek
            işleyişiyle karşılaştırılmalı ve uygun hukuki incelemeden
            geçirilmelidir.
          </p>
        </main>

        <footer className="border-t border-white/[0.08] pt-5 text-center text-xs text-gray-500">
          © IRONSS
        </footer>
      </div>
    </div>
  );
}
