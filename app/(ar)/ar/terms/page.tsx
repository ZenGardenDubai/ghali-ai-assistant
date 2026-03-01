import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "شروط الخدمة — غالي",
  description:
    "شروط خدمة ghali.ae — حقوقك، إرشادات الاستخدام، نظام الرصيد، وسياسة الاستخدام المقبول.",
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
      "شروط خدمة ghali.ae — حقوقك، إرشادات الاستخدام، نظام الرصيد، وسياسة الاستخدام المقبول.",
    url: "https://ghali.ae/ar/terms",
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
    title: "شروط الخدمة — غالي",
    description:
      "شروط خدمة ghali.ae — حقوقك، إرشادات الاستخدام، نظام الرصيد، وسياسة الاستخدام المقبول.",
    images: ["/ghali-logo-with-bg.png"],
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
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD schema requires inline initialization */}
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
            <div className="flex items-center gap-4">
              <Link
                href="/terms"
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
              >
                EN
              </Link>
              <Link
                href="/ar"
                className="text-sm text-white/40 transition-colors hover:text-white"
              >
                العودة للرئيسية &rarr;
              </Link>
            </div>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            شروط الخدمة
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
            تشكل شروط الخدمة هذه اتفاقية قانونية بينك وبين{" "}
            <strong className="text-white">شركة ساهم لتكنولوجيا البيانات</strong> (&quot;الشركة&quot;، &quot;نحن&quot;)، المالك والمشغل لـ ghali.ae.
          </p>
          <p className="text-white/40 text-sm mb-2">
            <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong> مسجلة في دبي، الإمارات العربية المتحدة.
          </p>
          <p className="text-white/40 text-sm">
            العنوان: فيلا 49، شارع 38B، البرشاء 2، دبي، الإمارات | البريد الإلكتروني: <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">support@ghali.ae</a>
          </p>
        </div>

        <div className="space-y-8">
          <Section title="1. قبول الشروط">
            <p>
              بالوصول إلى أو استخدام ghali.ae، فإنك توافق على الالتزام بشروط الخدمة هذه وتدخل في اتفاقية ملزمة قانونيًا مع <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong>.
              إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام خدمتنا.
            </p>
          </Section>

          <Section title="2. وصف الخدمة">
            <p>
              ghali.ae هو مساعد ذكاء اصطناعي على واتساب تم تطويره وتشغيله بواسطة <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong> لمساعدتك في إنجاز مهامك.
              تشمل الخدمة محادثات الذكاء الاصطناعي، وتحليل المستندات، وتوليد الصور، ونسخ الملاحظات الصوتية،
              وقاعدة المعرفة الشخصية، وميزات الجدولة المدعومة بمزودي ذكاء اصطناعي متعددين.
            </p>
          </Section>

          <Section title="3. تسجيل الحساب">
            <p className="mb-3">لاستخدام ghali.ae، يجب عليك:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>أن يكون عمرك 18 عامًا على الأقل أو أن تحصل على موافقة ولي الأمر</li>
              <li>أن يكون لديك حساب واتساب صالح</li>
              <li>ألا تستخدم الخدمة من منطقة محظورة</li>
              <li>إبلاغنا فورًا بأي وصول غير مصرح به</li>
            </ul>
          </Section>

          <Section title="4. الاستخدام المقبول">
            <p className="mb-3">توافق على عدم استخدام ghali.ae لـ:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>إنشاء محتوى غير قانوني أو ضار أو مسيء</li>
              <li>انتهاك أي قوانين أو لوائح سارية</li>
              <li>التعدي على حقوق الملكية الفكرية</li>
              <li>محاولة التحايل على حدود الاستخدام أو إجراءات الأمان</li>
              <li>مشاركة بيانات اعتماد حسابك مع الآخرين</li>
              <li>استخدام أنظمة آلية للوصول إلى الخدمة بدون إذن</li>
              <li>إنشاء محتوى يروج للعنف أو التمييز أو التحرش</li>
            </ul>
          </Section>

          <Section title="5. الرصيد والاستخدام">
            <p className="mb-3">يعمل ghali.ae بنظام الرصيد:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong className="text-white/80">الباقة الأساسية:</strong> يحصل المستخدمون المجانيون على 60 رصيد شهريًا</li>
              <li><strong className="text-white/80">باقة Pro:</strong> يحصل المشتركون على 600 رصيد شهريًا (نفس الميزات، رصيد أكثر)</li>
              <li>كل رسالة تكلف رصيد واحد؛ أوامر النظام مجانية</li>
              <li>الرصيد غير المستخدم لا ينتقل بين فترات التجديد</li>
              <li>نحتفظ بالحق في تعديل مخصصات الرصيد مع إشعار مسبق</li>
            </ul>
          </Section>

          <Section title="6. ملكية المحتوى">
            <p className="mb-3">فيما يتعلق بملكية المحتوى:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong className="text-white/80">محتواك:</strong> تحتفظ بملكية المحتوى الذي تقوم بتحميله أو إنشائه</li>
              <li><strong className="text-white/80">المحتوى المُولّد بالذكاء الاصطناعي:</strong> تمتلك المخرجات التي يولدها الذكاء الاصطناعي بناءً على طلباتك</li>
              <li><strong className="text-white/80">ترخيص لنا:</strong> تمنحنا ترخيصًا لمعالجة محتواك لتقديم الخدمة</li>
              <li><strong className="text-white/80">محتوانا:</strong> خدمة ghali.ae وعلامتها التجارية وتقنياتها تبقى ملكًا لنا</li>
            </ul>
          </Section>

          <Section title="7. حدود الذكاء الاصطناعي">
            <p>
              قد يحتوي المحتوى المولّد بالذكاء الاصطناعي على أخطاء أو عدم دقة أو مواد غير مناسبة.
              أنت مسؤول عن مراجعة والتحقق من أي مخرجات ذكاء اصطناعي قبل الاعتماد عليها.
              لا نضمن دقة أو اكتمال أو ملاءمة المحتوى المولّد بالذكاء الاصطناعي
              لأي غرض معين.
            </p>
          </Section>

          <Section title="8. خدمات الأطراف الثالثة">
            <p>
              يتكامل ghali.ae مع مزودي ذكاء اصطناعي من أطراف ثالثة (Google، Anthropic، OpenAI) وخدمات أخرى.
              يخضع استخدامك لهذه الخدمات المتكاملة لشروطها وسياساتها الخاصة.
              لسنا مسؤولين عن توفر أو أداء خدمات الأطراف الثالثة.
            </p>
          </Section>

          <Section title="9. الخصوصية">
            <p>
              يخضع استخدامك لـ ghali.ae أيضًا لـ{" "}
              <Link href="/ar/privacy" className="text-[#ED6B23] hover:underline">
                سياسة الخصوصية
              </Link>
              ، التي تصف كيف نجمع معلوماتك الشخصية ونستخدمها ونحميها.
            </p>
          </Section>

          <Section title="10. إخلاء المسؤولية">
            <p>
              يتم تقديم ghali.ae &quot;كما هو&quot; بدون ضمانات من أي نوع. لا نضمن أن الخدمة
              ستكون متواصلة أو خالية من الأخطاء أو آمنة. نخلي مسؤوليتنا من جميع الضمانات
              الصريحة أو الضمنية، بما في ذلك ضمانات القابلية للتسويق والملاءمة لغرض معين.
            </p>
          </Section>

          <Section title="11. تحديد المسؤولية">
            <p>
              إلى أقصى حد يسمح به القانون، لن تكون <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong> مسؤولة عن أي أضرار غير مباشرة أو عرضية
              أو خاصة أو تبعية أو تأديبية ناتجة عن استخدامك لـ ghali.ae. لن تتجاوز مسؤوليتنا الإجمالية
              المبلغ الذي دفعته مقابل الخدمة في الأشهر الـ 12 الماضية.
            </p>
          </Section>

          <Section title="12. الإنهاء">
            <p>
              يجوز لنا تعليق أو إنهاء وصولك إلى ghali.ae في أي وقت لانتهاك هذه الشروط
              أو لأي سبب آخر. عند الإنهاء، ينتهي حقك في استخدام الخدمة فورًا.
              يمكنك حذف بياناتك في أي وقت بإرسال &quot;clear everything&quot; إلى غالي.
            </p>
          </Section>

          <Section title="13. التغييرات على الشروط">
            <p>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنُخطر المستخدمين بالتغييرات الجوهرية
              من خلال الخدمة. يُعتبر الاستمرار في الاستخدام بعد التغييرات قبولًا
              للشروط المعدلة.
            </p>
          </Section>

          <Section title="14. القانون الحاكم">
            <p>
              تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة. يتم حل أي نزاعات ناشئة
              عن هذه الشروط في محاكم دبي، الإمارات.
            </p>
          </Section>

          <Section title="15. اتصل بنا">
            <p>
              لأي أسئلة حول هذه الشروط، يرجى التواصل مع <strong className="text-white/80">شركة ساهم لتكنولوجيا البيانات</strong> على{" "}
              <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">
                support@ghali.ae
              </a>
              {" "}أو زيارة مكتبنا في فيلا 49، شارع 38B، البرشاء 2، دبي، الإمارات.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-white/30">
            انظر أيضًا: <Link href="/ar/privacy" className="text-[#ED6B23] hover:underline">سياسة الخصوصية</Link>
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
