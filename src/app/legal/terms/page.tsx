export const metadata = { title: "Terms of Use — ExamReady" };

export default function TermsPage() {
  return (
    <div className="prose flex max-w-2xl flex-col gap-4 text-sm text-[var(--foreground)]">
      <h1 className="font-pixel text-xl">Terms of Use</h1>
      <p className="text-xs text-[var(--foreground-muted)]">
        Draft template — not reviewed by a lawyer. Replace before any
        commercial launch.
      </p>

      <p>
        ExamReady is an independent, unofficial study resource. It is not
        affiliated with, endorsed by, or sponsored by Microsoft Corporation.
        &quot;Microsoft,&quot; exam codes (such as DP-600 and AB-900), and
        related certification names are trademarks of Microsoft; they are
        used here only to describe the subject matter of the practice
        content.
      </p>

      <h2 className="font-medium">Content</h2>
      <p>
        All practice questions, explanations, flashcards, and study guide
        text on this site are original work, written from Microsoft&apos;s
        publicly published skills-measured outlines. Nothing on this site
        reproduces actual exam questions, which are confidential under
        Microsoft&apos;s exam NDA.
      </p>

      <h2 className="font-medium">No guarantee</h2>
      <p>
        Practice scores on this site are a study aid, not a guarantee of
        passing any real Microsoft certification exam. Exam blueprints and
        content change over time; always cross-check against the current
        official skills outline on Microsoft Learn before your exam.
      </p>

      <h2 className="font-medium">Local data</h2>
      <p>
        Quiz history, flashcard progress, and preferences are currently
        stored only in your browser&apos;s local storage on this device. No
        account exists yet, and no personal data is transmitted to a server.
      </p>

      <h2 className="font-medium">Changes</h2>
      <p>
        These terms may change as the site adds features (accounts, saved
        progress across devices, paid tiers). Material changes will be
        reflected on this page.
      </p>
    </div>
  );
}
