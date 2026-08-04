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

      <h2 className="font-medium">If you are not logged in</h2>
      <p>
        Everything stays on your own device. Quiz attempt history, flashcard
        mastery, theme and accessibility preferences, and the activity dates
        behind the streak counter are all kept in your browser&apos;s local
        storage. None of it is transmitted to us, and the site operator
        cannot see it. No account is required to use any of the study
        material.
      </p>

      <h2 className="font-medium">If you log in</h2>
      <p>
        Logging in is optional. If you do, we store your email address and a
        session record so we can recognise you, and we save a copy of your
        quiz attempts and flashcard progress to your account so it is
        available on your other devices. Your local copy is kept in sync with
        it. We do not use this data for advertising and we do not sell it.
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
        You can clear locally stored progress at any time from the{" "}
        <span className="font-medium">Progress</span> page, or by clearing
        your browser&apos;s site data for this domain. To delete an account
        and the progress attached to it, email{" "}
        <span className="font-medium">qcseak@gmail.com</span> — self-service
        account deletion and data export are not built yet.
      </p>

      <h2 className="font-medium">What we do not do</h2>
      <p>
        There is no analytics tracking, no advertising, and no third-party
        tracking cookies on this site. The only cookie set is the one that
        keeps you logged in, and it is only set if you choose to log in.
      </p>
    </div>
  );
}
