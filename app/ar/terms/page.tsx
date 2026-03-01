import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "شروط الخدمة — غالي",
  description:
    "شروط الخدمة لـ ghali.ae — حقوقك وإرشادات الاستخدام ونظام الاعتمادات وسياسة الاستخدام المقبول.",
  alternates: {
    canonical: "https://ghali.ae/ar/terms",
    languages: {
      en: "https://ghali.ae/terms",
      ar: "https://ghali.ae/ar/terms",
      "x-default": "https://ghali.ae/terms",
    },
  },
  openGraph: {
    title: "شروط الخدمة — غالي",
    description:
      "شروط الخدمة لـ ghali.ae — حقوقك وإرشادات الاستخدام ونظام الاعتمادات.",
    url: "https://ghali.ae/ar/terms",
    locale: "ar_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "غالي — مساعد ذكي على واتساب" }],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://ghali.ae/ar" },
    { "@type": "ListItem", position: 2, name: "شروط الخدمة", item: "https://ghali.ae/ar/terms" },
  ],
};

export default function ArTermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/ar" className="flex items-center gap-3">
              <Image src="/ghali-logo-no-bg.svg" alt="غالي" width={30} height={30} />
              <span className="text-xl font-semibold tracking-tight">Ghali</span>
            </Link>
            <Link href="/ar" className="text-sm text-white/40 transition-colors hover:text-white">
              → العودة للرئيسية
            </Link>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            شروط الخدمة
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-white/30 text-sm mb-6">آخر تحديث: 22 فبراير 2026</p>

        <div className="rounded-2xl border border-[#ED6B23]/20 bg-[#ED6B23]/5 p-6 mb-8">
          <p className="text-white/70 leading-relaxed mb-2">
            تتوفر شروط الخدمة الكاملة باللغة الإنجليزية. النسخة الإنجليزية هي النسخة المرجعية الرسمية والملزمة قانونياً.
          </p>
          <Link href="/terms" className="text-[#ED6B23] hover:underline text-sm">
            قراءة الشروط الكاملة بالإنجليزية ←
          </Link>
        </div>

        <div className="space-y-8">
          <Section title="1. القبول">
            <p>
              باستخدام خدمة غالي، فأنت توافق على هذه الشروط. تشغّل{" "}
              <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> (دبي، الإمارات العربية المتحدة)
              هذه الخدمة وتمتلكها.
            </p>
          </Section>

          <Section title="2. وصف الخدمة">
            <p>
              غالي هو مساعد ذكاء اصطناعي يعمل عبر واتساب. يستخدم نماذج ذكاء اصطناعي متعددة
              من Google وAnthropic وOpenAI لتقديم ردود وتوليد الصور وتحليل المستندات وغير ذلك.
            </p>
          </Section>

          <Section title="3. نظام الاعتمادات">
            <p className="mb-3">يعمل غالي على نظام اعتمادات:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong className="text-white/80">الأساسي:</strong> 60 اعتماد/شهر مجاناً</li>
              <li><strong className="text-white/80">Pro:</strong> 600 اعتماد/شهر بـ 9.99$ أو 99.48$/سنة</li>
              <li>كل طلب يستهلك اعتماداً واحداً</li>
              <li>الأوامر النظامية (الرصيد، المساعدة، إلخ) مجانية</li>
            </ul>
          </Section>

          <Section title="4. الاستخدام المقبول">
            <p className="mb-3">توافق على عدم استخدام الخدمة لـ:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>أي نشاط غير قانوني أو ضار</li>
              <li>توليد محتوى ينتهك حقوق الآخرين</li>
              <li>محاولة تجاوز أنظمة الأمان</li>
              <li>الوصول الآلي بدون إذن مسبق</li>
            </ul>
          </Section>

          <Section title="5. الخصوصية">
            <p>
              استخدامك للخدمة يخضع أيضاً لـ{" "}
              <Link href="/ar/privacy" className="text-[#ED6B23] hover:underline">سياسة الخصوصية</Link> الخاصة بنا.
              نحن لا نبيع بياناتك ولا نستخدمها لتدريب النماذج.
            </p>
          </Section>

          <Section title="6. تواصل معنا">
            <p>
              للأسئلة حول شروط الخدمة، تواصل مع{" "}
              <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> على{" "}
              <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">
                support@ghali.ae
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-white/30">
            انظر أيضاً:{" "}
            <Link href="/ar/privacy" className="text-[#ED6B23] hover:underline">سياسة الخصوصية</Link>
            {" | "}
            <Link href="/terms" className="text-[#ED6B23] hover:underline">Terms of Service (English)</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-white">{title}</h2>
      <div className="text-white/50 leading-relaxed">{children}</div>
    </section>
  );
}
