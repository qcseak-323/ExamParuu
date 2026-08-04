-- Add a client-generated id so a quiz attempt can be reconciled between
-- localStorage and the database without duplicating on repeat syncs, plus
-- the original local timestamp the attempt was taken at.
-- Safe as NOT NULL without a default: QuizAttempt had no rows at this point.
ALTER TABLE "QuizAttempt" ADD COLUMN "clientId" TEXT NOT NULL;
ALTER TABLE "QuizAttempt" ADD COLUMN "takenAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_userId_clientId_key" ON "QuizAttempt"("userId", "clientId");
