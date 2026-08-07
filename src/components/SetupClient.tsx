"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PAL_SPECIES, PAL_TYPES, type PalType } from "@/lib/pals";
import { EXPERTISE_OPTIONS, type ExpertiseLevel } from "@/lib/profile";
import { completeProfileSetup } from "@/lib/actions";
import { catalog } from "@/lib/content";
import { getRetroLabel, getDisplayTier } from "@/lib/levels";
import PalSprite from "@/components/PalSprite";
import ProfessorPortrait from "@/components/ProfessorPortrait";
import DialogueBox, { DialogueFrame } from "@/components/DialogueBox";
import MenuList from "@/components/MenuList";
import { useSfx } from "@/components/AudioProvider";

/**
 * First-run profile setup, played as a conversation with the professor.
 *
 * Nothing is written until the final step — see `completeProfileSetup`. A
 * trainer who abandons setup halfway has no profile at all and gets the whole
 * flow again, rather than being let into the app with a starter but no route.
 */
type Step =
  | "intro"
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
  "This world is inhabited by creatures called ExamPals. They study alongside you, and they grow stronger the more you practise.",
  "Before you set out, let's get you sorted — a partner, a sense of where you're starting from, and a route to walk first.",
];

/** Small progress readout, so the flow doesn't feel open-ended. */
const STEP_ORDER: Step[] = ["pal", "expertise", "route"];
function stepNumber(step: Step): number {
  if (step === "intro") return 1;
  if (step === "pal" || step === "palConfirm" || step === "nickname") return 1;
  if (step === "expertise" || step === "expertiseReply") return 2;
  return 3;
}

export default function SetupClient({ email }: { email: string | null }) {
  const router = useRouter();
  const { update } = useSession();
  const playSfx = useSfx();

  const [step, setStep] = useState<Step>("intro");
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
    if (!palType || !expertise) return;
    setStep("saving");
    setError(null);

    const result = await completeProfileSetup({
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

      {/* The three pals stay on screen from selection onwards so the dialogue
          always has something to refer to. */}
      {(step === "pal" || step === "palConfirm" || step === "nickname") && (
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
          portrait={<ProfessorPortrait />}
          lines={INTRO_LINES}
          onDone={() => setStep("pal")}
        />
      )}

      {step === "pal" && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-end gap-3">
              <ProfessorPortrait />
              <p className="flex-1 text-body">
                First — which one will it be? Take your time. This one stays
                with you.
              </p>
            </div>
          </DialogueFrame>

          <MenuList
            ariaLabel="Choose your starter ExamPal"
            options={PAL_TYPES.map((type) => ({
              id: type,
              label: `${PAL_SPECIES[type].stages[0].name} — ${PAL_SPECIES[type].label}`,
              hint: PAL_SPECIES[type].tagline,
            }))}
            onSelect={(id) => {
              setPalType(id as PalType);
              setStep("palConfirm");
            }}
          />
        </>
      )}

      {step === "palConfirm" && species && starter && (
        <>
          <DialogueFrame>
            <span className="dialogue-tab">Prof. Sequel</span>
            <div className="flex items-end gap-3">
              <ProfessorPortrait />
              <div className="flex-1">
                <p className="text-body">{species.description}</p>
                <p className="mt-3 text-body">So, you want {starter.name}?</p>
              </div>
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
            <div className="flex items-end gap-3">
              <ProfessorPortrait />
              <p className="flex-1 text-body">
                {starter.name} is yours. Would you like to give it a nickname?
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
            <div className="flex items-end gap-3">
              <ProfessorPortrait />
              <div className="flex-1">
                <p className="text-body">
                  Now then. How much ground have you covered with Microsoft
                  certification exams so far?
                </p>
                <p className="mt-2 text-caption text-[var(--foreground-muted)]">
                  Nothing is locked either way — this only changes the advice I
                  give you.
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
            <div className="flex items-end gap-3">
              <ProfessorPortrait />
              <div className="flex-1">
                <p className="text-body">
                  Last thing. Which route do you want to walk first? I&apos;ll
                  pin it on your map — you can still visit any of the others.
                </p>
                {email && (
                  <p className="mt-2 text-caption text-[var(--foreground-muted)]">
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
              commit(id);
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
    </div>
  );
}
