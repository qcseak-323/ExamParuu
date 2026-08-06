export const metadata = { title: "Check your email — ExamReady" };

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 text-center">
      <h1 className="font-pixel text-display">Check your email</h1>
      <p className="text-body text-[var(--foreground-muted)]">
        We sent you a sign-in link. Click it to finish logging in — you can
        close this tab.
      </p>
    </div>
  );
}
