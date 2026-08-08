"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PAL_SPECIES, PAL_TYPES, type PalType } from "@/lib/pals";
import {
  EXPERTISE_OPTIONS,
  TRAINER_AVATARS,
  type ExpertiseLevel,
  type TrainerAvatar,
} from "@/lib/profile";
import { completeProfileSetup } from "@/lib/actions";
import { catalog } from "@/lib/content";
import { getRetroLabel, getDisplayTier } from "@/lib/levels";
import PalSprite from "@/components/PalSprite";
import ProfessorPortrait from "@/components/ProfessorPortrait";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import MenuList from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";
import { useBattleTransition } from "@/components/battle/BattleTransition";

/**
 * First-run profile setup, played as a conversation with the professor.
 *
 * Nothing is written until the final step — see `completeProfileSetup`. A
 * trainer who abandons setup halfway has no profile at all and gets the whole
 * flow again, rather than being let into the app with a starter but no route.
 */
type Step =
  | "intro"
  | "avatar"
  | "pal"
  | "palConfirm"
  | "nickname"
  | "expertise"
  | "expertiseReply"
  | "route"
  | "saving";

const INTRO_LINES = [
  "Hello there! Welcome to the world of certification.",
  "My name is Prof. Sequel. I study the exams people take to prove what they know.",
  "This world is inhabited by creatures called Paruu. They study alongside you, and they grow stronger the more you practise.",
  "Before you set out, let's get you sorted — a partner, a sense of where you're starting from, and a route to walk first.",
];

/** Small progress readout, so the flow doesn't feel open-ended. */
const STEP_ORDER: Step[] = ["avatar", "pal", "expertise", "route"];
function stepNumber(step: Step): number {
  if (step === "intro" || step === "avatar") return 1;
  if (step === "pal" || step === "palConfirm" || step === "nickname") return 2;
  if (step === "expertise" || step === "expertiseReply") return 3;
  return 4;
}

