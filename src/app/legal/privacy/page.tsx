export const metadata = { title: "Privacy — ExamReady" };

export default function PrivacyPage() {
  return (
    <div className="prose flex max-w-2xl flex-col gap-4 text-sm text-[var(--foreground)]">
      <h1 className="font-pixel text-xl">Privacy</h1>
      <p className="text-xs text-[var(--foreground-muted)]">
        Draft template — not reviewed by a lawyer. Replace with a full PDPA
        (Malaysia) / GDPR-compliant policy before any commercial launch or
        before adding accounts, a database, or analytics.
      </p>

      <h2 className="font-medium">Before you log in</h2>
      <p>
        The landing page is the only part of the site you can see without an
        account, and it collects nothing. Your theme and accessibility
        preferences are kept in your browser&apos;s local storage and are
        never transmitted to us.
      </p>

      <h2 className="font-medium">When you log in</h2>
      <p>
        An account is required to reach the study material, quizzes,
        flashcards, and progress tracking. We store your email address and a
        session record so we can recognise you, the starter ExamPal you chose
        and any nickname you gave it, and a copy of your quiz attempts and
        flashcard progress so it is available on your other devices. A copy is
        also kept in your browser&apos;s local storage so the site works
        offline, and the two are kept in sync. We do not use this data for
        advertising and we do not sell it.
      </p>
      <p>
        Data is processed by a small number of service providers on our
        behalf: <span className="font-medium">Supabase</span> (database
        hosting), <span className="font-medium">Vercel</span> (application
        hosting), and <span className="font-medium">Resend</span> (sending
        your sign-in email). Their servers may be located outside Malaysia.
      </p>

      <h2 className="font-medium">Clearing your data</h2>
      <p>
        You can clear your progress at any time from the{" "}
        <span className="font-medium">Trainer</span> page, which deletes both
        the copy on your account and the one in this browser.
      </p>
      <p>
        On the <span className="font-medium">Options</span> page you can
        download everything we hold about you as a JSON file, or permanently
        delete your account. Deletion removes your profile, your ExamPal, and
        all of your progress from our servers and from this browser
        immediately — there is no grace period and no backup we can restore
        from, so export first if you want a copy. If any of that fails, you can
        still reach us at{" "}
        <span className="font-medium">qcseak@gmail.com</span>.
      </p>

      <h2 className="font-medium">What we do not do</h2>
      <p>
        There is no analytics tracking, no advertising, and no third-party
        tracking cookies on this site. The only cookie set is the one that
        keeps you logged in.
      </p>
    </div>
  );
}
