"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PAL_SPECIES, PAL_TYPES, formLabel, type PalType } from "@/lib/pals";
import {
  FAMILIARITY_OPTIONS,
  TRAINER_AVATARS,
  trainerMapSheet,
  type Familiarity,
  type TrainerAvatar,
} from "@/lib/profile";
import { completeProfileSetup } from "@/lib/actions";
import { catalog } from "@/lib/content";
import { playableSeriesEntries, seriesTitle } from "@/lib/regions";
import { getGuardian } from "@/lib/guardians";
import PalSprite from "@/components/PalSprite";
import ProfessorPortrait from "@/components/ProfessorPortrait";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import { useSfx } from "@/components/AudioProvider";
import { useBattleTransition } from "@/components/battle/BattleTransition";
import { BackGlyph, ForwardGlyph, TickGlyph } from "@/components/Glyph";

/**
 * First-run profile setup, played as a conversation with the professor and
 * walked as a six-step wizard: trainer → Paruu → its nickname → your name
 * → route → how well you know it. The two naming steps sit next to each
 * other on purpose: the question "what do I call this thing" is asked once
 * about the creature and once about you, and separating them is what stops
 * the two being confused.
 *
 * Familiarity is asked *last*, straight after the route, because it is a
 * question about that route — "how well do you know AZ · Azure" only means
 * something once there is an answer to point at.
 *
 * Choosing no longer jumps straight to the next step. A pick fills the card
 * gold and stays there, and `Next` carries you forward — so a mis-tap is
 * corrected by tapping the other card rather than by backing out of a screen
 * you never meant to leave. `Back` re-opens any earlier answer.
 *
 * Nothing is written until "Set sail" — see `completeProfileSetup`. A trainer
 * who abandons setup halfway has no profile at all and gets the whole flow
 * again, rather than being let into the app with a starter but no route.
 *
 * "Set sail" does not land on the map. It saves, blacks out, and opens the
 * learning path for the route they picked — the taught mode, not a menu of
 * modes and not a battle.
 *
 * It used to hand off to a five-question wild battle (`/quiz?wild=5`). That
 * was a wild encounter staged inside practice mode, which is the one place
 * wild questions are supposed never to appear — see WildEncounter's
 * BATTLE_SEGMENTS. A trainer who has just told us how well they know this
 * series should be shown where the teaching is, not thrown at the bank.
 *
 * It lands on the path *picker*, not inside a path. Familiarity still gates
 * nothing (lib/profile.ts) — it chooses Prof. Sequel's wording on the way out,
 * and the trainer chooses where to start.
 */

const TOTAL_STEPS = 6;

const INTRO_LINES = [
  "Hello there! Welcome to the world of certification.",
  "My name is Prof. Sequel. I study the exams people take to prove what they know.",
  "This world is inhabited by creatures called Paruu. They study alongside you, and they grow stronger the more you practise.",
  "Before you set out, let's get you sorted.",
];

