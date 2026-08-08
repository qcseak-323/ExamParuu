"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PAL_SPECIES, PAL_TYPES, formLabel, type PalType } from "@/lib/pals";
import { TRAINER_AVATARS, type TrainerAvatar } from "@/lib/profile";
import { completeProfileSetup } from "@/lib/actions";
import { catalog } from "@/lib/content";
import { REGIONS } from "@/lib/regions";
import { getGuardian } from "@/lib/guardians";
import PalSprite from "@/components/PalSprite";
import ProfessorPortrait from "@/components/ProfessorPortrait";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import { useSfx } from "@/components/AudioProvider";
import { useBattleTransition } from "@/components/battle/BattleTransition";

/**
 * First-run profile setup, played as a conversation with the professor and
 * walked as a four-step wizard: trainer → Paruu → name → route.
 *
 * Choosing no longer jumps straight to the next step. A pick fills the card
 * gold and stays there, and `Next` carries you forward — so a mis-tap is
 * corrected by tapping the other card rather than by backing out of a screen
 * you never meant to leave. `Back` re-opens any earlier answer.
 *
 * Nothing is written until "Set sail" — see `completeProfileSetup`. A trainer
 * who abandons setup halfway has no profile at all and gets the whole flow
 * again, rather than being let into the app with a starter but no route.
 */

const TOTAL_STEPS = 4;

const INTRO_LINES = [
  "Hello there! Welcome to the world of certification.",
  "My name is Prof. Sequel. I study the exams people take to prove what they know.",
  "This world is inhabited by creatures called Paruu. They study alongside you, and they grow stronger the more you practise.",
  "Before you set out, let's get you sorted.",
];

const MAX_NAME_LENGTH = 14;

/**
 * The route we nudge a brand-new trainer towards. AZ-900 is the broadest
 * entry point in Microsoft's own portfolio, which makes it the honest
 * default — it is a suggestion, never a restriction.
 */
const SUGGESTED_EXAM = "az-900";

/** The in-world region name for an exam, e.g. "The Azure Archipelago". */
function worldNameFor(series: string): string | null {
  return REGIONS.find((region) => region.id === series)?.worldName ?? null;
}

