"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartQuizButton({ token, resuming }: { token: string; resuming: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/candidate/${token}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_submitted") {
          router.push(`/quiz/${token}/result`);
          return;
        }
        setError(data.error || "Failed to start quiz");
        return;
      }
      router.push(`/quiz/${token}/take`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleStart} loading={loading} size="lg" className="w-full">
        {resuming ? "Resume Quiz" : "Start Quiz"}
      </Button>
    </div>
  );
}
