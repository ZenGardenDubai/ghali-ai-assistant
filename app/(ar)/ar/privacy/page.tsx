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
      "كيف يتعامل غالي مع بياناتك. خصوصيتك تهمنا. تعرف على جمع البيانات ومعالجة الذكاء الاصطناعي وحقوقك.",
    url: "https://ghali.ae/ar/privacy",
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
  twitter: {
    card: "summary_large_image",
    title: "سياسة الخصوصية — غالي",
    description:
      "كيف يتعامل غالي مع بياناتك. خصوصيتك تهمنا. تعرف على جمع البيانات ومعالجة الذكاء الاصطناعي وحقوقك.",
    images: ["/ghali-logo-with-bg.png"],
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
    <div className="min-h-screen bg-[#0a0f1e] text-white">
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
              <Image
                src="/ghali-logo-no-bg.svg"
                alt="غالي"
                width={30}
                height={30}
              />
              <span className="text-xl font-semibold tracking-tight">غالي</span>
            </Link>
            <Link
              href="/ar"
              className="text-sm text-white/40 transition-colors hover:text-white"
            >
              العودة للرئيسية &rarr;
            </Link>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            سياسة الخصوصية
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-white/30 text-sm mb-6">
          آخر تحديث: 22 فبراير 2026
        </p>

        {/* Company banner */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-8">
          <p className="text-white/70 leading-relaxed mb-3">
            تحكم سياسة الخصوصية هذه استخدام ghali.ae، وهو منتج مملوك ومُدار من قبل{" "}
            <strong className="text-white">شركة ساهم لتكنولوجيا البيانات</strong>، شركة مسجلة في دبي، الإمارات العربية المتحدة.
          </p>
          <p className="text-white/40 text-sm">
            التواصل: <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">support@ghali.ae</a> | فيلا 49، شارع 38B، البرشاء 2، دبي، الإمارات
          </p>
        </div>

        <div className="space-y-8">
          <Section title="1. المقدمة">
            <p>
              مرحبًا بك في ghali.ae. تحترم <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong> خصوصيتك وتلتزم بحماية بياناتك الشخصية.
              توضح سياسة الخصوصية هذه كيف نجمع معلوماتك ونستخدمها ونحميها عند استخدامك لخدمة المساعد الذكي.
            </p>
          </Section>

          <Section title="2. المعلومات التي نجمعها">
            <p className="mb-3">
              تجمع <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong> المعلومات التي تقدمها لنا مباشرة:
            </p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong className="text-white/80">معلومات الحساب:</strong> رقم الهاتف واسم الملف الشخصي من واتساب</li>
              <li><strong className="text-white/80">بيانات المحادثات:</strong> الرسائل والملاحظات الصوتية والملفات التي تشاركها مع المساعد الذكي</li>
              <li><strong className="text-white/80">قاعدة المعرفة:</strong> المستندات التي ترسلها والتي يتم تخزينها للاسترجاع لاحقًا</li>
              <li><strong className="text-white/80">بيانات الاستخدام:</strong> كيف تتفاعل مع خدمتنا، بما في ذلك الميزات المستخدمة والتفضيلات</li>
              <li><strong className="text-white/80">الذاكرة والشخصية:</strong> التفضيلات والسياق الذي يتعلمه غالي من محادثاتك</li>
            </ul>
          </Section>

          <Section title="3. كيف نستخدم معلوماتك">
            <p className="mb-3">نستخدم المعلومات المجمعة من أجل:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>تقديم وصيانة وتحسين خدمة المساعد الذكي</li>
              <li>معالجة طلباتك وتقديم الردود</li>
              <li>تخزين واسترجاع مستنداتك من قاعدة معرفتك الشخصية</li>
              <li>تخصيص تجربتك بناءً على تفضيلاتك وذاكرتك</li>
              <li>إرسال اتصالات متعلقة بالخدمة ومتابعات استباقية</li>
              <li>تحليل أنماط الاستخدام لتحسين خدمتنا</li>
              <li>الحماية من الاحتيال وسوء الاستخدام</li>
            </ul>
          </Section>

          <Section title="4. معالجة الذكاء الاصطناعي">
            <p>
              تتم معالجة محادثاتك بواسطة مزودي ذكاء اصطناعي من أطراف ثالثة (Google، Anthropic، OpenAI) لتوليد الردود.
              لا نستخدم بيانات محادثاتك لتدريب نماذج الذكاء الاصطناعي. لكل مزود سياسات خصوصية خاصة به
              فيما يتعلق بمعالجة البيانات أثناء الاستدلال.
            </p>
          </Section>

          <Section title="5. تخزين البيانات والأمان">
            <p>
              يتم تخزين بياناتك بشكل آمن باستخدام تشفير وفق المعايير الصناعية. نستخدم Convex لتخزين قاعدة البيانات في الوقت الفعلي
              وننفذ إجراءات تقنية وتنظيمية مناسبة لحماية معلوماتك الشخصية.
            </p>
          </Section>

          <Section title="6. مشاركة البيانات">
            <p className="mb-3">لا نبيع بياناتك الشخصية. قد نشارك المعلومات مع:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong className="text-white/80">مزودو الذكاء الاصطناعي:</strong> لمعالجة طلباتك (Google، Anthropic، OpenAI)</li>
              <li><strong className="text-white/80">مزودو الخدمات:</strong> للمصادقة (Clerk)، والتحليلات (PostHog)، والبنية التحتية</li>
              <li><strong className="text-white/80">المتطلبات القانونية:</strong> عندما يتطلب القانون ذلك أو لحماية حقوقنا</li>
            </ul>
          </Section>

          <Section title="7. حقوقك">
            <p className="mb-3">لديك الحق في:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>الوصول إلى بياناتك الشخصية — أرسل &quot;my memory&quot; لمعرفة ما يعرفه غالي عنك</li>
              <li>تصحيح البيانات غير الدقيقة من خلال المحادثة</li>
              <li>حذف بياناتك — أرسل &quot;clear memory&quot; أو &quot;clear documents&quot; أو &quot;clear everything&quot;</li>
              <li>إلغاء الاشتراك في تتبع التحليلات</li>
            </ul>
          </Section>

          <Section title="8. ملفات تعريف الارتباط والتتبع">
            <p>
              نستخدم ملفات تعريف ارتباط أساسية للمصادقة وإدارة الجلسات على موقعنا. نستخدم PostHog للتحليلات المجهولة
              لفهم كيفية تفاعل المستخدمين مع خدمتنا. يمكنك إلغاء الاشتراك في تتبع التحليلات
              من إعدادات متصفحك.
            </p>
          </Section>

          <Section title="9. الاحتفاظ بالبيانات">
            <p>
              نحتفظ بسجل محادثاتك وبيانات قاعدة معرفتك حتى تقوم بحذفها.
              يتم حذف مرفقات الوسائط تلقائيًا بعد 90 يومًا. يمكنك حذف جميع بياناتك في أي وقت
              بإرسال &quot;clear everything&quot; إلى غالي.
            </p>
          </Section>

          <Section title="10. التغييرات على هذه السياسة">
            <p>
              قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بأي تغييرات
              من خلال نشر السياسة الجديدة على هذه الصفحة وتحديث تاريخ &quot;آخر تحديث&quot;.
            </p>
          </Section>

          <Section title="11. اتصل بنا">
            <p>
              إذا كانت لديك أسئلة حول سياسة الخصوصية هذه أو ممارسات البيانات لدينا، يرجى التواصل مع <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong> على{" "}
              <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">
                support@ghali.ae
              </a>
              {" "}أو زيارة مكتبنا في فيلا 49، شارع 38B، البرشاء 2، دبي، الإمارات.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-white/30">
            انظر أيضًا: <Link href="/ar/terms" className="text-[#ED6B23] hover:underline">شروط الخدمة</Link>
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
