"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const supabase = getSupabase();

    try {
      if (mode === "signup") {
        // Check username availability first
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .single();

        if (existingUser) {
          setError("Username already taken");
          setLoading(false);
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: undefined, // Disable email confirmation
          },
        });

        if (authError) throw authError;

        if (data.user) {
          // Explicitly create profile (bypass trigger)
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              email,
              username,
              points_balance: 1000,
              total_earned: 1000,
              total_spent: 0,
              markets_created: 0,
              bets_placed: 0,
              is_admin: false,
            });

          if (profileError) console.error("Profile creation:", profileError);

          setSuccess("Account created! Signing in...");
          // Auto sign in
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!signInError) {
            setTimeout(() => (window.location.href = "/"), 1000);
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          Poly<span className="text-poly-highlight">Crack</span>
        </h1>
        <p className="mt-2 text-poly-muted">
          {mode === "signup"
            ? "Create an account (1000 free points)"
            : "Sign in to your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass space-y-4 rounded-xl p-6">
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm text-poly-muted">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
              placeholder="pickaname"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-poly-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
            placeholder="you@example.com"
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

        {error && (
          <div className="rounded-lg bg-poly-red/20 p-3 text-sm text-poly-red">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-poly-green/20 p-3 text-sm text-poly-green">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-poly-highlight py-3 font-semibold text-white transition hover:bg-poly-highlight/80 disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : mode === "signup"
              ? "Create Account"
              : "Sign In"}
        </button>
      </form>

      <div className="text-center text-sm text-poly-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              onClick={() => setMode("signin")}
              className="text-poly-highlight hover:underline"
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            Need an account?{" "}
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