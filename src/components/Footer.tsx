export default function Footer() {
  return (
    <footer className="mt-auto border-t border-black/10 px-4 py-6 text-center text-xs text-black/50 dark:border-white/10 dark:text-white/50">
      <p>
        ExamReady is an independent study resource and is not affiliated
        with, endorsed by, or sponsored by Microsoft. All practice questions
        are original and written for study purposes only. For the official,
        current DP-600 skills outline, see{" "}
        <a
          href="https://learn.microsoft.com/en-us/credentials/certifications/exams/dp-600/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-indigo-600"
        >
          Microsoft Learn
        </a>
        .
      </p>
    </footer>
  );
}
