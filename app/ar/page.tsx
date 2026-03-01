import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Noto_Sans_Arabic } from "next/font/google";
import { FaqAccordion } from "../components/landing/faq";
import { CtaButton } from "../components/landing/cta-button";
import { StickyWhatsAppCta } from "../components/landing/sticky-whatsapp-cta";

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "غالي — مساعدك الذكي على واتساب",
  description:
    "غالي مساعد ذكاء اصطناعي على واتساب. محادثة، توليد صور، تحليل وثائق والمزيد. لا تطبيق للتثبيت — فقط أرسل رسالة وأنجز مهامك.",
  alternates: {
    canonical: "https://ghali.ae/ar",
    languages: {
      en: "https://ghali.ae",
      ar: "https://ghali.ae/ar",
    },
  },
  openGraph: {
    title: "غالي — مساعدك الذكي على واتساب",
    description:
      "لا تطبيق للتثبيت. لا حساب للإنشاء. فقط راسل غالي على واتساب وأنجز مهامك.",
    url: "https://ghali.ae/ar",
    locale: "ar_AE",
    images: [
      {
        url: "/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
        alt: "غالي — مساعد ذكاء اصطناعي على واتساب",
      },
    ],
  },
};

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";

const FAQS_AR = [
  {
    question: "هل أحتاج إلى تثبيت أي شيء؟",
    answer: "لا. يعمل غالي بالكامل عبر واتساب. فقط أرسل رسالة.",
  },
  {
    question: "هل بياناتي آمنة؟",
    answer:
      'نعم. لا نبيع بياناتك أو نشاركها مع أحد. يمكنك حذف كل شيء في أي وقت عن طريق إرسال "احذف كل شيء".',
  },
  {
    question: "ما اللغات التي يتحدثها غالي؟",
    answer:
      "يكتشف غالي لغتك تلقائياً. اللغتان العربية والإنجليزية مدعومتان بالكامل، مع توفر العديد من اللغات الأخرى.",
  },
  {
    question: "ما نماذج الذكاء الاصطناعي التي يستخدمها غالي؟",
    answer:
      "يستخدم غالي أفضل نماذج الذكاء الاصطناعي بما في ذلك Google Gemini وAnthropic Claude وOpenAI — ويختار تلقائياً الأنسب لكل مهمة.",
  },
  {
    question: "هل يمكنني تجربته مجاناً؟",
    answer:
      "نعم! تمنحك الخطة الأساسية 60 رسالة مجانية كل شهر. لا بطاقة ائتمان مطلوبة.",
  },
  {
    question: "كيف أترقى إلى الخطة الاحترافية؟",
    answer: 'أرسل "upgrade" إلى غالي على واتساب واتبع الرابط.',
  },
];

