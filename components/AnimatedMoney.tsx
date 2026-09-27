"use client";

// A money figure that counts up (or down) when its value changes, and briefly
// shows the delta ("+€65.40") next to it. First render is static.
import { useEffect, useRef, useState } from "react";
import { eur } from "@/lib/earnings";
import { Locale } from "@/lib/i18n";

export default function AnimatedMoney({ value, locale, showDelta = false, deltaColor = "#fff" }: {
  value: number; locale: Locale; showDelta?: boolean; deltaColor?: string;
}) {
  const [shown, setShown] = useState(value);
  const [delta, setDelta] = useState<{ key: number; amount: number } | null>(null);
  const prev = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (showDelta && value > from) {
      setDelta({ key: Date.now(), amount: value - from });
    }
    if (reduce) { setShown(value); return; }
    const start = performance.now();
    const dur = 1100, lag = 250;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start - lag) / dur));
      setShown(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, showDelta]);

  useEffect(() => {
    if (!delta) return;
    const id = setTimeout(() => setDelta(null), 2600);
    return () => clearTimeout(id);
  }, [delta]);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "baseline", gap: 10 }}>
      <span className="figure">{eur(shown, locale)}</span>
      {delta && (
        <span key={delta.key} className="figure" style={{
          fontSize: "0.4em", fontWeight: 700, color: deltaColor, padding: "3px 8px", borderRadius: 999,
          background: "rgba(255,255,255,0.18)", animation: "delta-pop 2.6s ease-out forwards", whiteSpace: "nowrap",
        }}>
          +{eur(delta.amount, locale)}
        </span>
      )}
    </span>
  );
}
