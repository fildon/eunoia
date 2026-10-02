"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    if (error) {
      console.error("signInWithOtp failed:", error);
      setErrorMessage(
        error.code === "over_email_send_rate_limit"
          ? "Too many sign-in attempts. Please wait a bit before trying again."
          : error.message,
      );
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Eunoia</h1>
        <p className="text-muted">
          Your daily mood tracker
        </p>
      </div>

      {status === "sent" ? (
        <p
          role="status"
          aria-live="polite"
          className="max-w-xs text-center text-sm text-muted"
        >
          Check your inbox at <span className="font-medium text-ink">{email}</span> for
          a sign-in link.
        </p>
      ) : (
        <form
          onSubmit={sendMagicLink}
          className="flex w-full max-w-xs flex-col gap-3"
        >
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="focus-ring rounded-full bg-pill px-4 py-2.5 text-sm font-medium text-pill-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-faint"
          >
            {status === "sending" ? "Sending..." : "Send sign-in link"}
          </button>
          {status === "error" && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-sm text-danger"
            >
              {errorMessage ?? "Something went wrong. Please try again."}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
