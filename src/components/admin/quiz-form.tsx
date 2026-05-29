"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QuizFormProps {
  initialData?: {
    id: string;
    title: string;
    description?: string | null;
    instructions: string;
    durationMinutes: number;
    startDate?: string | null;
    endDate?: string | null;
    passingScore?: number | null;
    randomiseQuestions: boolean;
    randomiseOptions: boolean;
    showAnswers: boolean;
  };
}

export function QuizForm({ initialData }: QuizFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || 40);
  const [startDate, setStartDate] = useState(initialData?.startDate?.slice(0, 16) || "");
  const [endDate, setEndDate] = useState(initialData?.endDate?.slice(0, 16) || "");
  const [passingScore, setPassingScore] = useState(initialData?.passingScore?.toString() || "");
  const [randomiseQuestions, setRandomiseQuestions] = useState(initialData?.randomiseQuestions || false);
  const [randomiseOptions, setRandomiseOptions] = useState(initialData?.randomiseOptions || false);
  const [showAnswers, setShowAnswers] = useState(initialData?.showAnswers ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !instructions) {
      setError("Title and instructions are required");
      return;
    }
    setLoading(true);
    setError("");

    const payload = {
      title,
      description: description || null,
      instructions,
      durationMinutes,
      startDate: startDate || null,
      endDate: endDate || null,
      passingScore: passingScore ? Number(passingScore) : null,
      randomiseQuestions,
      randomiseOptions,
      showAnswers,
    };

    try {
      const res = await fetch(
        initialData ? `/api/quiz/${initialData.id}` : "/api/quiz",
        {
          method: initialData ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save quiz");
        return;
      }

      const quiz = await res.json();
      router.push(`/admin/quizzes/${quiz.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Quiz Details</h2>

          <Input
            id="title"
            label="Quiz Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. RCCG Quarterly Bible Quiz"
            required
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="description"
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 resize-none min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview shown in the invitation email"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="instructions" className="text-sm font-medium text-slate-700">
              Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              id="instructions"
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 resize-none min-h-[100px]"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions shown to candidates before the quiz starts"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Timing</h2>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="duration"
              label="Duration (minutes)"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
            <Input
              id="passingScore"
              label="Passing Score (%)"
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              placeholder="e.g. 50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="startDate"
              label="Start Date/Time"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              id="endDate"
              label="End Date/Time"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Options</h2>

          {[
            { id: "randomiseQuestions", label: "Randomise question order", value: randomiseQuestions, set: setRandomiseQuestions },
            { id: "randomiseOptions", label: "Randomise MCQ option order", value: randomiseOptions, set: setRandomiseOptions },
            { id: "showAnswers", label: "Allow candidates to review answers after submission", value: showAnswers, set: setShowAnswers },
          ].map((toggle) => (
            <label key={toggle.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id={toggle.id}
                checked={toggle.value}
                onChange={(e) => toggle.set(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-slate-700">{toggle.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? "Save Changes" : "Create Quiz"}
        </Button>
      </div>
    </form>
  );
}
