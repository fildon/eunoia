"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TIME_ZONE_COOKIE } from "@/lib/date";

// Mirrors the device's time zone into the `tz` cookie (read server-side by
// lib/timeZone.ts), and re-renders the page if the server rendered it for a
// different zone — e.g. on first visit, or after landing somewhere new with
// the app left open.
export function TimeZoneSync({ serverTimeZone }: { serverTimeZone: string }) {
  const router = useRouter();
  const serverTimeZoneRef = useRef(serverTimeZone);
  const refreshedForRef = useRef<string | null>(null);

  useEffect(() => {
    serverTimeZoneRef.current = serverTimeZone;
  }, [serverTimeZone]);

  useEffect(() => {
    function sync() {
      const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!deviceTimeZone) return;

      // IANA zone names only use cookie-safe characters, so no encoding.
      document.cookie = `${TIME_ZONE_COOKIE}=${deviceTimeZone}; path=/; max-age=31536000; samesite=lax`;

      // Only refresh once per zone, so a zone the server can't use (and
      // falls back from) can't cause a refresh loop.
      if (
        deviceTimeZone !== serverTimeZoneRef.current &&
        refreshedForRef.current !== deviceTimeZone
      ) {
        refreshedForRef.current = deviceTimeZone;
        router.refresh();
      }
    }

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);

    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [router]);

  return null;
}
