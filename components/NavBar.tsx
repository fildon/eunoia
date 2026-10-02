"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/trends", label: "Trends" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login" || pathname.startsWith("/auth")) {
    return null;
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav aria-label="Main" className="border-b border-line bg-canvas">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="font-semibold tracking-tight">Eunoia</span>
          <div className="flex gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`focus-ring rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-pill text-pill-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          onClick={signOut}
          className="focus-ring rounded-full px-3 py-1.5 text-sm text-muted transition hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