export default function SetupClient({ email }: { email: string | null }) {
  const router = useRouter();
  const { update } = useSession();
  const playSfx = useSfx();
  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();

  const [step, setStep] = useState<Step>("intro");
  const [trainerAvatar, setTrainerAvatar] = useState<TrainerAvatar | null>(
    null,
  );
  const [palType, setPalType] = useState<PalType | null>(null);
  const [nickname, setNickname] = useState("");
  const [expertise, setExpertise] = useState<ExpertiseLevel | null>(null);
  const [priorityExam, setPriorityExam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const species = palType ? PAL_SPECIES[palType] : null;
  const starter = species?.stages[0] ?? null;
  const expertiseOption = EXPERTISE_OPTIONS.find((o) => o.id === expertise);

  const playableExams = catalog.filter((exam) => exam.hasContent);

  async function commit(chosenExam: string) {
    if (!trainerAvatar || !palType || !expertise) return;
    setStep("saving");
    setError(null);

    const result = await completeProfileSetup({
      trainerAvatar,
      palType,
      nickname: nickname.trim() || null,
      expertise,
      priorityExam: chosenExam,
    });

    if (!result.ok) {
      setError(result.error);
      setStep("route");
      return;
    }

    playSfx("levelUp");
    // The profile lives on the session, so it has to be refetched before the
    // guard on the next page will see it — otherwise requireTrainer bounces
    // straight back here.
    await update();
    router.replace("/catalog");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-pixel text-display">Trainer setup</h1>
        {step !== "intro" && (
          <p className="text-caption text-[var(--foreground-muted)]">
            Step {stepNumber(step)} of {STEP_ORDER.length}
          </p>
        )}
      </div>

      {/* The three pals stay on screen after the pick so the dialogue always
          has something to refer to. The pick itself is made on the big cards
          below, so this display doesn't render during that step. */}
      {(step === "palConfirm" || step === "nickname") && (
        <div className="grid gap-4 sm:grid-cols-3">
          {PAL_TYPES.map((type) => {
            const candidate = PAL_SPECIES[type];
            const [first] = candidate.stages;
            const isChosen = palType === type;
            const dimmed = palType !== null && !isChosen;

            return (
              <div
                key={type}
                className={`pixel-panel flex flex-col items-center gap-2 p-4 text-center ${
                  dimmed ? "opacity-40" : ""
                } ${isChosen ? "ring-4 ring-[var(--accent)]" : ""}`}
              >
                <div className={isChosen ? "pal-idle" : ""}>
                  <PalSprite
                    sheet={first.image}
                    size={96}
                    title={`${first.name}, the ${candidate.label}-line starter`}
                  />
                </div>
                <p className="flex items-center gap-2 text-body font-bold tracking-wide uppercase">
                  {first.name}
                  <span aria-hidden="true" className="flex gap-1">
                    {(["a", "b", "c", "d"] as const).map((k) => (
                      <span
                        key={k}
                        className="h-[11px] w-[11px] rounded-[3px]"
                        style={{ background: candidate.palette[k] }}
                      />
                    ))}
                  </span>
                </p>
                <p className="text-caption text-[var(--foreground-muted)]">
                  {candidate.tagline}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {step === "intro" && (
        <DialogueBox
          speaker="Prof. Sequel"
          portrait={<ProfessorPortrait size="lg" />}
          lines={INTRO_LINES}
          onDone={() => setStep("avatar")}
        />
      )}

      {/* Both picks work the same way: the professor asks, and the big cards
          are themselves the answer. There is no second list of the same
          options underneath — the card IS the button. */}
      {step === "avatar" && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">
                Are you a boy, or a girl? This is how you&apos;ll appear out on
                the Belt.
              </p>
            </div>
          </DialogueFrame>

          <div className="grid gap-4 sm:grid-cols-2">
            {TRAINER_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onMouseEnter={() => playSfx("cursor")}
                onClick={() => {
                  playSfx("confirm");
                  setTrainerAvatar(avatar.id);
                  setStep("pal");
                }}
                className="select-card flex flex-col items-center gap-2 p-6"
              >
                <PalSprite sheet={avatar.sheet} size={96} />
                <span className="font-pixel text-title">{avatar.label}</span>
                <span className="text-caption text-[var(--foreground-muted)]">
                  {avatar.hint}
                </span>
                <span className="select-card-pick mt-2">Choose ▶</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "pal" && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">
                Which one will it be? This one stays with you.
              </p>
            </div>
          </DialogueFrame>

          <div className="grid gap-4 sm:grid-cols-3">
            {PAL_TYPES.map((type) => {
              const candidate = PAL_SPECIES[type];
              const [first] = candidate.stages;
              return (
                <button
                  key={type}
                  type="button"
                  onMouseEnter={() => playSfx("cursor")}
                  onClick={() => {
                    playSfx("confirm");
                    setPalType(type);
                    setStep("palConfirm");
                  }}
                  className="select-card flex flex-col items-center gap-2 p-6"
                >
                  <PalSprite sheet={first.image} size={96} />
                  <span className="font-pixel text-title">{first.name}</span>
                  <span aria-hidden="true" className="flex gap-1">
                    {(["a", "b", "c", "d"] as const).map((k) => (
                      <span
                        key={k}
                        className="h-[11px] w-[11px] rounded-[3px]"
                        style={{ background: candidate.palette[k] }}
                      />
                    ))}
                  </span>
                  <span className="text-caption text-[var(--foreground-muted)]">
                    {candidate.tagline}
                  </span>
                  <span className="select-card-pick mt-2">Choose ▶</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === "palConfirm" && species && starter && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              {/* The menu below already asks the question — the professor
                  just says what the creature is. */}
              <p className="dialogue-text flex-1">{species.description}</p>
            </div>
          </DialogueFrame>

          <MenuList
            ariaLabel={`Confirm ${starter.name}`}
            options={[
              { id: "yes", label: `Yes — ${starter.name} it is` },
              { id: "no", label: "No, let me look again" },
            ]}
            onSelect={(id) => {
              if (id === "yes") {
                setStep("nickname");
              } else {
                playSfx("back");
                setPalType(null);
                setStep("pal");
              }
            }}
          />
        </>
      )}

      {step === "nickname" && starter && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">
                {starter.name} is yours. A nickname?
              </p>
            </div>
          </DialogueFrame>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              playSfx("confirm");
              setStep("expertise");
            }}
            className="flex flex-col gap-3"
          >
            <label htmlFor="nickname" className="text-body font-medium">
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
              className="w-full max-w-xs rounded-md bg-[var(--panel)] px-3 py-2 text-body"
              style={{ border: "2px solid var(--border)" }}
            />
            <button
              type="submit"
              className="pixel-button w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-body font-medium text-[var(--accent-foreground)]"
            >
              Next ▶
            </button>
          </form>
        </>
      )}

      {step === "expertise" && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <div className="flex-1">
                <p className="dialogue-text">
                  How much ground have you covered so far?
                </p>
                <p className="mt-2 text-center text-caption text-[var(--foreground-muted)]">
                  Nothing is locked either way — this only changes my advice.
                </p>
              </div>
            </div>
          </DialogueFrame>

          <MenuList
            ariaLabel="Choose your experience level"
            options={EXPERTISE_OPTIONS.map((o) => ({
              id: o.id,
              label: o.label,
              hint: o.hint,
            }))}
            onSelect={(id) => {
              setExpertise(id as ExpertiseLevel);
              setStep("expertiseReply");
            }}
          />
        </>
      )}

      {step === "expertiseReply" && expertiseOption && (
        <DialogueBox
          speaker="Prof. Sequel"
          portrait={<ProfessorPortrait />}
          lines={[expertiseOption.response]}
          onDone={() => setStep("route")}
        />
      )}

      {(step === "route" || step === "saving") && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <div className="flex-1">
                <p className="dialogue-text">
                  Which route first? I&apos;ll pin it on your map.
                </p>
                {email && (
                  <p className="mt-2 text-center text-caption text-[var(--foreground-muted)]">
                    Saving to {email}.
                  </p>
                )}
              </div>
            </div>
          </DialogueFrame>

          {error && (
            <p className="text-body text-[var(--danger)]">{error}</p>
          )}

          <MenuList
            ariaLabel="Choose the exam to prioritise"
            disabled={step === "saving"}
            options={playableExams.map((exam) => ({
              id: exam.code,
              label: `${exam.code.toUpperCase()} — ${exam.title}`,
              hint: `${getRetroLabel(exam.msLevel)} · ${getDisplayTier(exam.msLevel)}`,
            }))}
            onSelect={(id) => {
              setPriorityExam(id);
              // The stage-change beat: darken, whoosh, then the save runs
              // while the screen is dark and the map is the reveal.
              runTransition(() => commit(id));
            }}
          />

          {step === "saving" && (
            <p className="text-body text-[var(--foreground-muted)]">
              Setting up your trainer card
              {priorityExam ? ` for ${priorityExam.toUpperCase()}` : ""}…
            </p>
          )}
        </>
      )}

      {transitionOverlay}
    </div>
  );
}
