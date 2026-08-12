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

/**
 * What every question carries, whatever shape its answer takes.
 */
export type QuestionBase = {
  id: string;
  examCode: string;
  domain: string;
  /** The stem. For `dropdown` this is the lead-in above the sentence. */
  question: string;
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
  /**
   * The case study this question is asked against, if any.
   *
   * Optional, so the 440 questions authored before case studies existed are
   * standalone by omission — the same bargain `kind` and `teaches` struck.
   */
  caseStudyId?: string;
};

/**
 * One piece of a `dropdown` question: either fixed prose or a blank the
 * trainer fills from a list. Modelling the sentence as a sequence is what lets
 * a blank sit mid-clause — "Use ▾ to move data from ▾ into the warehouse" —
 * which is how Microsoft's build-list and hotspot items actually read.
 */
export type QuestionSegment =
  | { text: string }
  | { blankId: string; options: string[]; correctIndex: number };

/**
 * A question, in one of the shapes a real Microsoft paper uses.
 *
 * ── Why `kind` is optional ──
 *
 * Every one of the 440 questions authored before this existed is a plain
 * four-option item with no `kind` field, and all of them must keep working
 * untouched. So the absent case IS `single`, and nothing had to be migrated —
 * the same bargain `teaches` and `QuizResultEntry.chosenIndex` already struck,
 * for the same reason: an incomplete mapping should degrade to the old
 * behaviour rather than break.
 *
 * ── Why a union rather than optional fields ──
 *
 * A single type with `correctIndex?` and `correctIndexes?` and `pairs?` would
 * compile everywhere and be wrong at runtime. A union makes the compiler
 * enumerate every place that reaches for `.options` without narrowing first,
 * which is exactly the list of call sites that need to think about this.
 *
 * Grade with `gradeQuestion` in `review.ts` rather than comparing by hand;
 * only it knows what each shape's answer looks like.
 */
export type Question =
  /** Single answer, four options. The historic shape and still the majority. */
  | (QuestionBase & {
      kind?: "single";
      options: string[];
      correctIndex: number;
    })
  /** Multiple response — "choose two". Right only if the set matches exactly. */
  | (QuestionBase & {
      kind: "multi";
      options: string[];
      correctIndexes: number[];
    })
  /** Build-list: put the steps in order. `correctOrder` indexes into `items`. */
  | (QuestionBase & {
      kind: "order";
      items: string[];
      correctOrder: number[];
    })
  /** Drag-and-drop matching: one definition onto each term. */
  | (QuestionBase & {
      kind: "match";
      pairs: { term: string; definition: string }[];
    })
  /**
   * The repeated-scenario series — a shared setup, then several statements
   * each judged true or false.
   */
  | (QuestionBase & {
      kind: "yesno";
      statements: { text: string; correct: boolean }[];
    })
  /** Hotspot / dropdown: a sentence with one or more blanks to fill. */
  | (QuestionBase & {
      kind: "dropdown";
      segments: QuestionSegment[];
    });

/**
 * A case study: one scenario, several questions.
 *
 * Microsoft's version presents a company background across tabs — overview,
 * existing environment, requirements — and then asks several questions
 * against it. The skill being tested is partly holding that context, which is
 * why the questions cannot simply be scattered through the paper: they arrive
 * as a block with the scenario alongside them.
 *
 * Questions belong to a case through their own `caseStudyId` rather than
 * being nested here, so they stay in the ordinary bank — countable by the
 * coverage gate, reachable by the review deck, and weighted into the paper by
 * the same domain quota as everything else.
 */
export type CaseStudy = {
  id: string;
  examCode: string;
  /** Which skills area the case sits in, for paper weighting. */
  domain: string;
  title: string;
  /** Read in order; the first is the one that opens. */
  tabs: { heading: string; paragraphs: string[] }[];
};

/** The historic shape, narrowed. Battles and `buildRecall` only serve these. */
export type SingleAnswerQuestion = Extract<
  Question,
  { options: string[]; correctIndex: number }
