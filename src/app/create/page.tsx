"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

const CATEGORIES = [
  "politics",
  "sports",
  "crypto",
  "tech",
  "entertainment",
  "science",
  "general",
];

export default function CreateMarketPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [marketType, setMarketType] = useState<"binary" | "multi">("binary");
  const [endDate, setEndDate] = useState("");
  const [outcomes, setOutcomes] = useState(["Yes", "No"]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  function addOutcome() {
    if (outcomes.length < 5) {
      setOutcomes([...outcomes, `Option ${outcomes.length + 1}`]);
    }
  }

  function removeOutcome(index: number) {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  }

  function updateOutcome(index: number, value: string) {
    const updated = [...outcomes];
    updated[index] = value;
    setOutcomes(updated);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage("");

    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in to create a market");
      setCreating(false);
      return;
    }

    const res = await fetch("/api/bet", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        description,
        category,
        marketType,
        endDate,
        outcomes,
        creatorId: user.id,
      }),
    });

    const result = await res.json();

    if (result.success) {
      setMessage("Market created! Redirecting...");
      setTimeout(() => router.push("/markets"), 1500);
    } else {
      setMessage(result.error || "Failed to create market");
    }
    setCreating(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Create a Market</h1>
      <p className="text-poly-muted">
        Creating a market costs 10 points. Ask a clear question with a definite
        answer.
      </p>

      <form onSubmit={handleCreate} className="glass space-y-4 rounded-xl p-6">
        <div>
          <label className="mb-1 block text-sm text-poly-muted">
            Question *
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
            placeholder="Will Bitcoin reach $100k by end of 2026?"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-poly-muted">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
            placeholder="Additional context about how this market resolves..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-poly-muted">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-poly-muted">
              End Date
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full rounded-lg border border-poly-border bg-poly-bg px-4 py-2.5 text-white outline-none focus:border-poly-highlight"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-poly-muted">
            Market Type
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMarketType("binary");
                setOutcomes(["Yes", "No"]);
              }}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                marketType === "binary"
                  ? "bg-poly-highlight text-white"
                  : "glass text-poly-muted"
              }`}
            >
              Binary (Yes/No)
            </button>
            <button
              type="button"
              onClick={() => {
                setMarketType("multi");
                setOutcomes(["Option 1", "Option 2", "Option 3"]);
              }}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                marketType === "multi"
                  ? "bg-poly-highlight text-white"
                  : "glass text-poly-muted"
              }`}
            >
              Multi-Outcome (Up to 5)
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-poly-muted">Outcomes</label>
          <div className="space-y-2">
            {outcomes.map((outcome, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(i, e.target.value)}
                  required
                  disabled={marketType === "binary"}
                  className="flex-1 rounded-lg border border-poly-border bg-poly-bg px-4 py-2 text-white outline-none focus:border-poly-highlight disabled:opacity-50"
                />
                {marketType === "multi" && outcomes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOutcome(i)}
                    className="rounded-lg p-2 text-poly-red transition hover:bg-poly-red/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {marketType === "multi" && outcomes.length < 5 && (
            <button
              type="button"
              onClick={addOutcome}
              className="mt-2 text-sm text-poly-highlight hover:underline"
            >
              + Add outcome
            </button>
          )}
        </div>

        <div className="rounded-lg bg-poly-accent/30 p-3 text-sm text-poly-muted">
          Cost: 10 points | Each outcome starts at{" "}
          {marketType === "binary"
            ? "50%"
            : `${Math.round(100 / outcomes.length)}%`}
        </div>

        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-lg bg-poly-highlight py-3 font-semibold text-white transition hover:bg-poly-highlight/80 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Market"}
        </button>

        {message && (
          <p className="text-center text-sm text-poly-muted">{message}</p>
        )}
      </form>
    </div>
  );
}
