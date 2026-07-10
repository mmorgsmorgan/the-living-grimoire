export function StoryProgress({ current, total, size = "sm" }: { current: number; total: number; size?: "sm" | "md" }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const h = size === "md" ? "h-2" : "h-1.5";

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${h} rounded-full bg-grimoire-surface overflow-hidden`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-grimoire-purple to-grimoire-gold transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-grimoire-muted whitespace-nowrap">
        {current}/{total}
      </span>
    </div>
  );
}
