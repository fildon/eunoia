"use client";

import { useEffect, useRef, useState } from "react";

// The charts lay themselves out in SVG pixels, so they need their
// container's width. 0 until measured (including during SSR), which callers
// treat as "don't draw yet".
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(Math.floor(element.getBoundingClientRect().width));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
