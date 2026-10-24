import { useEffect, useState } from "react";
import BGTool from "./components/BGTool";
import NewsTool from "./components/NewsTool";
import QRTool from "./components/QRTool";
import Ticker from "./components/Ticker";
import { ToastProvider } from "./components/Toasts";
import { Icon } from "./lib/icons";
import { SOURCES } from "./lib/rss";
import { usePakistanNews } from "./lib/useNews";

type Tab = "qr" | "bg" | "news";

const TABS: Array<{ id: Tab; label: string; icon: string; toolNo: string }> = [
  { id: "qr", label: "QR Code", icon: "qr", toolNo: "01" },
  { id: "bg", label: "BG Remover", icon: "wand", toolNo: "02" },
  { id: "news", label: "Pakistan News", icon: "news", toolNo: "03" },
];

const HEADINGS: Record<Tab, { title: string; sub: string; urdu: string }> = {
  qr: {
    title: "QR Code Generator",
    sub: "Kuch bhi likho — text, link, WiFi, number — QR foran tayyar.",
    urdu: "جو چاہو، بناؤ",
  },
  bg: {
    title: "Background Remover",
    sub: "Tasveer lao, click karo — background ghaib. Sab kuch browser ke andar.",
    urdu: "کلک کرو، صاف کرو",
  },
  news: {
    title: "Pakistan News",
    sub: "Dawn, Express Tribune aur mazeed — roz ki taaza khabrein ek jagah.",
    urdu: "پڑھو، جانو",
  },
};

function Logo({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
        <rect width="38" height="38" rx="10" fill={dark ? "#fbfcf7" : "#0b6b45"} />
        <rect x="8" y="8" width="9" height="9" rx="2.5" fill={dark ? "#07462d" : "#ffffff"} />
        <rect x="21" y="8" width="9" height="9" rx="2.5" fill="#f2a51d" />
        <rect x="8" y="21" width="9" height="9" rx="2.5" fill="#f2a51d" />
        <rect x="21" y="21" width="9" height="9" rx="2.5" fill={dark ? "#07462d" : "#ffffff"} />
      </svg>
      <div className="leading-none">
        <div className={`font-display font-extrabold text-[22px] tracking-tight ${dark ? "text-paper" : "text-ink"}`}>
          Banao<span className={dark ? "text-marigold" : "text-pine"}>Box</span>
        </div>
        <div className={`text-[10.5px] font-semibold mt-1 ${dark ? "text-white/50" : "text-ink/45"}`}>
          QR · BG Remover · News
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem("banaobox.tab");
    return saved === "qr" || saved === "bg" || saved === "news" ? saved : "qr";
  });
  const news = usePakistanNews();

  useEffect(() => {
    localStorage.setItem("banaobox.tab", tab);
    window.scrollTo({ top: 0 });
  }, [tab]);

  const h = HEADINGS[tab];

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Ticker items={news.items} />

        {/* ---------------- masthead ---------------- */}
        <header className="sticky top-0 z-40 bg-paper/92 backdrop-blur-md border-b border-ink/10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
            <Logo />

            <nav className="order-last w-full sm:order-none sm:w-auto sm:mx-auto flex gap-1 bg-bg border border-ink/10 p-1 rounded-full">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-full text-[13px] sm:text-sm font-bold transition-all duration-200 ${
                      active
                        ? "bg-pine text-white shadow-[0_5px_16px_-5px_rgba(11,107,69,.75)]"
                        : "text-ink/55 hover:text-ink hover:bg-white/70"
                    }`}
                  >
                    <Icon name={t.icon} size={16} />
                    {t.label}
                    {t.id === "news" && news.items.length > 0 && (
                      <span
                        className={`text-[10px] font-extrabold rounded-full px-1.5 py-px ${active ? "bg-white/20 text-white" : "bg-marigold/30 text-ink/70"}`}
                      >
                        {news.items.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="ml-auto sm:ml-0 text-right hidden md:block">
              <div className="font-urdu text-pine-deep text-[15px]" dir="rtl" lang="ur">
                لکھو، بناؤ، پڑھو
              </div>
              <div className="text-[9.5px] tracking-[0.18em] text-ink/40 uppercase font-bold -mt-1">
                Write · Create · Read
              </div>
            </div>
          </div>
          <div className="stripes h-[5px]" />
        </header>

        {/* ---------------- active tool ---------------- */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-10">
          <div key={tab} className="panel-in">
            <div className="flex items-end justify-between gap-4 mb-7 flex-wrap">
              <div className="rise">
                <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-pine uppercase">
                  <span className="size-2 rounded-full bg-marigold inline-block" />
                  Tool {HEADINGS[tab] && TABS.find((t) => t.id === tab)?.toolNo} / 03
                </div>
                <h1 className="font-display text-3xl sm:text-[40px] font-extrabold tracking-tight leading-[1.05] mt-1.5">
                  {h.title}
                </h1>
                <p className="text-ink/55 mt-1.5 text-[15px]">{h.sub}</p>
              </div>
              <div className="font-urdu text-pine/60 text-lg hidden lg:block pb-1" dir="rtl" lang="ur">
                {h.urdu}
              </div>
            </div>

            {tab === "qr" && <QRTool />}
            {tab === "bg" && <BGTool />}
            {tab === "news" && <NewsTool data={news} />}
          </div>
        </main>

        {/* ---------------- footer ---------------- */}
        <footer className="mt-10 bg-pine-deep text-[#e9f2ea]">
          <div className="stripes h-[5px]" />
          <div className="max-w-6xl mx-auto px-4 py-10 grid gap-9 sm:grid-cols-3">
            <div>
              <Logo dark />
              <p className="text-sm text-white/60 mt-4 leading-relaxed max-w-xs">
                Teen kaam, ek dabba. QR banao, background saaf karo, aur mulk ki taaza khabrein parho — bilkul free,
                bina kisi sign-up ke.
              </p>
              <p className="font-urdu text-marigold/85 text-[15px] mt-3" dir="rtl" lang="ur">
                پاکستان کے لیے پیار سے بنایا گیا
              </p>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-sm uppercase tracking-[0.14em] text-marigold mb-4">
                Auzaar / Tools
              </h3>
              <ul className="space-y-2.5">
                {TABS.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setTab(t.id)}
                      className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-marigold transition-colors"
                    >
                      <Icon name={t.icon} size={15} />
                      {t.label}
                      <span className="text-white/30">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-sm uppercase tracking-[0.14em] text-marigold mb-4">
                News Sources
              </h3>
              <ul className="space-y-2.5">
                {SOURCES.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm text-white/70">
                    <span className="size-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.name}
                    <span className="text-white/30 text-xs">· RSS</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
                Khabrein public RSS feeds se har 5 minute auto-update hoti hain.
              </p>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap text-xs text-white/45">
              <span>© 2026 BanaoBox — sab kuch aap ke browser mein, kuch bhi server par nahi jata.</span>
              <span className="flex items-center gap-1.5">
                <Icon name="sparkle" size={12} className="text-marigold" />
                Made in Pakistan 🇵🇰
              </span>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
