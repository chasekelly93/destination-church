"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PledgeForm() {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "duplicate" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from("pledges").insert({
      full_name: String(form.get("full_name") ?? "").trim(),
      email: String(form.get("email") ?? "")
        .trim()
        .toLowerCase(),
      phone: String(form.get("phone") ?? "").trim(),
      address: String(form.get("address") ?? "").trim() || null,
      amount: Number(form.get("amount")),
    });

    if (!error) {
      setStatus("success");
      return;
    }

    if (error.code === "23505") {
      setStatus("duplicate");
      return;
    }

    setStatus("error");
    setErrorMessage(error.message);
  }

  if (status === "success") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold">Thank you for your pledge!</h1>
        <p className="mt-2 text-slate-600">
          We&apos;ve recorded your commitment to the campaign. You&apos;ll
          hear from us soon.
        </p>
      </main>
    );
  }

  if (status === "duplicate") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold">You&apos;ve already pledged</h1>
        <p className="mt-2 text-slate-600">
          It looks like this email has already submitted a pledge. Pledges
          are one-time — reach out to us directly if you need to make a
          change.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Make Your Pledge</h1>
      <p className="mt-2 text-slate-600">
        Join the campaign by committing your pledge below. This is a
        one-time commitment.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium">
            Address (optional)
          </label>
          <input
            id="address"
            name="address"
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium">
            Pledge amount ($)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {status === "submitting" ? "Submitting…" : "Submit Pledge"}
        </button>
      </form>
    </main>
  );
}
