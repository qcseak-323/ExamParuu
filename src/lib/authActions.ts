"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

/**
 * Sends the magic-link email.
 *
 * Shared by the `/login` page and the START prompt on the landing page so
 * there is one sign-in implementation rather than two that can drift apart.
 *
 * `signIn` signals success by throwing a redirect, which is not an AuthError
 * and so falls through to the rethrow — that is what carries the visitor to
 * the check-your-email page.
 */
export async function sendSignInLink(formData: FormData): Promise<void> {
  try {
    await signIn("resend", formData);
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=${err.type}`);
    }
    throw err;
  }
}
