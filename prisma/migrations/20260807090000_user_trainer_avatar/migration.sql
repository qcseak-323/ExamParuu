-- The trainer sprite chosen during first-run setup ("boy" | "girl").
--
-- Nullable with no default, so this is additive and backward compatible:
-- the currently-deployed build never selects it, and existing trainers keep
-- NULL, which the app reads as "not chosen yet" (they can pick one by
-- restarting the journey, or are shown a neutral fallback).
ALTER TABLE "User" ADD COLUMN "trainerAvatar" TEXT;
