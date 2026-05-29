import { QuizForm } from "@/components/admin/quiz-form";

export default function NewQuizPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Quiz</h1>
        <p className="text-slate-500 mt-1">Set up a new quiz for your candidates</p>
      </div>
      <QuizForm />
    </div>
  );
}
