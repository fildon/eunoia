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
        <h1 className="text-2xl font-semibold">Eunoia</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your daily mood tracker
        </p>
      </div>

      {status === "sent" ? (
        <p
          role="status"
          aria-live="polite"
          className="max-w-xs text-center text-sm text-gray-600 dark:text-gray-300"
        >
          Check your inbox at <span className="font-medium">{email}</span> for
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
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            {status === "sending" ? "Sending..." : "Send sign-in link"}
          </button>
          {status === "error" && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {errorMessage ?? "Something went wrong. Please try again."}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
