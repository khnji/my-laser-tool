import { useEffect, useMemo, useState } from "react";
import { SOURCES } from "../lib/rss";
import type { NewsItem } from "../lib/rss";
import type { NewsData } from "../lib/useNews";
import { Icon } from "../lib/icons";
import Reveal from "./Reveal";

function timeAgo(d: Date): string {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s pehle`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min pehle`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ghantay pehle`;
  const days = Math.floor(h / 24);
  return `${days} din pehle`;
}

function SourceBadge({ id, small }: { id: string; small?: boolean }) {
  const src = SOURCES.find((s) => s.id === id);
  if (!src) return null;
  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wide rounded-md text-white ${small ? "text-[9px] px-1.5 py-px" : "text-[10px] px-2 py-0.5"}`}
      style={{ background: src.color }}
    >
      {src.name}
    </span>
  );
}

function NewsImage({ item, className }: { item: NewsItem; className: string }) {
  const [failed, setFailed] = useState(false);
  const src = SOURCES.find((s) => s.id === item.sourceId);
  if (!item.image || failed) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${src?.color ?? "#0b6b45"}22, ${src?.color ?? "#0b6b45"}44)` }}>
        <span className="font-display font-extrabold text-4xl opacity-40" style={{ color: src?.color }}>
          {item.title.trim().charAt(0).toUpperCase() || "N"}
        </span>
      </div>
    );
  }
  return (
    <img
      src={item.image}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover w-full h-full group-hover:scale-[1.06] transition-transform duration-500`}
    />
  );
}

