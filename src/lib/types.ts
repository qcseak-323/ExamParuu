import type { MsLevel } from "./levels";

export type Domain = {
  id: string;
  name: string;
  weight: string;
  subtopics: string[];
};

export type Outline = {
  examCode: string;
  examName: string;
  note: string;
  domains: Domain[];
};

export type Question = {
  id: string;
  examCode: string;
  domain: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /**
   * Id of the study-guide section that teaches this question, so a miss can
   * route to the exact passage rather than to a whole domain.
   *
   * Optional on purpose: anything without it falls back to the domain anchor,
   * which is what the app did before this existed. That means an incomplete
   * mapping degrades to the old behaviour instead of breaking.
   */
  teaches?: string;
};

export type Flashcard = {
  id: string;
  examCode: string;
  domain: string;
  front: string;
  back: string;
};

export type StudyGuideSection = {
  /**
   * Stable id for this section — the anchor questions point at via `teaches`,
   * and the key lesson completion is recorded against.
   *
   * Authored explicitly rather than derived from the heading. A derived slug
   * would silently break every pointer the moment someone reworded a heading,
   * taking users' lesson progress with it.
   */
  id: string;
  heading: string;
  paragraphs: string[];
};

export type StudyGuideDomain = {
  domainId: string;
  sections: StudyGuideSection[];
};

export type QuizResultEntry = {
  questionId: string;
  domain: string;
  correct: boolean;
  /**
   * Which option was actually picked. Knowing *that* an answer was wrong says
   * nothing about the misconception behind it; knowing which distractor was
   * chosen does.
   *
   * Optional because this lives inside the existing `results` Json column —
   * rows written before this field existed simply lack it, so adding it cost
   * no migration. Every reader must tolerate `undefined`.
   */
  chosenIndex?: number;
  /**
   * When this specific answer was given. The attempt carries a single
   * timestamp, so without this every answer in a run looks simultaneous.
   */
  at?: number;
};

export type QuizAttempt = {
  id: string;
  examCode: string;
  timestamp: number;
  domainFilter: string;
  numQuestions: number;
  correctCount: number;
  results: QuizResultEntry[];
};

export type FlashcardStatus = "known" | "learning";

export type LearningEventKind = "lesson" | "cardReview";

/**
 * An append-only record of a learning action.
 *
 * This is not an XP ledger — the forbidden thing is a mutable counter that
 * drifts under merge and double-counts. Ids here are deterministic
 * (`kind:exam:ref:day`), so the same action recorded twice collapses to one
 * row, exactly as `QuizAttempt.id` already does. XP stays a pure fold over
 * durable evidence.
 *
 * The day component also caps farming: re-reading a lesson ten times in one
 * afternoon is one event.
 */
export type LearningEvent = {
  id: string;
  examCode: string;
  kind: LearningEventKind;
  /** Section id for a lesson, card id for a review. */
  refId: string;
  at: number;
};

/** Account-backed progress, as returned by the sync server actions. */
export type RemoteProgress = {
  attempts: QuizAttempt[];
  flashcards: Record<string, FlashcardStatus>;
  events: LearningEvent[];
};

export type CatalogStatus = "GA" | "beta" | "retiring";

/**
 * Which regional gym an exam belongs to. Mostly the Microsoft series prefix;
 * the surviving MS-* exams live in the "ab" region because Microsoft folded
 * the Microsoft 365 track into the Copilot & Agents (AB) series in 2026
 * (MS-900 itself retired into AB-900).
 */
export type ExamSeries = "az" | "ai" | "dp" | "sc" | "ab" | "pl";

export type CatalogEntry = {
  code: string;
  title: string;
  family: string;
  series: ExamSeries;
  msLevel: MsLevel;
  status: CatalogStatus;
  durationMinutes: number | null;
  passingScore: number | null;
  summary: string;
  hasContent: boolean;
  catalogVerifiedAt: string | null;
  sourceUrl: string | null;
};
