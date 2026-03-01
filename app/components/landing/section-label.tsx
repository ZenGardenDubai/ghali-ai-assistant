export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px w-8 bg-[#ED6B23]" />
      <span className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
        {children}
      </span>
    </div>
  );
}
