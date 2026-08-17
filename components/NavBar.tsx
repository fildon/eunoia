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
    <nav
      aria-label="Main"
      className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800"
    >
      <div className="flex items-center gap-4">
        <span className="font-semibold">Eunoia</span>
        <div className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  active
                    ? "font-medium text-blue-600 dark:text-blue-400"
                    : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
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
        className="rounded-md px-3 py-2 text-sm text-gray-600 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-400 dark:hover:text-gray-100"
      >
        Sign out
      </button>
    </nav>
  );
}
