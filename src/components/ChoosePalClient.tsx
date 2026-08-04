"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PAL_SPECIES, PAL_TYPES, type PalType } from "@/lib/pals";
import { chooseExamPal } from "@/lib/actions";
import PixelSprite from "@/components/PixelSprite";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import MenuList from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";

type Phase = "intro" | "select" | "confirm" | "nickname" | "saving";

const INTRO_LINES = [
  "Hello there! Welcome to the world of certification.",
  "My name is Prof. Sequel. I study the exams that people take to prove what they know.",
  "This world is inhabited by creatures called ExamPals. They study alongside you, and they grow stronger the more you practise.",
  "You'll need one of your own before you set out. Go on — take a look at the three in front of you.",
];

export default function ChoosePalClient({ email }: { email: string | null }) {
  const router = useRouter();
  const { update } = useSession();
  const playSfx = useSfx();

  const [phase, setPhase] = useState<Phase>("intro");
  const [choice, setChoice] = useState<PalType | null>(null);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  const species = choice ? PAL_SPECIES[choice] : null;
  const starter = species?.stages[0] ?? null;

  async function commit(finalNickname: string | null) {
    if (!choice) return;
    setPhase("saving");
    setError(null);

    const result = await chooseExamPal(choice, finalNickname);
    if (!result.ok) {
      setError(result.error);
      setPhase("nickname");
      return;
    }

    playSfx("levelUp");
    // The starter lives on the session, so it has to be refetched before the
    // guard on the next page will see it — otherwise requireTrainer bounces
    // straight back here.
    await update();
    router.replace("/catalog");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="sr-only">Choose your ExamPal</h1>

      {/* The three pals stay on screen from the select step onwards, so the
          dialogue below always has something to refer to. */}
      {phase !== "intro" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {PAL_TYPES.map((type) => {
            const candidate = PAL_SPECIES[type];
            const [first] = candidate.stages;
            const isChosen = choice === type;
            const dimmed = choice !== null && !isChosen;

            return (
              <div
                key={type}
                className={`pixel-panel flex flex-col items-center gap-2 p-4 text-center ${
                  dimmed ? "opacity-40" : ""
                } ${isChosen ? "ring-4 ring-[var(--accent)]" : ""}`}
              >
                <div className={isChosen ? "pal-idle" : ""}>
                  <PixelSprite
                    sprite={first.sprite}
                    palette={candidate.palette}
                    size={80}
                    title={`${first.name}, the ${candidate.label}-type starter`}
                  />
                </div>
                <p className="font-pixel text-[10px]">{first.name}</p>
                <p className="text-xs text-[var(--accent)]">
                  {candidate.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {phase === "intro" && (
        <DialogueBox
          speaker="PROF. SEQUEL"
          lines={INTRO_LINES}
          onDone={() => setPhase("select")}
        />
      )}

      {phase === "select" && (
        <>
          <DialogueFrame>
            <p className="font-pixel mb-2 text-[10px] text-[var(--accent)]">
              PROF. SEQUEL
            </p>
            <p className="text-sm leading-relaxed">
              Which one will it be? Take your time — this one stays with you.
            </p>
          </DialogueFrame>

          <MenuList
            ariaLabel="Choose your starter ExamPal"
            options={PAL_TYPES.map((type) => ({
              id: type,
              label: `${PAL_SPECIES[type].stages[0].name} — ${PAL_SPECIES[type].label}`,
              hint: PAL_SPECIES[type].tagline,
            }))}
            onSelect={(id) => {
              setChoice(id as PalType);
              setPhase("confirm");
            }}
          />
        </>
      )}

      {phase === "confirm" && species && starter && (
        <>
          <DialogueFrame>
            <p className="font-pixel mb-2 text-[10px] text-[var(--accent)]">
              PROF. SEQUEL
            </p>
            <p className="text-sm leading-relaxed">
              {species.description}
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              So, you want {starter.name}?
            </p>
          </DialogueFrame>

          <MenuList
            ariaLabel={`Confirm ${starter.name}`}
            options={[
              { id: "yes", label: `Yes — ${starter.name} it is` },
              { id: "no", label: "No, let me look again" },
            ]}
            onSelect={(id) => {
              if (id === "yes") {
                setPhase("nickname");
              } else {
                playSfx("back");
                setChoice(null);
                setPhase("select");
              }
            }}
          />
        </>
      )}

      {(phase === "nickname" || phase === "saving") && species && starter && (
        <>
          <DialogueFrame>
            <p className="font-pixel mb-2 text-[10px] text-[var(--accent)]">
              PROF. SEQUEL
            </p>
            <p className="text-sm leading-relaxed">
              {starter.name} is yours. Would you like to give it a nickname?
            </p>
            {email && (
              <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                Saving to {email}.
              </p>
            )}
          </DialogueFrame>

          {error && (
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              commit(nickname.trim() || null);
            }}
            className="flex flex-col gap-3"
          >
            <label htmlFor="nickname" className="text-sm font-medium">
              Nickname{" "}
              <span className="font-normal text-[var(--foreground-muted)]">
                (optional)
              </span>
            </label>
            <input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={14}
              placeholder={starter.name}
              disabled={phase === "saving"}
              className="w-full max-w-xs rounded-md border-3 border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
              style={{ borderWidth: 3 }}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={phase === "saving"}
                className="pixel-button rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
              >
                {phase === "saving" ? "Saving…" : "Set off ▶"}
              </button>
              <button
                type="button"
                disabled={phase === "saving"}
                onClick={() => commit(null)}
                className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Skip nickname
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
