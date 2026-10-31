import { ArrowLeft, Shield } from 'lucide-react';

const sections = [
  {
    title: '1. Genel Bilgilendirme',
    content: (
      <>
        <p>
          IRONSS, kullanıcıların video paylaşmasına, içerik izlemesine ve diğer
          kullanıcılarla etkileşim kurmasına olanak sağlayan bir sosyal medya
          platformudur.
        </p>
        <p>
          Platformu kullanarak bu Kullanım Şartları&apos;nı okuduğunuzu ve
          bunlara uymayı kabul ettiğinizi belirtirsiniz.
        </p>
      </>
    ),
  },
  {
    title: '2. Hesap Oluşturma',
    content: (
      <ul>
        <li>Kullanıcılar hesap oluştururken doğru ve kendilerine ait bilgiler kullanmalıdır.</li>
        <li>Her kullanıcı kendi hesabının güvenliğinden sorumludur.</li>
        <li>Başka kişilerin hesaplarına izinsiz erişim sağlanamaz.</li>
        <li>Başka bir kişiyi taklit etmek veya yanıltıcı hesap oluşturmak yasaktır.</li>
      </ul>
    ),
  },
  {
    title: '3. İçerik Paylaşımı',
    content: (
      <>
        <p>
          Kullanıcılar IRONSS üzerinden video, başlık, açıklama, profil fotoğrafı
          ve yorum paylaşabilir.
        </p>
        <p>Paylaşılan içeriklerden öncelikle içeriği yükleyen kullanıcı sorumludur.</p>
        <p>Kullanıcılar:</p>
        <ul>
          <li>Başkalarının telif haklarını ihlal eden içerikler paylaşmamalıdır.</li>
          <li>İzinsiz kişisel bilgileri veya özel görüntüleri yayımlamamalıdır.</li>
          <li>Başka kişileri hedef alan tehdit, taciz veya zorbalık içerikleri paylaşmamalıdır.</li>
          <li>Dolandırıcılık veya yanıltma amacı taşıyan içerikler yayımlamamalıdır.</li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Yasaklı Kullanımlar',
    content: (
      <>
        <p>IRONSS aşağıdaki amaçlarla kullanılamaz:</p>
        <ul>
          <li>Dolandırıcılık ve kimlik taklidi.</li>
          <li>Spam ve kötüye kullanım.</li>
          <li>Başka kullanıcıları tehdit etme veya taciz etme.</li>
          <li>Zararlı yazılım veya kötü amaçlı bağlantı paylaşma.</li>
          <li>Platformun güvenliğini veya işleyişini bozma girişimleri.</li>
          <li>Hukuka aykırı içeriklerin paylaşılması.</li>
        </ul>
      </>
    ),
  },
  {
    title: '5. Telif Hakları',
    content: (
      <>
        <p>Kullanıcılar yalnızca paylaşma hakkına sahip oldukları içerikleri yüklemelidir.</p>
        <p>
          Telif hakkı ihlali olduğu düşünülen içerikler için IRONSS iletişim
          adresine bildirim gönderilebilir.
        </p>
        <p>Bildirimler değerlendirilir ve gerekli işlemler uygulanabilir.</p>
      </>
    ),
  },
  {
    title: '6. Kullanıcı Etkileşimleri',
    content: (
      <>
        <p>
          Kullanıcılar videoları beğenebilir, yorum yapabilir ve kanallara abone
          olabilir.
        </p>
        <p>
          Yorumlarda saygılı bir dil kullanılmalıdır. Spam, taciz, tehdit ve
          yanıltıcı içeriklere izin verilmez.
        </p>
      </>
    ),
  },
  {
    title: '7. İçeriklerin Yönetimi',
    content: (
      <>
        <p>IRONSS, bu şartları ihlal ettiği bildirilen içerikleri inceleyebilir.</p>
        <p>
          İhlal tespit edilmesi durumunda içeriğin kaldırılması veya ilgili hesap
          hakkında uygun işlem yapılması değerlendirilebilir.
        </p>
      </>
    ),
  },
  {
    title: '8. Hizmetin Değiştirilmesi',
    content: (
      <>
        <p>
          IRONSS, platform özelliklerini geliştirebilir, değiştirebilir veya
          geçici olarak kullanıma kapatabilir.
        </p>
        <p>Önemli değişiklikler kullanıcılarla paylaşılabilir.</p>
      </>
    ),
  },
  {
    title: '9. Hesap ve Veri Talepleri',
    content: (
      <>
        <p>
          Hesap kapatma, veri silme ve diğer hesap talepleri için kullanıcılar
          destek adresine başvurabilir.
        </p>
        <p>
          <strong>Destek e-postası:</strong>{' '}
          <a href="mailto:ironss.support@gmail.com">ironss.support@gmail.com</a>
        </p>
      </>
    ),
  },
  {
    title: '10. İletişim',
    content: (
      <>
        <p>Kullanım Şartları hakkında sorularınız için:</p>
        <p>
          <a href="mailto:ironss.support@gmail.com">ironss.support@gmail.com</a>
        </p>
      </>
    ),
  },
];

export function TermsPage() {
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
          <a href="/" className="secondary-button h-10 px-3 text-xs sm:px-4 sm:text-sm">
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
                Kullanım Şartları
              </h1>
              <p className="mt-3 text-sm text-gray-400">
                Son güncelleme: 31 Ekim 2026
              </p>
            </div>
          </section>

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
            Bu metin ilk taslaktır. Yayınlanmadan önce platformun gerçek
            özellikleri, yasal işletmecisi ve uygulanabilir mevzuat bakımından
            incelenmelidir.
          </p>
        </main>

        <footer className="border-t border-white/[0.08] pt-5 text-center text-xs text-gray-500">
          © IRONSS
        </footer>
      </div>
    </div>
  );
}
