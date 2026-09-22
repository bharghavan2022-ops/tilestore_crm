export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink-text">{title}</p>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