export default function SetupClient({ email }: { email: string | null }) {
  const router = useRouter();
  const { update } = useSession();
  const playSfx = useSfx();
  const { run: runTransition, overlay: transitionOverlay } =
    useBattleTransition();

  const [intro, setIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [trainerAvatar, setTrainerAvatar] = useState<TrainerAvatar | null>(
    null,
  );
  const [palType, setPalType] = useState<PalType | null>(null);
  const [trainerName, setTrainerName] = useState("");
  const [priorityExam, setPriorityExam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playableExams = catalog.filter((exam) => exam.hasContent);
  const avatarOption = TRAINER_AVATARS.find((a) => a.id === trainerAvatar);
  const species = palType ? PAL_SPECIES[palType] : null;

  /** Whether the current step has been answered. */
  function isStepReady(which: number): boolean {
    if (which === 1) return trainerAvatar !== null;
    if (which === 2) return palType !== null;
    if (which === 3) return trainerName.trim().length > 0;
    return priorityExam !== null;
  }

  async function commit() {
    if (!trainerAvatar || !palType || !priorityExam) return;
    setSaving(true);
    setError(null);

    const result = await completeProfileSetup({
      trainerAvatar,
      palType,
      trainerName,
      priorityExam,
    });

    if (!result.ok) {
      setError(result.error);
      setSaving(false);
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

  function goNext() {
    if (!isStepReady(step) || saving) return;
    if (step === TOTAL_STEPS) {
      // The stage-change beat: darken, whoosh, then the save runs while the
      // screen is dark and the map is the reveal.
      runTransition(() => void commit());
      return;
    }
    playSfx("confirm");
    setStep((s) => s + 1);
  }

  function goBack() {
    if (step === 1 || saving) return;
    playSfx("back");
    setStep((s) => s - 1);
  }

  if (intro) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="font-pixel text-display">Trainer setup</h1>
        <DialogueBox
          speaker="Prof. Sequel"
          portrait={<ProfessorPortrait size="lg" />}
          lines={INTRO_LINES}
          onDone={() => setIntro(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-pixel text-display">Trainer setup</h1>
        <p className="text-caption text-[var(--foreground-muted)]">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step 1 — the trainer ------------------------------------------- */}
      {step === 1 && (
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

          <div className="grid items-start gap-4 sm:grid-cols-2">
            {TRAINER_AVATARS.map((avatar) => {
              const picked = trainerAvatar === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  aria-pressed={picked}
                  onMouseEnter={() => playSfx("cursor")}
                  onClick={() => {
                    playSfx("confirm");
                    setTrainerAvatar(avatar.id);
                  }}
                  className={`select-card flex flex-col items-center gap-2 p-6 ${
                    picked ? "select-card--picked" : ""
                  }`}
                >
                  <PalSprite sheet={avatar.sheet} size={96} />
                  <span className="font-pixel text-title">{avatar.label}</span>
                  <span className="text-caption text-[var(--foreground-muted)]">
                    {avatar.hint}
                  </span>
                  <span className="select-card-pick mt-2">
                    {picked ? "Chosen ✓" : "Choose ▶"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Step 2 — the Paruu, and the line it grows into ------------------ */}
      {step === 2 && (
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

          <div className="grid items-start gap-4 sm:grid-cols-3">
            {PAL_TYPES.map((type) => {
              const candidate = PAL_SPECIES[type];
              const [first] = candidate.stages;
              const picked = palType === type;

              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={picked}
                  onMouseEnter={() => playSfx("cursor")}
                  onClick={() => {
                    playSfx("confirm");
                    setPalType(type);
                  }}
                  className={`select-card flex flex-col items-center gap-2 p-6 ${
                    picked ? "select-card--picked" : ""
                  }`}
                >
                  <PalSprite sheet={first.image} size={96} />
                  <span className="font-pixel text-title">{first.name}</span>
                  <span aria-hidden="true" className="flex gap-1">
                    {(["a", "b", "c", "d"] as const).map((k) => (
                      <span
                        key={k}
                        className="h-[11px] w-[11px] border border-[var(--outline)]"
                        style={{ background: candidate.palette[k] }}
                      />
                    ))}
                  </span>
                  <span className="text-caption text-[var(--foreground-muted)]">
                    {candidate.tagline}
                  </span>
                  <span className="select-card-pick mt-2">
                    {picked ? "Chosen ✓" : "Choose ▶"}
                  </span>

                  {/* What it becomes. Shown only once chosen, so the step
                      stays a choice between three creatures rather than a
                      wall of nine. Later forms are silhouettes: the shape is
                      a promise, the name is not given away. */}
                  {picked && (
                    <span className="evo">
                      <span className="text-caption font-semibold uppercase tracking-[0.1em]">
                        {candidate.label} line
                      </span>
                      <span className="evo-row">
                        {candidate.stages.map((stage, i) => (
                          <span key={stage.name} className="contents">
                            {i > 0 && (
                              <span className="evo-arrow" aria-hidden="true">
                                ▶
                              </span>
                            )}
                            <span
                              className={`evo-form ${i > 0 ? "evo-form--locked" : ""}`}
                            >
                              <PalSprite sheet={stage.image} size={48} />
                              <b className="text-caption leading-tight">
                                {i === 0 ? stage.name : "???"}
                              </b>
                              <small className="text-caption leading-tight">
                                {formLabel(i).replace(" form", "")}
                                {i === 0 ? " · now" : ` · Lv ${stage.minLevel}`}
                              </small>
                            </span>
                          </span>
                        ))}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Step 3 — the trainer's own name --------------------------------- */}
      {step === 3 && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">
                And your name? It goes on the trainer card.
              </p>
            </div>
          </DialogueFrame>

          <div className="pixel-panel grid max-w-md gap-2 p-5">
            <label
              htmlFor="trainer-name"
              className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]"
            >
              Trainer name
            </label>
            <input
              id="trainer-name"
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goNext();
              }}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              placeholder={`Up to ${MAX_NAME_LENGTH} letters`}
              className="min-h-11 w-full rounded-md bg-[var(--panel-raised)] px-3 py-2 text-body"
              style={{ border: "2px solid var(--border)" }}
            />
            <p className="text-caption text-[var(--foreground-muted)]">
              Shown on your trainer card and every score report.
            </p>
          </div>
        </>
      )}

      {/* Step 4 — the first route ---------------------------------------- */}
      {step === 4 && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">
                Last thing — where do we start?
              </p>
            </div>
          </DialogueFrame>

          <div className="grid gap-2" role="group" aria-label="Choose a route">
            {playableExams.map((exam) => {
              const picked = priorityExam === exam.code;
              const guardian = getGuardian(exam.code);
              const world = worldNameFor(exam.series);

              return (
                <button
                  key={exam.code}
                  type="button"
                  aria-pressed={picked}
                  onMouseEnter={() => playSfx("cursor")}
                  onClick={() => {
                    playSfx("confirm");
                    setPriorityExam(exam.code);
                  }}
                  className={`menu-item flex items-center gap-3 px-3 py-3 text-left ${
                    picked ? "menu-item--gold" : ""
                  }`}
                >
                  {guardian?.image && (
                    <PalSprite sheet={guardian.image} size={48} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium">
                      {exam.code.toUpperCase()}
                      {world ? ` · ${world}` : ""}
                    </span>
                    <span className="block text-caption text-[var(--foreground-muted)]">
                      {exam.summary}
                    </span>
                  </span>
                  {exam.code === SUGGESTED_EXAM && (
                    <span className="shrink-0 rounded-full border-2 border-[var(--outline)] bg-[var(--accent-hi)] px-2 py-0.5 text-caption font-semibold text-[var(--outline)]">
                      ★ Suggested
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Everything chosen so far, so the last step is also a review. */}
          <p className="text-caption text-[var(--foreground-muted)]">
            {[avatarOption?.label, trainerName.trim(), species?.stages[0].name]
              .filter(Boolean)
              .join(" · ")}
            {email ? ` · saving to ${email}` : ""}
          </p>
        </>
      )}

      {error && <p className="text-body text-[var(--danger)]">{error}</p>}

      <nav className="setup-nav" aria-label="Setup steps">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1 || saving}
          className="pixel-button rounded-md bg-[var(--panel)] px-5 py-2.5 text-body font-medium"
        >
          ◀ Back
        </button>

        <span className="step-dots" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <i key={i} className={i < step ? "on" : ""} />
          ))}
        </span>

        <button
          type="button"
          onClick={goNext}
          disabled={!isStepReady(step) || saving}
          className="start-button tap-target px-8"
        >
          {saving
            ? "Setting sail…"
            : step === TOTAL_STEPS
              ? "Set sail ▶"
              : "Next ▶"}
        </button>
      </nav>

      {transitionOverlay}
    </div>
  );
}
