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

      <h2 className="font-medium">What this site currently stores</h2>
      <p>
        ExamReady does not yet have user accounts, a server-side database,
        or analytics tracking. The only data saved is stored in your
        browser&apos;s local storage on your own device: quiz attempt
        history, flashcard mastery, theme/accessibility preferences, and
        activity dates used for the streak counter. This data never leaves
        your device and is not visible to the site operator.
      </p>

      <h2 className="font-medium">Clearing your data</h2>
      <p>
        You can clear all locally stored progress at any time from the{" "}
        <span className="font-medium">Progress</span> page, or by clearing
        your browser&apos;s site data for this domain.
      </p>

      <h2 className="font-medium">Future changes</h2>
      <p>
        If accounts, a database, email, or analytics are added later, this
        page will be replaced with a full privacy policy covering what is
        collected, why, how long it is retained, and how to request deletion
        or export — in line with Malaysia&apos;s PDPA 2010 and, for EU
        visitors, GDPR.
      </p>
    </div>
  );
}
