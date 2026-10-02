"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Spread onto any SVG mark to give it a tooltip inside a HoverTooltip.
export function tooltipProps(title: string, detail: string) {
  return { "data-tip": title, "data-tip-detail": detail };
}

type Tip = { title: string; detail: string; x: number; y: number };

// One tooltip shared by every chart inside it, driven by the data-tip
// attributes on whatever mark is under the pointer. pointerdown as well as
// pointermove, so a tap shows it on touch screens.
export function HoverTooltip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  function update(event: React.PointerEvent) {
    const target = (event.target as Element).closest?.("[data-tip]");
    if (!target) {
      setTip(null);
      return;
    }
    setTip({
      title: target.getAttribute("data-tip") ?? "",
      detail: target.getAttribute("data-tip-detail") ?? "",
      x: event.clientX,
      y: event.clientY,
    });
  }

  // Place it beside the pointer, flipping to the other side near the
  // viewport's right or bottom edge.
  useLayoutEffect(() => {
    const element = tipRef.current;
    if (!element || !tip) return;
    const { width, height } = element.getBoundingClientRect();
    let x = tip.x + 14;
    let y = tip.y + 14;
    if (x + width > window.innerWidth - 8) x = tip.x - width - 14;
    if (y + height > window.innerHeight - 8) y = tip.y - height - 14;
    element.style.left = `${Math.max(8, x)}px`;
    element.style.top = `${Math.max(8, y)}px`;
  }, [tip]);

  useEffect(() => {
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);

  return (
    <div
      onPointerMove={update}
      onPointerDown={update}
      onPointerLeave={() => setTip(null)}
      className={className}
    >
      {children}
      {tip && (
        <div
          ref={tipRef}
          role="tooltip"
          className="pointer-events-none fixed z-10 max-w-[260px] rounded-[10px] border border-line bg-surface px-[11px] py-2 text-[13px] text-ink shadow-[0_6px_20px_rgb(0_0_0/0.14)]"
        >
          <p className="font-semibold">{tip.title}</p>
          {tip.detail && <p className="text-muted">{tip.detail}</p>}
        </div>
      )}
    </div>
  );
}
