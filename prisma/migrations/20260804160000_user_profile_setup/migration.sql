-- Profile answers collected during first-run setup.
--
-- Both columns are nullable with no default, so this is additive and
-- backward compatible: the currently-deployed build simply never selects
-- them. Existing trainers keep NULLs, which read as "not answered" rather
-- than as a wrong answer.
ALTER TABLE "User" ADD COLUMN "expertise" TEXT;
ALTER TABLE "User" ADD COLUMN "priorityExam" TEXT;