export default function ArabicHome() {
  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${notoArabic.variable} font-[family-name:var(--font-arabic)] relative min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden`}
    >
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <ArNav />
      <ArHero />
      <ArStrengths />
      <ArHowItWorks />
      <ArCapabilities />
      <ArPricing />
      <ArFaqSection />
      <ArFinalCta />
      <ArFooter />
      <StickyWhatsAppCta />
    </div>
  );
}

/* ─── Nav ─────────────────────────────────────────── */

function ArNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/ar" className="flex items-center gap-3">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="غالي"
            width={36}
            height={36}
          />
          <span className="text-xl font-semibold tracking-tight">غالي</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hidden text-sm text-white/40 transition-colors hover:text-white sm:block"
            lang="en"
          >
            EN
          </Link>
          <CtaButton
            href={WHATSAPP_URL}
            location="ar_nav"
            className="group flex items-center gap-2 rounded-full bg-[#ED6B23] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
          >
            <WhatsAppIcon className="h-4 w-4" />
            ابدأ المحادثة
          </CtaButton>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────── */

function ArHero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center px-6">
      {/* Orange glow */}
      <div className="animate-pulse-glow pointer-events-none absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED6B23]/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="animate-fade-up animate-float mx-auto mb-10 w-fit">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="غالي"
            width={120}
            height={120}
            priority
          />
        </div>

        <h1 className="animate-fade-up delay-100 text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          مساعدك الذكي
          <br />
          <span className="text-[#ED6B23]">على واتساب</span>
        </h1>

        <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-xl text-lg text-white/50 sm:text-xl leading-relaxed">
          لا تطبيق للتثبيت. لا حساب للإنشاء.
          <br className="hidden sm:block" /> فقط راسل غالي وأنجز مهامك.
        </p>

        <div className="animate-fade-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <CtaButton
            href={WHATSAPP_URL}
            location="ar_hero"
            className="group flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
            ابدأ المحادثة
            <span className="transition-transform group-hover:-translate-x-1">
              &larr;
            </span>
          </CtaButton>
          <span className="text-sm text-white/30">مجاني · لا يلزم تسجيل</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Key Strengths ───────────────────────────────── */

function ArStrengths() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <ArSectionLabel>لماذا غالي</ArSectionLabel>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 — Just Message */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] lg:col-span-2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <MessageIcon />
            </div>
            <h3 className="text-2xl font-bold">فقط أرسل رسالة. هذا كل شيء.</h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              لا تطبيق. لا حساب. لا كلمة مرور. افتح واتساب، قل مرحبا، وانتهى
              الأمر.
            </p>
          </div>

          {/* Card 2 — Gets Smarter */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <BrainIcon />
            </div>
            <h3 className="text-2xl font-bold">يصبح أذكى كلما استخدمته</h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              غالي يتذكر تفضيلاتك وسياقك وأسلوبك. إنه لا يبدأ من الصفر في كل
              مرة.
            </p>
          </div>

          {/* Card 3 — Privacy */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <ShieldIcon />
            </div>
            <h3 className="text-2xl font-bold">معلوماتك تبقى لك</h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              نحن لا نبيع بياناتك. يمكنك رؤية كل ما يعرفه غالي عنك، وحذفها في
              أي وقت.
            </p>
          </div>

          {/* Card 4 — ProWrite */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              ✍️
            </div>
            <h3 className="text-2xl font-bold">كتابة احترافية، 8 نماذج ذكاء اصطناعي</h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              قل &ldquo;prowrite&rdquo; ويبحث غالي ويصيغ ويصقل محتواك عبر
              خط إنتاج متعدد النماذج.
            </p>
          </div>

          {/* Card 5 — Track Everything */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <ClipboardIcon />
            </div>
            <h3 className="text-2xl font-bold">تتبع كل شيء في مكان واحد</h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              المصاريف والمهام وجهات الاتصال والملاحظات — فقط أخبر غالي وينظم
              كل شيء.
            </p>
          </div>

          {/* Card 6 — Scheduled Tasks */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] md:col-span-2 lg:col-span-3">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
                  <CalendarClockIcon />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold">ذكاء اصطناعي يعمل وفق جدولك</h3>
                <p className="mt-3 text-white/50 leading-relaxed">
                  حدد مهامك ويقوم غالي بتنفيذها تلقائياً — إحاطات صباحية،
                  تذكيرات، تقارير متكررة، كلها تُرسل إلى واتساب.
                </p>
              </div>
            </div>
          </div>

          {/* Card 7 — One Assistant */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] lg:col-span-3">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <SparklesIcon />
            </div>
            <h3 className="text-2xl font-bold">مساعد واحد، كل ما تحتاجه</h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              اطرح سؤالاً. حلل وثيقة. اكتب بريداً إلكترونياً. أنشئ صورة. غالي
              يتولى كل شيء — ويختار أفضل أسلوب تلقائياً.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: "🔍", title: "تحليل أي شيء", desc: "تقارير، بيانات، بحوث" },
                { icon: "📋", title: "تخطيط واستراتيجية", desc: "أهداف، خطط، هيكلة" },
                { icon: "✍️", title: "كتابة رائعة", desc: "بريد، مقترحات، منشورات" },
                { icon: "🎨", title: "إنشاء صور", desc: "فن، شعارات، مرئيات" },
              ].map((uc) => (
                <div
                  key={uc.title}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center"
                >
                  <div className="text-2xl">{uc.icon}</div>
                  <div className="mt-2 text-sm font-semibold">{uc.title}</div>
                  <div className="mt-1 text-xs text-white/40">{uc.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 8 — Open Source */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] lg:col-span-3">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
                  <CodeIcon />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold">مبني في الفضاء المفتوح</h3>
                <p className="mt-3 text-white/50 leading-relaxed">
                  كودنا عام للجميع. لا داعي لأخذنا على كلامنا.{" "}
                  <a
                    href="https://github.com/ZenGardenDubai/ghali-ai-assistant"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#ED6B23]"
                  >
                    عرض على GitHub &larr;
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────── */

function ArHowItWorks() {
  const steps = [
    {
      num: "١",
      title: "راسل غالي على واتساب",
      desc: "افتح واتساب وأرسل رسالتك الأولى. لا تسجيل، لا تنزيل.",
    },
    {
      num: "٢",
      title: "اسأل عن أي شيء",
      desc: "أسئلة، مهام، صور، وثائق — أي شيء تحتاج مساعدة فيه.",
    },
    {
      num: "٣",
      title: "احصل على أفضل إجابة، فوراً",
      desc: "غالي يختار أذكى نموذج ذكاء اصطناعي للمهمة ويستجيب في ثوانٍ.",
    },
  ];

  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <ArSectionLabel>كيف يعمل</ArSectionLabel>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.num} className="relative">
              <span className="text-6xl font-bold text-[#ED6B23]/20">
                {step.num}
              </span>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-white/50 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Capabilities ────────────────────────────────── */

function ArCapabilities() {
  const items = [
    { icon: "💬", title: "الإجابة على الأسئلة", desc: "من الحقائق السريعة إلى البحث المعمق" },
    { icon: "📄", title: "تحليل الوثائق", desc: "أرسل ملف PDF، احصل على رؤى فورية" },
    { icon: "🖼️", title: "توليد الصور", desc: "صف ما تريد، احصل عليه في ثوانٍ" },
    { icon: "🎤", title: "فهم الرسائل الصوتية", desc: "فقط تحدث، غالي يستمع" },
    { icon: "🧠", title: "تذكر كل شيء", desc: "تفضيلاتك وسياقك وتاريخك" },
    { icon: "📊", title: "تتبع المصاريف والمهام", desc: "مصاريف، مهام، جهات اتصال، ملاحظات — كل شيء منظم" },
    { icon: "⏰", title: "المهام المجدولة", desc: "تذكيرات وإحاطات ومهام ذكاء اصطناعي متكررة" },
    { icon: "✍️", title: "الكتابة الاحترافية", desc: "خط إنتاج متعدد النماذج للمحتوى المصقول" },
    { icon: "🌍", title: "تحدث بلغتك", desc: "عربي وإنجليزي والمزيد" },
  ];

  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <ArSectionLabel>ما يمكن لغالي فعله</ArSectionLabel>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]"
            >
              <span className="shrink-0 text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-white/50">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────── */

function ArPricing() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <ArSectionLabel>الأسعار</ArSectionLabel>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:max-w-3xl md:mx-auto">
          {/* Basic */}
          <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
              أساسي
            </h3>
            <div className="mt-4 text-5xl font-bold">مجاني</div>
            <ul className="mt-8 space-y-3 text-white/60">
              <ArPricingItem>60 رسالة شهرياً</ArPricingItem>
              <ArPricingItem>توليد الصور</ArPricingItem>
              <ArPricingItem>فهم الصوت والفيديو</ArPricingItem>
              <ArPricingItem>تحليل الوثائق وقاعدة المعرفة</ArPricingItem>
              <ArPricingItem>تتبع المصاريف والمهام والمزيد</ArPricingItem>
              <ArPricingItem>التفكير العميق للأسئلة الصعبة</ArPricingItem>
              <ArPricingItem>المهام المجدولة والتذكيرات</ArPricingItem>
              <ArPricingItem>تعلم أسلوبك وتفضيلاتك</ArPricingItem>
              <ArPricingItem>لا بطاقة ائتمان مطلوبة</ArPricingItem>
            </ul>
            <CtaButton
              href={WHATSAPP_URL}
              location="ar_pricing_basic"
              className="mt-8 block rounded-full border border-white/10 py-3 text-center font-semibold transition-all hover:border-white/20 hover:bg-white/5"
            >
              ابدأ الآن
            </CtaButton>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border border-[#ED6B23]/40 bg-[#ED6B23]/[0.04] p-8">
            <div className="absolute -top-3 left-6 rounded-full bg-[#ED6B23] px-3 py-1 text-xs font-bold uppercase tracking-wider">
              الأكثر شعبية
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
              احترافي
            </h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-bold">$9.99</span>
              <span className="text-white/40">/شهر</span>
            </div>
            <p className="mt-1 text-sm text-[#ED6B23]/70">
              AED 36.99/شهر
            </p>
            <p className="mt-1 text-sm text-white/40">
              أو $99.48/سنة · AED 365/سنة (وفر 17%)
            </p>
            <ul className="mt-8 space-y-3 text-white/60">
              <ArPricingItem highlight>600 رسالة شهرياً (10 أضعاف الأساسي)</ArPricingItem>
              <ArPricingItem highlight>نفس المميزات، مساحة أكبر للاستخدام</ArPricingItem>
              <ArPricingItem highlight>كل ما في الخطة الأساسية</ArPricingItem>
            </ul>
            <CtaButton
              href={WHATSAPP_URL}
              location="ar_pricing_pro"
              className="mt-8 md:mt-auto block rounded-full bg-[#ED6B23] py-3 text-center font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
            >
              ابدأ الآن
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArPricingItem({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <svg
        className={`h-4 w-4 shrink-0 ${highlight ? "text-[#ED6B23]" : "text-white/30"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}

/* ─── FAQ ─────────────────────────────────────────── */

function ArFaqSection() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-3xl">
        <ArSectionLabel>الأسئلة الشائعة</ArSectionLabel>

        <div className="mt-12">
          <FaqAccordion items={FAQS_AR} />
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────── */

function ArFinalCta() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Orange glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold sm:text-5xl">
          هل أنت مستعد لتجربة <span className="text-[#ED6B23]">غالي</span>؟
        </h2>
        <p className="mt-4 text-lg text-white/50">أرسل رسالة. الأمر بهذه البساطة.</p>
        <CtaButton
          href={WHATSAPP_URL}
          location="ar_final_cta"
          className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
        >
          <WhatsAppIcon className="h-5 w-5" />
          ابدأ المحادثة
          <span className="transition-transform group-hover:-translate-x-1">
            &larr;
          </span>
        </CtaButton>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────── */

function ArFooter() {
  return (
    <footer className="border-t border-white/5 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-6 text-sm text-white/40 sm:flex-row">
        <Link href="/ar" className="flex items-center gap-3">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="غالي"
            width={24}
            height={24}
          />
          <span className="font-semibold text-white">ghali.ae</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/feedback" className="transition-colors hover:text-white">تعليقات</Link>
          <Link href="/privacy" className="transition-colors hover:text-white">سياسة الخصوصية</Link>
          <Link href="/terms" className="transition-colors hover:text-white">شروط الخدمة</Link>
          <Link href="/" className="transition-colors hover:text-white" lang="en">English</Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl py-8 text-center text-sm text-white/30 space-y-2">
        <p>&copy; 2026 SAHEM DATA TECHNOLOGY. جميع الحقوق محفوظة.</p>
        <p>ghali.ae منتج من SAHEM DATA TECHNOLOGY، دبي، الإمارات العربية المتحدة</p>
        <p>صُنع بـ ❤️ في الإمارات 🇦🇪</p>
      </div>
    </footer>
  );
}

/* ─── Shared Components ───────────────────────────── */

function ArSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px w-8 bg-[#ED6B23]" />
      <span className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
        {children}
      </span>
    </div>
  );
}

/* ─── Icons ───────────────────────────────────────── */

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-11.25 5.25l-1.5 1.5V5.25A2.25 2.25 0 016.375 3h11.25a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25H8.25l-3.375 3z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function CalendarClockIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v4.5m-9-4.5h.008v.008H12V7.5zm0 3h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zm-3-6h.008v.008H9V7.5zm0 3h.008v.008H9v-.008zm0 3h.008v.008H9v-.008zm9.75 3a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm-2.25-.75l-.75.75" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}
