/**
 * States where progress actually lives.
 *
 * Every page that renders this is behind a session check now, so there is no
 * signed-out branch left to describe. It stays a component rather than inline
 * copy so the wording is defined in exactly one place.
 */
export default function StorageNotice() {
  return (
    <p className="prose-measure mt-3 text-body text-[var(--foreground-muted)]">
      Saved to your trainer profile, so it follows you across devices, and kept
      in this browser for offline use.
    </p>
  );
}
