import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isPalType } from "@/lib/pals";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      // Sent from a verified subdomain (SPF/DKIM configured in Resend),
      // separate from prolymax.com's main mail flow.
      from: "ExamReady <sign-in@mail.prolymax.com>",
    }),
  ],
  session: { strategy: "database" },
  pages: {
    verifyRequest: "/login/check-email",
    // Auth.js's own built-in error page (/api/auth/error) 500s in this
    // Next.js/Auth.js beta combination, so send errors to our own login
    // page instead, which reads ?error= and shows a friendly message.
    error: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      // The adapter loads the whole User row for database sessions, so the
      // starter comes along for free here. Auth.js's AdapterUser type only
      // describes the columns it owns, hence the narrowing cast.
      const record = user as typeof user & {
        examPal?: string | null;
        examPalName?: string | null;
        expertise?: string | null;
        priorityExam?: string | null;
      };
      session.user.examPal = isPalType(record.examPal) ? record.examPal : null;
      session.user.examPalName = record.examPalName ?? null;
      session.user.expertise = record.expertise ?? null;
      session.user.priorityExam = record.priorityExam ?? null;
      return session;
    },
  },
});