const MAX_NAME_LENGTH = 14;
const MAX_NICKNAME_LENGTH = 14;

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
  const [nickname, setNickname] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [priorityExam, setPriorityExam] = useState<string | null>(null);
  const [familiarity, setFamiliarity] = useState<Familiarity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playableExams = catalog.filter((exam) => exam.hasContent);
  // One row per series — the same rule the landing page uses.
  const routeRows = playableSeriesEntries();
  const avatarOption = TRAINER_AVATARS.find((a) => a.id === trainerAvatar);
  const chosenExam = playableExams.find((exam) => exam.code === priorityExam);
  const familiarityOption = FAMILIARITY_OPTIONS.find(
    (o) => o.id === familiarity,
  );
  /** The chosen line, and its base form — what the nickname step is naming. */
  const species = palType ? PAL_SPECIES[palType] : null;
  const starter = species?.stages[0] ?? null;

  /** Whether the current step has been answered. */
  function isStepReady(which: number): boolean {
    if (which === 1) return trainerAvatar !== null;
    if (which === 2) return palType !== null;
    // The nickname is optional — a blank one means "call it what it is".
    if (which === 3) return true;
    if (which === 4) return trainerName.trim().length > 0;
    if (which === 5) return priorityExam !== null;
    return familiarity !== null;
  }

  function setSail() {
    if (!trainerAvatar || !palType || !priorityExam || !familiarity) return;
    setSaving(true);
    setError(null);

    /*
     * The save happens *behind* the dark, not in front of it.
     *
     * It used to run first and start the blackout afterwards, on the reasoning
     * that the dark should only ever cover a navigation. The cost was about
     * four seconds of completely motionless screen between pressing the button
     * and anything happening — the save plus the session refetch, with nothing
     * to look at but a disabled footer.
     *
     * The blackout can hold for as long as its action takes (see
     * BlackoutProvider), so the same wait now happens with the screen already
     * dark and a cue playing. The original worry does not apply: the hold does
     * not end until this promise settles, so the dark still cannot lift on
     * unfinished work.
     */
    runTransition(async () => {
      const result = await completeProfileSetup({
        trainerAvatar,
        palType,
        nickname,
        trainerName,
        priorityExam,
        familiarity,
      });

      // Returning without navigating lets the dark lift back onto setup with
      // the error shown, which is the right place to correct it.
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

      router.replace(`/exams/${priorityExam}/path`);
      router.refresh();
    });
  }

  function goNext() {
    if (!isStepReady(step) || saving) return;
    if (step === TOTAL_STEPS) {
      void setSail();
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
                  {/* The map sheet, not the avatar sheet. `avatar.sheet` draws
                      the cast in profile — right for the battle arena, where
                      two fighters face each other, and wrong on a card that
                      says "this is how you'll appear": a figure in profile is
                      looking past the reader at nothing. The map sheets are
                      the same two trainers imported from the south rotation,
                      the only front-facing pose in the cast. HomeHero made the
                      same swap for the same reason. */}
                  <PalSprite
                    sheet={trainerMapSheet(avatar.id) ?? avatar.sheet}
                    size={96}
                  />
                  <span className="font-pixel text-title">{avatar.label}</span>
                  <span className="text-caption text-[var(--foreground-muted)]">
                    {avatar.hint}
                  </span>
                  <span className="select-card-pick mt-2">
                    {picked ? (
                      <>
                        Chosen
                        <TickGlyph />
                      </>
                    ) : (
                      <>
                        Choose
                        <ForwardGlyph />
                      </>
                    )}
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

          {/* No `items-start`: the cards stretch to one another's height, so
              a longer tagline can't leave the row ragged. The pick pill is
              pushed to the bottom with mt-auto so all three line up. */}
          <div className="grid gap-4 sm:grid-cols-3">
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
                  <span className="select-card-pick mt-auto">
                    {picked ? (
                      <>
                        Chosen
                        <TickGlyph />
                      </>
                    ) : (
                      <>
                        Choose
                        <ForwardGlyph />
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* What it becomes — its own panel under the row, where there is
              width for three labelled forms. Later ones are silhouettes: the
              shape is a promise, the name is not given away. */}
          {palType && species && (
            <div className="pixel-panel p-5">
              <p className="text-center text-caption font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
                {species.label} line
              </p>
              <div className="evo-row mt-3">
                {species.stages.map((stage, i) => (
                  <span key={stage.name} className="contents">
                    {i > 0 && (
                      <span className="evo-arrow" aria-hidden="true">
                        <ForwardGlyph />
                      </span>
                    )}
                    <span
                      className={`evo-form ${i > 0 ? "evo-form--locked" : ""}`}
                    >
                      <PalSprite sheet={stage.image} size={64} />
                      <span className="text-caption font-semibold leading-tight">
                        {i === 0 ? stage.name : "???"}
                      </span>
                      <span className="text-caption leading-tight text-[var(--foreground-muted)]">
                        {formLabel(i).replace(" form", "")}
                        {i === 0 ? " · now" : ` · Lv ${stage.minLevel}`}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 3 — what the Paruu gets called ----------------------------- */}
      {step === 3 && starter && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">
                {starter.name} is yours. Would you like to give it a nickname?
              </p>
            </div>
          </DialogueFrame>

          <div className="flex flex-wrap items-center gap-5">
            <div className="pal-idle shrink-0">
              <PalSprite sheet={starter.image} size={96} />
            </div>
            <div className="pixel-panel grid min-w-[16rem] flex-1 gap-2 p-5">
              <label
                htmlFor="pal-nickname"
                className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]"
              >
                Nickname{" "}
                <span className="font-normal normal-case tracking-normal">
                  (optional)
                </span>
              </label>
              <input
                id="pal-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goNext();
                }}
                maxLength={MAX_NICKNAME_LENGTH}
                autoFocus
                placeholder={starter.name}
                className="min-h-11 w-full rounded-md bg-[var(--panel-raised)] px-3 py-2 text-body"
                style={{ border: "2px solid var(--border)" }}
              />
              <p className="text-caption text-[var(--foreground-muted)]">
                Leave it blank and it stays {starter.name}.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Step 4 — the trainer's own name --------------------------------- */}
      {step === 4 && (
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

      {/* Step 5 — the first route ---------------------------------------- */}
      {step === 5 && (
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
            {routeRows.map((exam) => {
              const picked = priorityExam === exam.code;
              const guardian = getGuardian(exam.code);

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
                      {seriesTitle(exam.series)}
                    </span>
                    <span className="block text-caption text-[var(--foreground-muted)]">
                      {exam.summary}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Everything chosen so far, so the route step is also a review. */}
          <p className="text-caption text-[var(--foreground-muted)]">
            {[
              avatarOption?.label,
              trainerName.trim(),
              nickname.trim() || starter?.name,
            ]
              .filter(Boolean)
              .join(" · ")}
            {email ? ` · saving to ${email}` : ""}
          </p>
        </>
      )}

      {/* Step 6 — how well they know that route ------------------------- */}
      {step === 6 && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-center gap-3">
              <ProfessorPortrait />
              <p className="dialogue-text flex-1">
                {/* Named, not implied: the question is about the series they
                    picked one step ago, and asking it in the abstract is how
                    you get an answer about the wrong thing. */}
                {chosenExam
                  ? `How well do you know ${seriesTitle(chosenExam.series)}?`
                  : "And how well do you know that series?"}
              </p>
            </div>
          </DialogueFrame>

          <div
            className="grid gap-4 sm:grid-cols-3"
            role="group"
            aria-label="How well you know this series"
          >
            {FAMILIARITY_OPTIONS.map((option) => {
              const picked = familiarity === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={picked}
                  onMouseEnter={() => playSfx("cursor")}
                  onClick={() => {
                    playSfx("confirm");
                    setFamiliarity(option.id);
                  }}
                  className={`select-card flex flex-col items-center gap-2 p-6 ${
                    picked ? "select-card--picked" : ""
                  }`}
                >
                  <span className="font-pixel text-title">{option.label}</span>
                  <span className="text-caption text-[var(--foreground-muted)]">
                    {option.hint}
                  </span>
                  <span className="select-card-pick mt-auto">
                    {picked ? (
                      <>
                        Chosen
                        <TickGlyph />
                      </>
                    ) : (
                      <>
                        Choose
                        <ForwardGlyph />
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* The answer earns a reply rather than just a filled card — this
              is a conversation, and it is the last thing said before the
              screen goes dark on the learning path. */}
          {familiarityOption && (
            <DialogueFrame>
              <span className="dialogue-tab">Prof. Sequel</span>
              <div className="flex items-center gap-3">
                <ProfessorPortrait />
                {/* The explicit {" "} is load-bearing: JSX drops the space
                    between an expression and the text that follows it, and
                    production rendered "…find your gaps.Now — something's". */}
                <p className="dialogue-text flex-1">
                  {familiarityOption.response}{" "}
                  Come on — I&apos;ll show you the way in.
                </p>
              </div>
            </DialogueFrame>
          )}
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
          <BackGlyph />
          Back
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
          {saving ? (
            "Setting sail…"
          ) : (
            <>
              {step === TOTAL_STEPS ? "Set sail" : "Next"}
              <ForwardGlyph />
            </>
          )}
        </button>
      </nav>

      {transitionOverlay}
    </div>
  );
}