function Skeleton() {
  return (
    <div className="bg-paper border border-ink/15 rounded-xl overflow-hidden">
      <div className="aspect-[16/9] shimmer" />
      <div className="p-4 space-y-2.5">
        <div className="shimmer h-3 w-24 rounded-full" />
        <div className="shimmer h-4 w-full rounded-full" />
        <div className="shimmer h-4 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

export default function NewsTool({ data }: { data: NewsData }) {
  const { items, sourceStates, lastUpdated, refreshing, refresh } = data;
  const [filter, setFilter] = useState<"all" | string>("all");
  const [view, setView] = useState<"cards" | "headlines">("cards");
  const [, setTick] = useState(0);

  // keep "x min pehle" labels fresh
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(iv);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.sourceId === filter)),
    [items, filter]
  );

  const featured = useMemo(() => filtered.find((i) => i.image) ?? filtered[0], [filtered]);
  const rest = useMemo(() => filtered.filter((i) => i !== featured).slice(0, 21), [filtered, featured]);

  const failedSources = SOURCES.filter((s) => sourceStates[s.id]?.status === "error");
  const initialLoading = items.length === 0 && refreshing;
  const allFailed = items.length === 0 && !refreshing && failedSources.length > 0;

  return (
    <section>
      {/* toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold border transition-all ${
              filter === "all"
                ? "bg-ink text-paper border-ink shadow-[0_4px_12px_-4px_rgba(20,38,30,.5)]"
                : "bg-paper border-ink/15 text-ink/60 hover:border-ink/40 hover:text-ink"
            }`}
          >
            Sab khabrein <span className="opacity-60">({items.length})</span>
          </button>
          {SOURCES.map((s) => {
            const st = sourceStates[s.id];
            const active = filter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setFilter(active ? "all" : s.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold border transition-all ${
                  active ? "bg-ink text-paper border-ink shadow-[0_4px_12px_-4px_rgba(20,38,30,.5)]" : "bg-paper border-ink/15 text-ink/60 hover:border-ink/40 hover:text-ink"
                }`}
              >
                <span className={`size-2 rounded-full ${st?.status === "loading" ? "animate-pulse" : ""}`} style={{ background: s.color }} />
                {s.name}
                {st?.status === "error" ? (
                  <span className="text-chili">✕</span>
                ) : (
                  <span className="opacity-55">({st?.count ?? 0})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-ink/45 font-medium hidden sm:block">
            {lastUpdated ? `Update: ${timeAgo(lastUpdated)}` : "…"}
          </span>
          <div className="flex rounded-lg border border-ink/15 overflow-hidden">
            <button
              onClick={() => setView("cards")}
              title="Cards view"
              className={`px-2.5 py-2 transition-colors ${view === "cards" ? "bg-pine text-white" : "bg-paper text-ink/50 hover:text-ink"}`}
            >
              <Icon name="grid" size={15} />
            </button>
            <button
              onClick={() => setView("headlines")}
              title="Headlines view"
              className={`px-2.5 py-2 transition-colors ${view === "headlines" ? "bg-pine text-white" : "bg-paper text-ink/50 hover:text-ink"}`}
            >
              <Icon name="list" size={15} />
            </button>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl bg-pine text-white font-bold px-4 py-2 text-sm hover:bg-pine-deep active:scale-[.97] transition-all disabled:opacity-60 shadow-[0_6px_18px_-6px_rgba(11,107,69,.7)]"
          >
            <Icon name="refresh" size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Taaza ho raha hai…" : "Taaza karo"}
          </button>
        </div>
      </div>

      {failedSources.length > 0 && items.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-chili/8 border border-chili/25 px-3 py-2 text-[12px] text-ink/65">
          <Icon name="alert" size={14} className="text-chili shrink-0 mt-0.5" />
          <span>
            {failedSources.map((s) => s.name).join(", ")} ki feed abhi load nahi hui — baqi sources se khabrein maujood hain.
          </span>
        </div>
      )}

      {/* skeletons */}
      {initialLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      )}

      {/* all failed */}
      {allFailed && (
        <div className="bg-paper border border-ink/15 rounded-2xl px-6 py-14 text-center">
          <div className="mx-auto size-14 rounded-2xl bg-chili/12 text-chili flex items-center justify-center mb-4">
            <Icon name="alert" size={26} />
          </div>
          <h3 className="font-display text-xl font-extrabold">Khabrein load nahi ho sakin</h3>
          <p className="text-ink/55 text-sm mt-2 max-w-md mx-auto">
            Internet connection check karo, ya ho sakta hai news feeds thori der ke liye busy hon.
          </p>
          <button
            onClick={refresh}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-pine text-white font-bold px-5 py-2.5 text-sm hover:bg-pine-deep transition-colors"
          >
            <Icon name="refresh" size={15} />
            Dobara try karo
          </button>
        </div>
      )}

      {/* empty filter result */}
      {!initialLoading && !allFailed && filtered.length === 0 && items.length > 0 && (
        <div className="bg-paper border border-ink/15 rounded-2xl px-6 py-12 text-center text-ink/50">
          Is source ki khabrein is waqt available nahi — koi aur source try karo.
        </div>
      )}

      {/* content */}
      {!initialLoading && !allFailed && filtered.length > 0 && (
        <>
          {featured && (
            <Reveal>
              <a
                href={featured.link}
                target="_blank"
                rel="noreferrer"
                className="group mb-5 grid md:grid-cols-2 bg-pine-deep text-[#eef5ee] rounded-2xl overflow-hidden border border-pine-deep hover:shadow-[0_20px_50px_-20px_rgba(7,70,45,.8)] transition-shadow duration-300"
              >
                <div className="aspect-[16/9] md:aspect-auto md:min-h-[260px] overflow-hidden">
                  <NewsImage item={featured} className="w-full h-full" />
                </div>
                <div className="p-6 sm:p-7 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-marigold text-ink text-[10px] font-extrabold uppercase tracking-widest px-2 py-1">
                      <Icon name="star" size={10} />
                      Aaj ki khaas
                    </span>
                    <SourceBadge id={featured.sourceId} />
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-tight group-hover:text-marigold transition-colors duration-300">
                    {featured.title}
                  </h2>
                  {featured.excerpt && <p className="text-sm text-white/65 mt-3 line-clamp-3">{featured.excerpt}</p>}
                  <div className="mt-4 flex items-center gap-2 text-xs text-white/55 font-medium">
                    {timeAgo(featured.date)}
                    <Icon name="external" size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            </Reveal>
          )}

          {view === "cards" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((item, i) => (
                <Reveal key={item.id} delay={(i % 3) * 70}>
                  <article className="group bg-paper border border-ink/15 rounded-xl overflow-hidden h-full hover:-translate-y-1 hover:shadow-[0_16px_36px_-14px_rgba(20,38,30,.4)] hover:border-pine/40 transition-all duration-300">
                    <a href={item.link} target="_blank" rel="noreferrer" className="block h-full">
                      <div className="aspect-[16/9] overflow-hidden bg-[#e0e7d8]">
                        <NewsImage item={item} className="w-full h-full" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <SourceBadge id={item.sourceId} />
                          <span className="text-[11px] text-ink/45 font-medium">{timeAgo(item.date)}</span>
                        </div>
                        <h3 className="font-display font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-pine transition-colors">
                          {item.title}
                        </h3>
                        {item.excerpt && <p className="text-[13px] text-ink/55 mt-2 line-clamp-2">{item.excerpt}</p>}
                      </div>
                    </a>
                  </article>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="bg-paper border border-ink/15 rounded-2xl overflow-hidden divide-y divide-ink/8">
              {[featured, ...rest].filter(Boolean).map((item, i) => (
                <Reveal key={item.id} delay={Math.min(i, 8) * 40}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-pine/6 transition-colors"
                  >
                    <span className="font-display font-extrabold text-xl text-marigold w-8 text-right shrink-0 tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[14.5px] leading-snug line-clamp-2 group-hover:text-pine transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <SourceBadge id={item.sourceId} small />
                        <span className="text-[11px] text-ink/45">{timeAgo(item.date)}</span>
                      </div>
                    </div>
                    <Icon name="external" size={15} className="text-ink/25 group-hover:text-pine transition-all shrink-0 group-hover:translate-x-0.5" />
                  </a>
                </Reveal>
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-ink/40">
            Khabrein RSS feeds se har 5 minute khud-ba-khud taaza hoti hain · Poori khabar parhne ke liye card par click karo
          </p>
        </>
      )}
    </section>
  );
}
