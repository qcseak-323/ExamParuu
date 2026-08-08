"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TRAINER_AVATARS, type TrainerAvatar } from "@/lib/profile";
import { updateTrainerProfile } from "@/lib/actions";
import PalSprite from "@/components/PalSprite";
import { useSfx } from "@/components/AudioProvider";

const MAX_LENGTH = 14;

/**
 * Editing the parts of a profile that are just identity.
 *
 * Setup asks for these once, and before this the only way to change them was
 * restarting the journey — which deletes every attempt to do it. Profiles
 * created before the avatar and trainer-name steps existed could not fill
 * them in at all.
 *
 * Deliberately not here: the starter and the pinned route. Those are choices
 * a trainer lives with, and both already have their own doors (the pinned
 * route through the map, the starter through restart journey).
 */
export default function TrainerProfileSection({
  currentName,
  currentAvatar,
  currentNickname,
  palName,
}: {
  currentName: string | null;
  currentAvatar: TrainerAvatar | null;
  currentNickname: string | null;
  /** The starter's species name, used as the nickname placeholder. */
  palName: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const playSfx = useSfx();

  const [name, setName] = useState(currentName ?? "");
  const [avatar, setAvatar] = useState<TrainerAvatar | null>(currentAvatar);
  const [nickname, setNickname] = useState(currentNickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== (currentName ?? "") ||
    avatar !== currentAvatar ||
    nickname !== (currentNickname ?? "");

  async function save() {
    if (!avatar) {
      setError("Pick a trainer sprite.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateTrainerProfile({
      trainerName: name,
      trainerAvatar: avatar,
      nickname,
    });

    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }

    playSfx("confirm");
    setSaved(true);
    setSaving(false);
    // The name and sprite are read from the session, so it has to be
    // refetched before the ribbon and trainer card show the new ones.
    await update();
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-pixel text-title">Trainer</h2>
        <p className="mt-1 text-caption text-[var(--foreground-muted)]">
          Your name, your sprite, and what you call your Paruu. Changing these
          keeps every battle you&apos;ve fought.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TRAINER_AVATARS.map((option) => {
          const picked = avatar === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={picked}
              onMouseEnter={() => playSfx("cursor")}
              onClick={() => {
                playSfx("confirm");
                setAvatar(option.id);
                setSaved(false);
              }}
              className={`select-card flex items-center gap-3 p-4 text-left ${
                picked ? "select-card--picked" : ""
              }`}
            >
              <PalSprite sheet={option.sheet} size={48} />
              <span>
                <span className="block text-body font-medium">
                  {option.label}
                </span>
                <span className="block text-caption text-[var(--foreground-muted)]">
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="pixel-panel grid gap-2 p-4">
          <label
            htmlFor="edit-trainer-name"
            className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]"
          >
            Trainer name
          </label>
          <input
            id="edit-trainer-name"
            value={name}
            maxLength={MAX_LENGTH}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder={`Up to ${MAX_LENGTH} letters`}
            className="min-h-11 w-full rounded-md bg-[var(--panel-raised)] px-3 py-2 text-body"
            style={{ border: "2px solid var(--border)" }}
          />
        </div>

        <div className="pixel-panel grid gap-2 p-4">
          <label
            htmlFor="edit-pal-nickname"
            className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]"
          >
            Paruu nickname{" "}
            <span className="font-normal normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <input
            id="edit-pal-nickname"
            value={nickname}
            maxLength={MAX_LENGTH}
            onChange={(e) => {
              setNickname(e.target.value);
              setSaved(false);
            }}
            placeholder={palName}
            className="min-h-11 w-full rounded-md bg-[var(--panel-raised)] px-3 py-2 text-body"
            style={{ border: "2px solid var(--border)" }}
          />
        </div>
      </div>

      {error && <p className="text-body text-[var(--danger)]">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="pixel-button w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save trainer"}
        </button>
        {saved && !dirty && (
          <p className="text-caption text-[var(--success)]" role="status">
            Saved.
          </p>
        )}
      </div>
    </section>
  );
}
