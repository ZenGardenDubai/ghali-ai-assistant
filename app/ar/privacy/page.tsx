import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سياسة الخصوصية — غالي",
  description:
    "كيف يتعامل غالي مع بياناتك. خصوصيتك تهمنا. تعرف على جمع البيانات ومعالجة الذكاء الاصطناعي وحقوقك.",
  alternates: {
    canonical: "https://ghali.ae/ar/privacy",
    languages: {
      en: "https://ghali.ae/privacy",
      ar: "https://ghali.ae/ar/privacy",
      "x-default": "https://ghali.ae/privacy",
    },
  },
  openGraph: {
    title: "سياسة الخصوصية — غالي",
    description:
      "كيف يتعامل غالي مع بياناتك. خصوصيتك تهمنا.",
    url: "https://ghali.ae/ar/privacy",
    locale: "ar_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "غالي — مساعد ذكي على واتساب" }],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://ghali.ae/ar" },
    { "@type": "ListItem", position: 2, name: "سياسة الخصوصية", item: "https://ghali.ae/ar/privacy" },
  ],
};

export default function ArPrivacyPage() {
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
            سياسة الخصوصية
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-white/30 text-sm mb-6">آخر تحديث: 22 فبراير 2026</p>

        <div className="rounded-2xl border border-[#ED6B23]/20 bg-[#ED6B23]/5 p-6 mb-8">
          <p className="text-white/70 leading-relaxed mb-2">
            تتوفر سياسة الخصوصية الكاملة باللغة الإنجليزية. النسخة الإنجليزية هي النسخة المرجعية الرسمية.
          </p>
          <Link href="/privacy" className="text-[#ED6B23] hover:underline text-sm">
            قراءة السياسة الكاملة بالإنجليزية ←
          </Link>
        </div>

        <div className="space-y-8">
          <Section title="1. مقدمة">
            <p>
              مرحباً بكم في ghali.ae. تحترم{" "}
              <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> خصوصيتك وتلتزم بحماية بياناتك الشخصية.
              توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند استخدام خدمة المساعد الذكي.
            </p>
          </Section>

          <Section title="2. المعلومات التي نجمعها">
            <p className="mb-3">نجمع المعلومات التي تقدمها مباشرة:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong className="text-white/80">معلومات الحساب:</strong> رقم الهاتف والاسم من واتساب</li>
              <li><strong className="text-white/80">بيانات المحادثة:</strong> الرسائل والملاحظات الصوتية والملفات</li>
              <li><strong className="text-white/80">قاعدة المعرفة:</strong> المستندات المحفوظة للاسترجاع لاحقاً</li>
              <li><strong className="text-white/80">بيانات الاستخدام:</strong> كيفية تفاعلك مع الخدمة</li>
              <li><strong className="text-white/80">الذاكرة والشخصية:</strong> التفضيلات والسياق الذي يتعلمه غالي</li>
            </ul>
          </Section>

          <Section title="3. لا نبيع بياناتك">
            <p>
              نحن لا نبيع بياناتك الشخصية أبداً. نموذج أعمالنا قائم على الاشتراكات، وليس المراقبة.
              يتم معالجة محادثاتك بواسطة مزودي الذكاء الاصطناعي (Google وAnthropic وOpenAI) لتوليد الردود فقط،
              ولا تُستخدم لتدريب النماذج.
            </p>
          </Section>

          <Section title="4. حقوقك">
            <p className="mb-3">يحق لك:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>الوصول إلى بياناتك — أرسل &quot;ذاكرتي&quot; لمعرفة ما يعرفه غالي عنك</li>
              <li>تصحيح البيانات غير الدقيقة من خلال المحادثة</li>
              <li>حذف بياناتك — أرسل &quot;امسح الذاكرة&quot; أو &quot;امسح كل شيء&quot;</li>
              <li>إلغاء الاشتراك في تتبع التحليلات</li>
            </ul>
          </Section>

          <Section title="5. تواصل معنا">
            <p>
              إذا كان لديك أسئلة حول سياسة الخصوصية، يرجى التواصل مع{" "}
              <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> على{" "}
              <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">
                support@ghali.ae
              </a>
              {" "}أو زيارة مكتبنا في Villa 49، الشارع 38B، برشاء 2، دبي، الإمارات العربية المتحدة.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-white/30">
            انظر أيضاً:{" "}
            <Link href="/ar/terms" className="text-[#ED6B23] hover:underline">شروط الخدمة</Link>
            {" | "}
            <Link href="/privacy" className="text-[#ED6B23] hover:underline">Privacy Policy (English)</Link>
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
