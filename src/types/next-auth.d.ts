import type { DefaultSession } from "next-auth";
import type { PalType } from "@/lib/pals";

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
    } & DefaultSession["user"];
  }
}
