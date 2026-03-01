import { HtmlLangSetter } from "./html-lang-setter";

export default function ArLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="font-[family-name:var(--font-arabic)]">
      <HtmlLangSetter />
      {children}
    </div>
  );
}
