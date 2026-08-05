-- Append-only log of learning actions (lessons read, flashcards reviewed).
--
-- A NEW TABLE, deliberately: the currently-deployed build has no knowledge of
-- it and is completely unaffected, so this is safe to apply against the shared
-- production database ahead of the code that reads it.
--
-- The unique constraint on (userId, clientId) is what makes repeat syncs
-- idempotent. clientId is deterministic on the client ("kind:exam:ref:day"),
-- so the same action pushed from two devices collapses to one row.
CREATE TABLE "LearningEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "examCode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningEvent_userId_clientId_key"
    ON "LearningEvent"("userId", "clientId");

CREATE INDEX "LearningEvent_userId_examCode_idx"
    ON "LearningEvent"("userId", "examCode");

ALTER TABLE "LearningEvent"
    ADD CONSTRAINT "LearningEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
