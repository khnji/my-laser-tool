import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sampleMango from "../assets/sample-mango.jpg";
import {
  autoRemoveEdges,
  compositeWithMask,
  loadImageFromBlob,
  removeSimilarGlobal,
  wandRemoveAt,
} from "../lib/imaging";
import { Icon } from "../lib/icons";
import { useToast } from "./Toasts";

export default function BGTool() {
  const toast = useToast();
  const [img, setImg] = useState<ImageData | null>(null);
  const [name, setName] = useState("");
  const [mask, setMask] = useState<Uint8Array | null>(null);
  const [mode, setMode] = useState<"auto" | "wand">("auto");
  const [tolerance, setTolerance] = useState(48);
  const [contiguous, setContiguous] = useState(true);
  const [smooth, setSmooth] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hist, setHist] = useState<Uint8Array[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const maskRef = useRef<Uint8Array | null>(null);
  imgRef.current = img;
  maskRef.current = mask;

  // paint canvas whenever image / mask / smooth changes
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(compositeWithMask(img, mask, smooth), 0, 0);
  }, [img, mask, smooth]);

  const loadBlob = useCallback(
    async (blob: Blob, fname: string) => {
      try {
        setBusy("loading");
        await new Promise((r) => setTimeout(r, 30));
        const data = await loadImageFromBlob(blob);
        setImg(data);
        setName(fname);
        setMask(new Uint8Array(data.width * data.height));
        setHist([]);
        toast("Tasveer load ho gayi ✓");
      } catch {
        toast("Image load nahi hui — PNG/JPG/WebP try karo");
      }
      setBusy(null);
    },
    [toast]
  );

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch(sampleMango);
      await loadBlob(await res.blob(), "chaunsa-mango-demo.jpg");
    } catch {
      toast("Sample load nahi hua");
    }
  }, [loadBlob, toast]);

  // start with the mango demo so the tool is alive on first visit
  useEffect(() => {
    loadSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = (f: File | null | undefined) => {
    if (f && f.type.startsWith("image/")) loadBlob(f, f.name);
    else if (f) toast("Sirf image files chalti hain");
  };

  const commit = (next: Uint8Array) => {
    const prev = maskRef.current;
    if (prev) setHist((h) => [...h.slice(-7), prev.slice()]);
    setMask(next);
  };

  const runAuto = async () => {
    const base = imgRef.current;
    if (!base) return;
    setBusy("auto");
    await new Promise((r) => setTimeout(r, 40));
    const next = (maskRef.current ?? new Uint8Array(base.width * base.height)).slice();
    autoRemoveEdges(base, next, tolerance);
    commit(next);
    setBusy(null);
    toast("Background remove ho gaya ✓");
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const base = imgRef.current;
    if (mode !== "wand" || !base) return;
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = Math.min(base.width - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * base.width)));
    const y = Math.min(base.height - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * base.height)));
    const next = (maskRef.current ?? new Uint8Array(base.width * base.height)).slice();
    if (contiguous) wandRemoveAt(base, next, x, y, tolerance);
    else removeSimilarGlobal(base, next, x, y, tolerance);
    commit(next);
  };

  const undo = () => {
    if (!hist.length) return;
    const prev = hist[hist.length - 1];
    setHist((h) => h.slice(0, -1));
    setMask(prev);
    toast("Undo ho gaya ↩");
  };

  const restore = () => {
    const base = imgRef.current;
    if (!base) return;
    if (maskRef.current) setHist((h) => [...h.slice(-7), maskRef.current!.slice()]);
    setMask(new Uint8Array(base.width * base.height));
    toast("Original tasveer wapas ✓");
  };

  const exportImage = (type: "png" | "jpg") => {
    const base = imgRef.current;
    if (!base) return;
    const out = compositeWithMask(base, maskRef.current, smooth);
    const tmp = document.createElement("canvas");
    tmp.width = base.width;
    tmp.height = base.height;
    tmp.getContext("2d")!.putImageData(out, 0, 0);
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = base.width;
    finalCanvas.height = base.height;
    const ctx = finalCanvas.getContext("2d")!;
    if (type === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }
    ctx.drawImage(tmp, 0, 0);
    finalCanvas.toBlob(
      (b) => {
        if (!b) return;
        const href = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = href;
        a.download = type === "png" ? "banaobox-transparent.png" : "banaobox-white-bg.jpg";
        a.click();
        setTimeout(() => URL.revokeObjectURL(href), 5000);
        toast(type === "png" ? "Transparent PNG download ho gayi ✓" : "White-background JPG download ho gayi ✓");
      },
      type === "png" ? "image/png" : "image/jpeg",
      0.92
    );
  };

  const removedPct = useMemo(() => {
    if (!mask || !img) return 0;
    let n = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
    return Math.round((n / mask.length) * 100);
  }, [mask, img]);

  /* ---------------- drop zone (no image) ---------------- */
  if (!img) {
    return (
      <section>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer bg-paper border-2 border-dashed rounded-2xl px-6 py-16 text-center transition-all duration-300 ${
            dragOver ? "border-pine bg-pine/8 scale-[1.01] shadow-[0_16px_40px_-16px_rgba(11,107,69,.5)]" : "border-ink/25 hover:border-pine/60 hover:shadow-[0_10px_30px_-16px_rgba(20,38,30,.4)]"
          }`}
        >
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="mx-auto size-16 rounded-2xl bg-pine/12 text-pine flex items-center justify-center mb-4">
            {busy === "loading" ? <Icon name="refresh" size={28} className="animate-spin" /> : <Icon name="upload" size={28} />}
          </div>
          <h2 className="font-display text-2xl font-extrabold">Tasveer yahan drop karo</h2>
          <p className="text-ink/55 mt-1.5 text-sm">ya click karke file select karo — PNG, JPG, WebP</p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 rounded-xl bg-pine text-white font-bold px-5 py-2.5 text-sm shadow-[0_6px_18px_-6px_rgba(11,107,69,.7)]">
              <Icon name="image" size={16} />
              File choose karo
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadSample();
              }}
              className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-ink/20 bg-white/70 font-bold px-5 py-2.5 text-sm hover:border-marigold hover:text-ink transition-colors"
            >
              <Icon name="sparkle" size={16} className="text-marigold" />
              Sample aam (mango) try karo
            </button>
          </div>
          <p className="mt-5 text-xs text-ink/40">Sab kuch aap ke browser mein hota hai — koi tasveer upload nahi hoti 🔒</p>
        </div>
      </section>
    );
  }

  /* ---------------- editor ---------------- */
  return (
    <section className="grid gap-5 xl:grid-cols-[340px_1fr] items-start">
      {/* controls */}
      <div className="space-y-4">
        <div className="bg-paper border border-ink/15 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(20,38,30,.15)]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-bold truncate max-w-[60%]" title={name}>{name}</span>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs font-bold text-pine hover:text-pine-deep inline-flex items-center gap-1 shrink-0"
            >
              <Icon name="upload" size={13} />
              Nayi tasveer
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="text-xs text-ink/45 mb-4">
            {img.width}×{img.height}px · {removedPct}% remove ho chuka
          </div>

          <div className="lbl">Kaunsa tareeqa?</div>
          <div className="grid grid-cols-2 rounded-xl border border-ink/15 overflow-hidden mb-4">
            <button
              onClick={() => setMode("auto")}
              className={`py-2.5 text-sm font-bold transition-colors ${mode === "auto" ? "bg-pine text-white" : "bg-white/60 text-ink/55 hover:bg-pine/10"}`}
            >
              ⚡ Auto
            </button>
            <button
              onClick={() => setMode("wand")}
              className={`py-2.5 text-sm font-bold transition-colors ${mode === "wand" ? "bg-pine text-white" : "bg-white/60 text-ink/55 hover:bg-pine/10"}`}
            >
              🪄 Magic Wand
            </button>
          </div>

          <div className="lbl">
            Tolerance — <span className="text-pine font-extrabold">{tolerance}</span>
          </div>
          <input type="range" min={5} max={120} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-full accent-[#0b6b45]" />
          <div className="flex justify-between text-[10px] text-ink/40 font-semibold mb-4">
            <span>Barik (sirf same rang)</span>
            <span>Azad (zyada rang)</span>
          </div>

          {mode === "wand" && (
            <label className="flex items-center gap-2 text-sm text-ink/70 cursor-pointer mb-2">
              <input type="checkbox" checked={contiguous} onChange={(e) => setContiguous(e.target.checked)} className="size-4 accent-[#0b6b45]" />
              Sirf connected area hatao
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
            <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} className="size-4 accent-[#0b6b45]" />
            Kinare smooth karo (feather)
          </label>

          <button
            onClick={runAuto}
            disabled={busy !== null}
            className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-pine text-white font-bold py-3 text-sm hover:bg-pine-deep active:scale-[.98] transition-all disabled:opacity-50 shadow-[0_6px_18px_-6px_rgba(11,107,69,.7)]"
          >
            {busy === "auto" ? <Icon name="refresh" size={16} className="animate-spin" /> : <Icon name="wand" size={16} />}
            {busy === "auto" ? "Remove ho raha hai…" : "Background auto-remove karo"}
          </button>
        </div>

        <div className="bg-paper border border-ink/15 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(20,38,30,.15)]">
          <div className="lbl">Actions</div>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={undo} disabled={!hist.length} className="flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-ink/20 bg-white/70 font-bold py-2.5 text-[13px] hover:border-pine hover:text-pine transition-all disabled:opacity-35 disabled:pointer-events-none">
              <Icon name="undo" size={14} /> Undo
            </button>
            <button onClick={restore} className="flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-ink/20 bg-white/70 font-bold py-2.5 text-[13px] hover:border-chili hover:text-chili transition-all">
              <Icon name="restore" size={14} /> Restore
            </button>
            <button onClick={() => exportImage("png")} className="flex items-center justify-center gap-1.5 rounded-xl bg-ink text-paper font-bold py-2.5 text-[13px] hover:bg-pine-deep transition-colors">
              <Icon name="download" size={14} /> PNG (transparent)
            </button>
            <button onClick={() => exportImage("jpg")} className="flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-ink/20 bg-white/70 font-bold py-2.5 text-[13px] hover:border-pine hover:text-pine transition-all">
              <Icon name="download" size={14} /> JPG (white)
            </button>
          </div>
        </div>

        <div className="bg-marigold/15 border border-marigold/40 rounded-2xl p-4 text-[13px] leading-relaxed text-ink/75">
          <strong className="font-display">Kaise use karein?</strong>
          <br />
          <strong>Auto:</strong> button dabao — kinaron se background dhoondh ke hata dega.
          <br />
          <strong>Wand:</strong> tasveer par us rang par click karo jo hatana hai.
          <br />
          Tolerance zyada = zyada milte-julte rang bhi hatenge.
        </div>
      </div>

      {/* canvas */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        className={`checker relative rounded-2xl border-2 p-4 sm:p-6 flex items-center justify-center min-h-[380px] transition-all ${
          dragOver ? "border-pine shadow-[0_16px_40px_-16px_rgba(11,107,69,.55)]" : "border-ink/15"
        }`}
      >
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          className={`max-w-full max-h-[480px] w-auto h-auto rounded-lg shadow-[0_10px_30px_-10px_rgba(20,38,30,.4)] ${
            mode === "wand" ? "cursor-crosshair" : "cursor-default"
          }`}
        />
        {mode === "wand" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 text-white text-xs font-bold px-4 py-1.5 pointer-events-none flex items-center gap-1.5">
            <Icon name="wand" size={13} className="text-marigold" />
            Background ke rang par click karo
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 rounded-2xl bg-paper/60 backdrop-blur-[2px] flex items-center justify-center">
            <Icon name="refresh" size={30} className="animate-spin text-pine" />
          </div>
        )}
        {dragOver && (
          <div className="absolute inset-0 rounded-2xl bg-pine/15 border-2 border-dashed border-pine flex items-center justify-center font-display font-extrabold text-pine text-lg">
            Chhoro yahan — nayi tasveer load hogi
          </div>
        )}
      </div>
    </section>
  );
}
