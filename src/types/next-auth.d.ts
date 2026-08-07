import type { DefaultSession } from "next-auth";
import type { PalType } from "@/lib/pals";
import type { TrainerAvatar } from "@/lib/profile";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /**
       * The trainer's chosen starter, or null if they haven't picked yet.
       * Carried on the session so route guards don't need a second query —
       * with the database session strategy the adapter has already loaded
       * the full user row by the time the session callback runs.
       */
      examPal: PalType | null;
      examPalName: string | null;
      /** The trainer sprite chosen during setup, or null for older profiles. */
      trainerAvatar: TrainerAvatar | null;
      expertise: string | null;
      /** Exam code the trainer chose to focus on first. */
      priorityExam: string | null;
    } & DefaultSession["user"];
  }
}
