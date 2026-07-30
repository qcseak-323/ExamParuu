import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      // Resend's shared test domain works without verifying your own
      // domain, but can only deliver to the email on your Resend account
      // until you verify a domain. Swap this once you do.
      from: "ExamReady <onboarding@resend.dev>",
    }),
  ],
  session: { strategy: "database" },
  pages: {
    verifyRequest: "/login/check-email",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
