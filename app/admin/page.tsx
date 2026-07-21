"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="mt-2 text-slate-600">
        Enter your email to receive a sign-in link.
      </p>

      {status === "sent" ? (
        <p className="mt-6 rounded-md bg-green-50 px-4 py-3 text-green-800">
          Check your email for a sign-in link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600">
              Something went wrong. Try again.
            </p>
          )}
        </form>
      )}
    </main>
  );
}
