import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Document Analysis & Knowledge Base — Ghali",
  description: "Send PDFs and files to Ghali. It reads them, answers your questions, and remembers them for later.",
};

export default function DocumentsPage() {
  return (
    <FeaturePage
      badge="Documents & Knowledge"
      title={<>Send a File. <span className="text-[#ED6B23]">Get Answers.</span></>}
      subtitle="Drop a PDF, Word doc, or spreadsheet into WhatsApp. Ghali reads it, answers your questions about it, and stores it in your personal knowledge base for later."
    >
      <FeatureSection title="Instant document analysis">
        <p>
          Got a 50-page report and need the key takeaways? A contract you need to understand? A spreadsheet full of data? Just send it to Ghali and ask your question.
        </p>
        <p>
          Ghali reads the entire document, understands the content, and gives you exactly what you asked for — no need to read through it all yourself.
        </p>
      </FeatureSection>

      <FeatureSection title="Supported formats">
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon="📄"
            title="PDFs"
            description="Reports, contracts, papers, invoices — sent directly through WhatsApp."
          />
          <FeatureCard
            icon="📝"
            title="Word & PowerPoint"
            description="DOCX, PPTX files are converted and analyzed automatically."
          />
          <FeatureCard
            icon="📊"
            title="Spreadsheets"
            description="XLSX files with data — Ghali reads the numbers and answers your questions."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Your personal knowledge base">
        <p>
          Here&apos;s where it gets powerful. Every document you send is stored in your personal knowledge base. That means you can ask about it days, weeks, or months later.
        </p>
        <p>
          &quot;What were the payment terms in that contract I sent last week?&quot; — Ghali searches your knowledge base and pulls up the answer, even if it&apos;s been a while.
        </p>
      </FeatureSection>

      <FeatureSection title="Reply-to-media">
        <p>
          Sent a document earlier and want to ask a follow-up? Just reply to the original message in WhatsApp. Ghali pulls up the document and re-analyzes it with your new question. Natural and effortless.
        </p>
      </FeatureSection>

      <FeatureSection title="You're in control">
        <p>
          Your documents are stored per-user — no one else can access them. Want to clear your knowledge base? Say &quot;clear documents&quot; and it&apos;s gone. Media files are automatically cleaned up after 90 days.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
