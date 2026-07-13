"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function generateEmail(username: string) {
    return `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@polycrack.local`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const email = generateEmail(username);

    if (mode === "signup") {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) {
        setMessage(error.message);
      } else if (data.user) {
        setMessage("Account created! Redirecting...");
        setTimeout(() => (window.location.href = "/"), 1000);
      }
    } else {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Signed in! Redirecting...");
        setTimeout(() => (window.location.href = "/"), 1000);
      }
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          Poly<span className="text-poly-highlight">Crack</span>
        </h1>
        <p className="mt-2 text-poly-muted">
          {mode === "signup"
            ? "Create an account to start predicting"
            : "Sign in to your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass space-y-4 rounded-xl p-6">
        <div>
          <label className="mb-1 block text-sm text-poly-muted">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
            placeholder="crack_predictor"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-poly-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
            placeholder="At least 6 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-poly-highlight py-3 font-semibold text-white transition hover:bg-poly-highlight/80 disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : mode === "signup"
              ? "Sign Up (Get 1000 Points)"
              : "Sign In"}
        </button>

        {message && (
          <p className="text-center text-sm text-poly-muted">{message}</p>
        )}
      </form>

      <div className="text-center text-sm text-poly-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              onClick={() => setMode("login")}
              className="text-poly-highlight hover:underline"
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <button
              onClick={() => setMode("signup")}
              className="text-poly-highlight hover:underline"
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </div>
  );
}
