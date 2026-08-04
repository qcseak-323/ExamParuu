-- Adds the chosen starter companion to each trainer.
--
-- Both columns are nullable and have no default, so this is additive and
-- backward compatible: the currently-deployed build simply never selects
-- them. A NULL "examPal" is meaningful — it marks a trainer who has not yet
-- been through the starter-select screen.
ALTER TABLE "User" ADD COLUMN "examPal" TEXT;
ALTER TABLE "User" ADD COLUMN "examPalName" TEXT;
