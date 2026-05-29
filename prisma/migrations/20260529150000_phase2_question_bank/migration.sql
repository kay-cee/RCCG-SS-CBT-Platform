-- Phase 2: Question Bank
-- Makes quiz_id nullable on questions so a question with no quiz is "in the bank".
-- When a quiz is deleted, its questions move to the bank (SET NULL) rather than
-- being deleted, preserving question history.

-- AlterTable: allow questions to exist without a quiz (question bank)
ALTER TABLE "questions" ALTER COLUMN "quiz_id" DROP NOT NULL;

-- Drop the old CASCADE foreign key
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_quiz_id_fkey";

-- Add new SET NULL foreign key (quiz deleted → questions become bank questions)
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey"
  FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
