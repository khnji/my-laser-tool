export interface NewsItem {
  id: string;
  title: string;
  link: string;
  excerpt: string;
  image?: string;
  date: Date;
  sourceId: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  color: string;
}

export const SOURCES: Source[] = [
  { id: "dawn", name: "Dawn", url: "https://www.dawn.com/feed/", color: "#0b6b45" },
  { id: "tribune", name: "Express Tribune", url: "https://tribune.com.pk/feed/", color: "#e4572e" },
  { id: "ptoday", name: "Pakistan Today", url: "https://www.pakistantoday.com.pk/feed", color: "#f2a51d" },
  { id: "dtimes", name: "Daily Times", url: "https://dailytimes.com.pk/feed", color: "#2e6fb7" },
  { id: "ary", name: "ARY News", url: "https://arynews.tv/feed", color: "#7d3ac1" },
  { id: "br", name: "Business Recorder", url: "https://www.brecorder.com/feed", color: "#0e7490" },
];

const PROXIES: Array<(u: string) => string> = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

async function fetchText(url: string, timeoutMs = 14000): Promise<string> {
  let lastErr: unknown = null;
  for (const wrap of PROXIES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(wrap(url), { signal: ctrl.signal });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (text && text.length > 200) return text;
      lastErr = new Error("Empty response");
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("All proxies failed");
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

function pickImage(el: Element): string | undefined {
  const looksLikeImage = (u: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u);

  const enc = el.getElementsByTagName("enclosure");
  for (let i = 0; i < enc.length; i++) {
    const u = enc[i].getAttribute("url");
    const type = enc[i].getAttribute("type") || "";
    if (u && (type.startsWith("image") || looksLikeImage(u))) return u;
  }
  const media = el.getElementsByTagName("media:content");
  for (let i = 0; i < media.length; i++) {
    const u = media[i].getAttribute("url");
    if (u && looksLikeImage(u)) return u;
  }
  const thumb = el.getElementsByTagName("media:thumbnail");
  for (let i = 0; i < thumb.length; i++) {
    const u = thumb[i].getAttribute("url");
    if (u && looksLikeImage(u)) return u;
  }
  const html =
    (el.getElementsByTagName("description")[0]?.textContent || "") +
    (el.getElementsByTagName("content:encoded")[0]?.textContent || "");
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

function parseDate(raw: string): Date {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return new Date();
  const now = Date.now();
  // clamp bad future dates
  return d.getTime() > now + 2 * 3600_000 ? new Date() : d;
}

export async function fetchSource(src: Source): Promise<NewsItem[]> {
  const xml = await fetchText(src.url);
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid XML");

  const nodes = doc.getElementsByTagName("item");
  const items: NewsItem[] = [];
  for (let i = 0; i < nodes.length && i < 15; i++) {
    const el = nodes[i];
    const title = (el.getElementsByTagName("title")[0]?.textContent || "").trim();
    const link = (el.getElementsByTagName("link")[0]?.textContent || "").trim();
    const pub =
      el.getElementsByTagName("pubDate")[0]?.textContent ||
      el.getElementsByTagName("dc:date")[0]?.textContent ||
      "";
    if (!title) continue;
    items.push({
      id: `${src.id}-${i}-${link || title.slice(0, 20)}`,
      title,
      link,
      excerpt: stripHtml(el.getElementsByTagName("description")[0]?.textContent || "").slice(0, 240),
      image: pickImage(el),
      date: parseDate(pub),
      sourceId: src.id,
    });
  }
  if (items.length === 0) throw new Error("No items in feed");
  return items;
}
