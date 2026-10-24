import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "../lib/icons";
import { useToast } from "./Toasts";

type Kind = "text" | "url" | "wifi" | "email" | "phone" | "sms";
type EC = "L" | "M" | "Q" | "H";

const KINDS: Array<{ id: Kind; label: string; icon: string }> = [
  { id: "text", label: "Text", icon: "type" },
  { id: "url", label: "Link", icon: "link" },
  { id: "wifi", label: "WiFi", icon: "wifi" },
  { id: "email", label: "Email", icon: "mail" },
  { id: "phone", label: "Phone", icon: "phone" },
  { id: "sms", label: "SMS", icon: "chat" },
];

const FG_PRESETS = ["#14261e", "#0b6b45", "#e4572e", "#2e6fb7", "#7d3ac1"];
const BG_PRESETS = ["#ffffff", "#fff6e0", "#e7f0e2", "#fdeaea"];
const EC_INFO: Record<EC, string> = { L: "7%", M: "15%", Q: "25%", H: "30%" };

const escWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function QRTool() {
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [ssid, setSsid] = useState("");
  const [pass, setPass] = useState("");
  const [enc, setEnc] = useState<"WPA" | "WEP" | "none">("WPA");
  const [hidden, setHidden] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [phone, setPhone] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [fg, setFg] = useState("#14261e");
  const [bg, setBg] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [ec, setEc] = useState<EC>("M");
  const [size, setSize] = useState(480);
  const [dataUrl, setDataUrl] = useState("");
  const [err, setErr] = useState("");

  const payload = useMemo(() => {
    switch (kind) {
      case "text":
        return text;
      case "url":
        return url.trim();
      case "wifi":
        return ssid.trim()
          ? `WIFI:T:${enc === "none" ? "nopass" : enc};S:${escWifi(ssid)};${
              enc !== "none" ? `P:${escWifi(pass)};` : ""
            }${hidden ? "H:true;" : ""};`
          : "";
      case "email":
        return mailTo.trim()
          ? `mailto:${mailTo.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
          : "";
      case "phone":
        return phone.trim() ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
      case "sms":
        return phone.trim()
          ? `sms:${phone.replace(/[^\d+]/g, "")}${smsBody.trim() ? `?body=${encodeURIComponent(smsBody)}` : ""}`
          : "";
    }
  }, [kind, text, url, ssid, pass, enc, hidden, mailTo, subject, body, phone, smsBody]);

  const colors = useMemo(
    () => ({ dark: fg, light: transparent ? "rgba(255,255,255,0)" : bg }),
    [fg, bg, transparent]
  );

  useEffect(() => {
    if (!payload) {
      setDataUrl("");
      setErr("");
      return;
    }
    const t = setTimeout(async () => {
      try {
        const u = await QRCode.toDataURL(payload, {
          width: 640,
          margin: 2,
          errorCorrectionLevel: ec,
          color: colors,
        });
        setDataUrl(u);
        setErr("");
      } catch {
        setErr("Data bohat zyada hai — thora chhota likho ya error correction 'L' karo.");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [payload, ec, colors]);

  const downloadPng = async () => {
    try {
      const u = await QRCode.toDataURL(payload, { width: size, margin: 2, errorCorrectionLevel: ec, color: colors });
      triggerDownload(u, "banaobox-qr.png");
      toast("PNG download ho gayi ✓");
    } catch {
      toast("Download nahi hui — dobara try karo");
    }
  };

  const downloadSvg = async () => {
    try {
      const svg = await QRCode.toString(payload, {
        type: "svg",
        width: size,
        margin: 2,
        errorCorrectionLevel: ec,
        color: colors,
      });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const href = URL.createObjectURL(blob);
      triggerDownload(href, "banaobox-qr.svg");
      setTimeout(() => URL.revokeObjectURL(href), 5000);
      toast("SVG download ho gayi ✓");
    } catch {
      toast("Download nahi hui — dobara try karo");
    }
  };

  const copyImage = () => {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, payload, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: ec,
      color: colors,
    }, async (error) => {
      if (error) {
        toast("Copy nahi hui — dobara try karo");
        return;
      }
      canvas.toBlob(async (b: Blob | null) => {
        if (!b) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
          toast("QR image clipboard par copy ho gayi ✓");
        } catch {
          toast("Is browser mein copy support nahi — PNG download karo");
        }
      });
    });
  };

  const samples: Array<{ label: string; run: () => void }> = [
    {
      label: "dawn.com",
      run: () => {
        setKind("url");
        setUrl("https://www.dawn.com");
      },
    },
    {
      label: "Salam message",
      run: () => {
        setKind("text");
        setText("Assalam-o-Alaikum Pakistan! 🇵🇰 Yeh mera pehla QR code hai.");
      },
    },
    {
      label: "WiFi network",
      run: () => {
        setKind("wifi");
        setSsid("BanaoBox-5G");
        setPass("karachi2026");
        setEnc("WPA");
      },
    },
    {
      label: "Email",
      run: () => {
        setKind("email");
        setMailTo("salam@banaobox.pk");
        setSubject("Hello!");
        setBody("Mujhe BanaoBox se mil ke khushi hui.");
      },
    },
  ];

  return (
    <section>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start">
        {/* ---------------- controls ---------------- */}
        <div className="space-y-5">
          <div className="bg-paper border border-ink/15 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(20,38,30,.15)]">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-pine text-white text-xs font-extrabold">1</span>
                Kya likhna hai?
              </h2>
              <span className="text-xs text-ink/45">{payload.length} characters</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                    kind === k.id
                      ? "bg-pine text-white border-pine shadow-[0_4px_14px_-5px_rgba(11,107,69,.7)]"
                      : "bg-white/70 border-ink/15 text-ink/65 hover:border-pine/50 hover:text-pine"
                  }`}
                >
                  <Icon name={k.icon} size={15} />
                  {k.label}
                </button>
              ))}
            </div>

            {kind === "text" && (
              <div>
                <label className="lbl" htmlFor="qr-text">Apna message</label>
                <textarea
                  id="qr-text"
                  className="field min-h-28 resize-y"
                  placeholder="Kuch bhi likho — naam, message, shayari, kuch bhi…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            )}

            {kind === "url" && (
              <div>
                <label className="lbl" htmlFor="qr-url">Website link</label>
                <input
                  id="qr-url"
                  className="field"
                  placeholder="https://www.dawn.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            )}

            {kind === "wifi" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="lbl" htmlFor="qr-ssid">Network ka naam (SSID)</label>
                  <input id="qr-ssid" className="field" placeholder="BanaoBox-5G" value={ssid} onChange={(e) => setSsid(e.target.value)} />
                </div>
                <div>
                  <label className="lbl" htmlFor="qr-pass">Password</label>
                  <input id="qr-pass" className="field" type="text" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} disabled={enc === "none"} />
                </div>
                <div>
                  <label className="lbl" htmlFor="qr-enc">Security</label>
                  <select id="qr-enc" className="field" value={enc} onChange={(e) => setEnc(e.target.value as typeof enc)}>
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="none">Open (koi password nahi)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink/70 sm:col-span-2 cursor-pointer">
                  <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4 accent-[#0b6b45]" />
                  Network hidden hai
                </label>
              </div>
            )}

            {kind === "email" && (
              <div className="grid gap-4">
                <div>
                  <label className="lbl" htmlFor="qr-mail">Email address</label>
                  <input id="qr-mail" className="field" placeholder="salam@example.pk" value={mailTo} onChange={(e) => setMailTo(e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="lbl" htmlFor="qr-subj">Subject</label>
                    <input id="qr-subj" className="field" placeholder="Hello!" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="lbl" htmlFor="qr-body">Message</label>
                    <input id="qr-body" className="field" placeholder="Kya likhna hai?" value={body} onChange={(e) => setBody(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {(kind === "phone" || kind === "sms") && (
              <div className="grid gap-4">
                <div>
                  <label className="lbl" htmlFor="qr-phone">Phone number</label>
                  <input id="qr-phone" className="field" placeholder="+92 300 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                {kind === "sms" && (
                  <div>
                    <label className="lbl" htmlFor="qr-sms">SMS message</label>
                    <textarea id="qr-sms" className="field min-h-20 resize-y" placeholder="SMS ka text…" value={smsBody} onChange={(e) => setSmsBody(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-dashed border-ink/15">
              <div className="lbl" style={{ marginBottom: 8 }}>Foran try karo</div>
              <div className="flex flex-wrap gap-2">
                {samples.map((s) => (
                  <button
                    key={s.label}
                    onClick={s.run}
                    className="px-3 py-1.5 rounded-full bg-marigold/20 border border-marigold/50 text-[13px] font-semibold text-ink/75 hover:bg-marigold/40 hover:-translate-y-0.5 transition-all"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------- style ---------------- */}
          <div className="bg-paper border border-ink/15 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(20,38,30,.15)]">
            <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
              <span className="flex size-6 items-center justify-center rounded-md bg-marigold text-ink text-xs font-extrabold">2</span>
              Style karo
            </h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <div className="lbl">QR ka rang</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {FG_PRESETS.map((c) => (
                    <button
                      key={c}
                      aria-label={`Foreground ${c}`}
                      onClick={() => setFg(c)}
                      className={`size-8 rounded-lg border-2 transition-transform hover:scale-110 ${fg === c ? "border-pine scale-110" : "border-ink/15"}`}
                      style={{ background: c }}
                    />
                  ))}
                  <label className="size-8 rounded-lg border-2 border-dashed border-ink/25 overflow-hidden cursor-pointer relative hover:border-pine transition-colors">
                    <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <span className="absolute inset-0 conic-gradient(red, yellow, lime, cyan, blue, magenta, red) opacity-60" />
                  </label>
                </div>
              </div>
              <div>
                <div className="lbl">Background ka rang</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {BG_PRESETS.map((c) => (
                    <button
                      key={c}
                      aria-label={`Background ${c}`}
                      onClick={() => {
                        setBg(c);
                        setTransparent(false);
                      }}
                      className={`size-8 rounded-lg border-2 transition-transform hover:scale-110 ${bg === c && !transparent ? "border-pine scale-110" : "border-ink/15"}`}
                      style={{ background: c }}
                    />
                  ))}
                  <label className="size-8 rounded-lg border-2 border-dashed border-ink/25 overflow-hidden cursor-pointer relative hover:border-pine transition-colors">
                    <input
                      type="color"
                      value={bg}
                      onChange={(e) => {
                        setBg(e.target.value);
                        setTransparent(false);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span className="absolute inset-0 conic-gradient(red, yellow, lime, cyan, blue, magenta, red) opacity-60" />
                  </label>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
                  <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="size-4 accent-[#0b6b45]" />
                  Transparent background
                </label>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-dashed border-ink/15 grid sm:grid-cols-2 gap-5">
              <div>
                <div className="lbl">Error correction</div>
                <div className="grid grid-cols-4 rounded-xl border border-ink/15 overflow-hidden">
                  {(Object.keys(EC_INFO) as EC[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setEc(lvl)}
                      className={`py-2 text-sm font-bold transition-colors ${ec === lvl ? "bg-pine text-white" : "bg-white/60 text-ink/55 hover:bg-pine/10"}`}
                    >
                      {lvl}
                      <span className={`block text-[9px] font-semibold ${ec === lvl ? "text-white/70" : "text-ink/35"}`}>{EC_INFO[lvl]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="lbl">
                  Download size — <span className="text-pine font-extrabold">{size}×{size}px</span>
                </div>
                <input
                  type="range"
                  min={160}
                  max={1024}
                  step={16}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-[#0b6b45] mt-3"
                />
                <div className="flex justify-between text-[10px] text-ink/40 font-semibold mt-1">
                  <span>160px</span>
                  <span>1024px</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- preview ---------------- */}
        <div className="lg:sticky lg:top-24">
          <div className="bg-paper border border-ink/15 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(20,38,30,.15)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">Preview</h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  dataUrl ? "bg-pine/12 text-pine" : "bg-ink/8 text-ink/45"
                }`}
              >
                {dataUrl ? "● TAYYAR" : "○ INTEZAAR"}
              </span>
            </div>

            <div className={`rounded-xl border border-ink/12 p-6 flex items-center justify-center min-h-[280px] ${transparent ? "checker" : "bg-white"}`}>
              {dataUrl ? (
                <img src={dataUrl} alt="Generated QR code" className="qr-img w-full max-w-[260px] rounded-md" />
              ) : (
                <div className="text-center text-ink/40 py-6">
                  <Icon name="qr" size={56} className="mx-auto mb-3 opacity-60" />
                  <p className="font-semibold text-ink/55">Yahan kuch bhi likho…</p>
                  <p className="text-sm mt-1">QR code foran ban jayega ⚡</p>
                </div>
              )}
            </div>

            {err && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-chili/10 border border-chili/30 px-3 py-2.5 text-[13px] text-chili font-medium">
                <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
                {err}
              </div>
            )}

            <div className="mt-3 text-center text-[11px] text-ink/45 font-medium">
              {payload.length} chars · EC level {ec} ({EC_INFO[ec]}) · export {size}×{size}px
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={downloadPng}
                disabled={!dataUrl}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-pine text-white font-bold py-3 text-sm hover:bg-pine-deep active:scale-[.98] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-[0_6px_18px_-6px_rgba(11,107,69,.7)]"
              >
                <Icon name="download" size={17} />
                Download PNG
              </button>
              <button
                onClick={downloadSvg}
                disabled={!dataUrl}
                className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink/20 bg-white/70 font-bold py-2.5 text-sm hover:border-pine hover:text-pine active:scale-[.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Icon name="image" size={16} />
                SVG
              </button>
              <button
                onClick={copyImage}
                disabled={!dataUrl}
                className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink/20 bg-white/70 font-bold py-2.5 text-sm hover:border-pine hover:text-pine active:scale-[.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Icon name="copy" size={16} />
                Copy
              </button>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed text-ink/50 bg-bg/80 rounded-lg px-3 py-2.5 border border-ink/8">
              💡 Tip: hamesha <strong>dark QR + light background</strong> rakho, tabhi scanner parhega. Error correction
              barhao agar QR kahin print karna ho.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
