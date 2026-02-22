"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-white/10">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${i}`}
              className="flex w-full items-center justify-between gap-4 py-6 text-left transition-colors hover:text-[#ED6B23]"
            >
              <span className="text-lg font-medium">{item.question}</span>
              <span
                className={`shrink-0 text-2xl text-[#ED6B23] transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
              >
                +
              </span>
            </button>
            <div
              id={`faq-answer-${i}`}
              role="region"
              className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <p className="text-white/60 leading-relaxed">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}