>;

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
   * What was actually answered, for the shapes `chosenIndex` cannot express —
   * a set of indexes for `multi`, an ordering for `order`, one index per blank
   * for `dropdown`, one verdict per statement for `yesno`.
   *
   * Optional for the same reason `chosenIndex` is: this lives inside the
   * existing `results` Json column, so rows written before it simply lack it
   * and no migration was needed. `chosenIndex` stays the field for single-
   * answer questions rather than being folded in here, because every existing
   * reader already understands it.
   */
  chosen?: number[] | boolean[];
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

/**
 * One module of a learning path — the unit a trainer actually sits down to
 * do. Titles mirror Microsoft Learn (see 02 - Tooling/learning-paths.mjs);
 * the content behind them is this project's own.
 *
 * A module can legitimately have no sections: Microsoft Learn sometimes
 * splits a domain into more modules than we have written passages for, and a
 * module that is pure flashcard drill is still a module. It can never
 * usefully have no cards, which is what the generator warns about.
 */
export type LearningModule = {
  id: string;
  title: string;
  sectionIds: string[];
  cardIds: string[];
};

export type LearningPath = {
  id: string;
  title: string;
  domainId: string;
  /** Null when Microsoft Learn publishes no matching path — see the tool. */
  msLearnUrl: string | null;
  modules: LearningModule[];
};

export type ExamLearningPath = {
  examCode: string;
  note: string;
  paths: LearningPath[];
};

/**
 * A checkpoint challenge, drawn between bites of flashcards.
 *
 * Every variant is DERIVED from content that already exists — the flashcards
 * and question bank the exam already ships — rather than authored separately.
 * That is deliberate: a challenge format that needs its own content per module
 * would mean 23 new hand-written items for DP-600 alone, and would rot the
 * moment a card changed. Deriving them means every exam got these for free
 * and they stay in step with the cards automatically.
 */
export type Challenge =
  | {
      kind: "recall";
      id: string;
      prompt: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }
  | {
      kind: "match";
      id: string;
      prompt: string;
      /** Terms in display order; the trainer drags a definition onto each. */
      pairs: { termId: string; term: string; definition: string }[];
    }
  | {
      kind: "multi";
      id: string;
      prompt: string;
      options: { id: string; label: string; correct: boolean }[];
    }
  | {
      /**
       * Spot the term from another skills area. Same answer shape as recall;
       * a separate kind because the question is about the authored `domain`
       * field, not the question bank — it works on any module, however few
       * cards it has.
       */
      kind: "oddOne";
      id: string;
      prompt: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }
  | {
      /**
       * Sort terms into their skills areas. The generalisation of match:
       * slot identity (`bucketId`) is distinct from the item, so a bucket
       * holds many items where a match slot holds exactly one.
       */
      kind: "sort";
      id: string;
      prompt: string;
      buckets: { id: string; label: string }[];
      items: { id: string; label: string; bucketId: string }[];
    }
  | {
      /**
       * Judge each term/definition pairing true or false. The fastest reps
       * of the set, and the only paired format that works on a one-card
       * module — the pair needs one real card plus a borrowed definition.
       */
      kind: "swipe";
      id: string;
      prompt: string;
      cards: { id: string; term: string; definition: string; matches: boolean }[];
    };

export type FlashcardStatus = "known" | "learning";

export type LearningEventKind =
  | "lesson"
  | "cardReview"
  | "wildWin"
  /** One learning-path module completed. Day-scoped like the rest. */
  | "moduleDone"
  /** Every checkpoint in a module run answered perfectly. Day-scoped. */
  | "modulePerfect";

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

/**
 * `announced` is a real fourth state, not a shade of beta: Microsoft has named
 * the exam but published no study guide and set no beta date, so there is
 * nothing to sit and often no official title yet. Calling it GA would promise
 * a bookable exam and calling it beta would promise one you can sit early.
 */
export type CatalogStatus = "GA" | "beta" | "retiring" | "announced";

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
