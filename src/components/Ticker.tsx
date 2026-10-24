import { SOURCES } from "../lib/rss";
import type { NewsItem } from "../lib/rss";

export default function Ticker({ items }: { items: NewsItem[] }) {
  const headlines = items.slice(0, 14);
  const hasContent = headlines.length > 0;
  const loop = hasContent ? [...headlines, ...headlines] : [];

  return (
    <div className="ticker-shell bg-pine-deep text-[#eaf3ec] overflow-hidden border-b border-black/20">
      <div className="flex items-stretch">
        <div className="relative z-10 flex items-center gap-2 bg-chili px-3 sm:px-4 py-2 shrink-0">
          <span className="live-dot size-2 rounded-full bg-white" />
          <span className="text-[11px] font-extrabold tracking-[0.14em] uppercase">Live</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          {hasContent ? (
            <div
              className="ticker-track flex w-max items-center whitespace-nowrap py-2"
              style={{ animationDuration: `${Math.max(35, headlines.length * 4.5)}s` }}
            >
              {loop.map((it, i) => {
                const src = SOURCES.find((s) => s.id === it.sourceId);
                return (
                  <a
                    key={`${it.id}-${i}`}
                    href={it.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center text-[13px] hover:text-marigold transition-colors"
                  >
                    <span className="mx-4 text-marigold/90 text-[9px]">◆</span>
                    <span
                      className="mr-2 rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide shrink-0"
                      style={{ background: src?.color ?? "#0b6b45" }}
                    >
                      {src?.name ?? "News"}
                    </span>
                    <span className="font-medium">{it.title}</span>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center py-2 px-4 text-[13px] text-white/70">
              <span className="shimmer inline-block h-3 w-64 rounded-full" />
              <span className="ml-3 hidden sm:inline">Pakistan ki taaza khabrein load ho rahi hain…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
