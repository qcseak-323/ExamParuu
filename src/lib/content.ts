import catalogData from "../../content/catalog.json";

import dp600Outline from "../../content/dp-600/outline.json";
import dp600Questions from "../../content/dp-600/questions.json";
import dp600Flashcards from "../../content/dp-600/flashcards.json";
import dp600StudyGuide from "../../content/dp-600/study-guide.json";
import dp600Path from "../../content/dp-600/learning-path.json";

import ab900Outline from "../../content/ab-900/outline.json";
import ab900Questions from "../../content/ab-900/questions.json";
import ab900Flashcards from "../../content/ab-900/flashcards.json";
import ab900StudyGuide from "../../content/ab-900/study-guide.json";
import ab900Path from "../../content/ab-900/learning-path.json";
import ab730Outline from "../../content/ab-730/outline.json";
import ab730Questions from "../../content/ab-730/questions.json";
import ab730Flashcards from "../../content/ab-730/flashcards.json";
import ab730StudyGuide from "../../content/ab-730/study-guide.json";
import ab730Path from "../../content/ab-730/learning-path.json";
import ab731Outline from "../../content/ab-731/outline.json";
import ab731Questions from "../../content/ab-731/questions.json";
import ab731Flashcards from "../../content/ab-731/flashcards.json";
import ab731StudyGuide from "../../content/ab-731/study-guide.json";
import ab731Path from "../../content/ab-731/learning-path.json";

import az900Outline from "../../content/az-900/outline.json";
import az900Questions from "../../content/az-900/questions.json";
import az900Flashcards from "../../content/az-900/flashcards.json";
import az900StudyGuide from "../../content/az-900/study-guide.json";
import az900Path from "../../content/az-900/learning-path.json";

import ai901Outline from "../../content/ai-901/outline.json";
import ai901Questions from "../../content/ai-901/questions.json";
import ai901Flashcards from "../../content/ai-901/flashcards.json";
import ai901StudyGuide from "../../content/ai-901/study-guide.json";
import ai901Path from "../../content/ai-901/learning-path.json";

import dp900Outline from "../../content/dp-900/outline.json";
import dp900Questions from "../../content/dp-900/questions.json";
import dp900Flashcards from "../../content/dp-900/flashcards.json";
import dp900StudyGuide from "../../content/dp-900/study-guide.json";
import dp900Path from "../../content/dp-900/learning-path.json";

import sc900Outline from "../../content/sc-900/outline.json";
import sc900Questions from "../../content/sc-900/questions.json";
import sc900Flashcards from "../../content/sc-900/flashcards.json";
import sc900StudyGuide from "../../content/sc-900/study-guide.json";
import sc900Path from "../../content/sc-900/learning-path.json";

import dp700Outline from "../../content/dp-700/outline.json";
import dp700Questions from "../../content/dp-700/questions.json";
import dp700Flashcards from "../../content/dp-700/flashcards.json";
import dp700StudyGuide from "../../content/dp-700/study-guide.json";
import dp700Path from "../../content/dp-700/learning-path.json";

import sc200Outline from "../../content/sc-200/outline.json";
import sc200Questions from "../../content/sc-200/questions.json";
import sc200Flashcards from "../../content/sc-200/flashcards.json";
import sc200StudyGuide from "../../content/sc-200/study-guide.json";
import sc200Path from "../../content/sc-200/learning-path.json";

import pl300Outline from "../../content/pl-300/outline.json";
import pl300Questions from "../../content/pl-300/questions.json";
import pl300Flashcards from "../../content/pl-300/flashcards.json";
import pl300StudyGuide from "../../content/pl-300/study-guide.json";
import pl300Path from "../../content/pl-300/learning-path.json";

import az104Outline from "../../content/az-104/outline.json";
import az104Questions from "../../content/az-104/questions.json";
import az104Flashcards from "../../content/az-104/flashcards.json";
import az104StudyGuide from "../../content/az-104/study-guide.json";
import az104Path from "../../content/az-104/learning-path.json";
import az104CaseStudies from "../../content/az-104/case-studies.json";
import sc200CaseStudies from "../../content/sc-200/case-studies.json";
import dp600CaseStudies from "../../content/dp-600/case-studies.json";
import dp700CaseStudies from "../../content/dp-700/case-studies.json";
import pl300CaseStudies from "../../content/pl-300/case-studies.json";

import sc300Outline from "../../content/sc-300/outline.json";
import sc300Questions from "../../content/sc-300/questions.json";
import sc300Flashcards from "../../content/sc-300/flashcards.json";
import sc300StudyGuide from "../../content/sc-300/study-guide.json";
import sc300Path from "../../content/sc-300/learning-path.json";
import sc300CaseStudies from "../../content/sc-300/case-studies.json";

import sc401Outline from "../../content/sc-401/outline.json";
import sc401Questions from "../../content/sc-401/questions.json";
import sc401Flashcards from "../../content/sc-401/flashcards.json";
import sc401StudyGuide from "../../content/sc-401/study-guide.json";
import sc401Path from "../../content/sc-401/learning-path.json";
import sc401CaseStudies from "../../content/sc-401/case-studies.json";

import sc500Outline from "../../content/sc-500/outline.json";
import sc500Questions from "../../content/sc-500/questions.json";
import sc500Flashcards from "../../content/sc-500/flashcards.json";
import sc500StudyGuide from "../../content/sc-500/study-guide.json";
import sc500Path from "../../content/sc-500/learning-path.json";
import sc500CaseStudies from "../../content/sc-500/case-studies.json";

import pl900Outline from "../../content/pl-900/outline.json";
import pl900Questions from "../../content/pl-900/questions.json";
import pl900Flashcards from "../../content/pl-900/flashcards.json";
import pl900StudyGuide from "../../content/pl-900/study-guide.json";
import pl900Path from "../../content/pl-900/learning-path.json";

import type {
  CaseStudy,
  Outline,
  Question,
  Flashcard,
  StudyGuideDomain,
  StudyGuideSection,
  CatalogEntry,
  ExamLearningPath,
} from "./types";

export const catalog = catalogData as CatalogEntry[];

type ExamContent = {
  outline: Outline;
  questions: Question[];
  flashcards: Flashcard[];
  studyGuide: StudyGuideDomain[];
  learningPath: ExamLearningPath;
  /** Absent until an exam has authored any. */
  caseStudies?: CaseStudy[];
};

const examRegistry: Record<string, ExamContent> = {
  "dp-600": {
    outline: dp600Outline as Outline,
    questions: dp600Questions as Question[],
    flashcards: dp600Flashcards as Flashcard[],
    studyGuide: dp600StudyGuide as StudyGuideDomain[],
    learningPath: dp600Path as ExamLearningPath,
    caseStudies: dp600CaseStudies as CaseStudy[],
  },
  "ab-900": {
    outline: ab900Outline as Outline,
    questions: ab900Questions as Question[],
    flashcards: ab900Flashcards as Flashcard[],
    studyGuide: ab900StudyGuide as StudyGuideDomain[],
    learningPath: ab900Path as ExamLearningPath,
  },
  "ab-730": {
    outline: ab730Outline as Outline,
    questions: ab730Questions as Question[],
    flashcards: ab730Flashcards as Flashcard[],
    studyGuide: ab730StudyGuide as StudyGuideDomain[],
    learningPath: ab730Path as ExamLearningPath,
  },
  "ab-731": {
    outline: ab731Outline as Outline,
    questions: ab731Questions as Question[],
    flashcards: ab731Flashcards as Flashcard[],
    studyGuide: ab731StudyGuide as StudyGuideDomain[],
    learningPath: ab731Path as ExamLearningPath,
  },
  "az-900": {
    outline: az900Outline as Outline,
    questions: az900Questions as Question[],
    flashcards: az900Flashcards as Flashcard[],
    studyGuide: az900StudyGuide as StudyGuideDomain[],
    learningPath: az900Path as ExamLearningPath,
  },
  "ai-901": {
    outline: ai901Outline as Outline,
    questions: ai901Questions as Question[],
    flashcards: ai901Flashcards as Flashcard[],
    studyGuide: ai901StudyGuide as StudyGuideDomain[],
    learningPath: ai901Path as ExamLearningPath,
  },
  "dp-700": {
    outline: dp700Outline as Outline,
    questions: dp700Questions as Question[],
    flashcards: dp700Flashcards as Flashcard[],
    studyGuide: dp700StudyGuide as StudyGuideDomain[],
    learningPath: dp700Path as ExamLearningPath,
    caseStudies: dp700CaseStudies as CaseStudy[],
  },
  "sc-200": {
    outline: sc200Outline as Outline,
    questions: sc200Questions as Question[],
    flashcards: sc200Flashcards as Flashcard[],
    studyGuide: sc200StudyGuide as StudyGuideDomain[],
    learningPath: sc200Path as ExamLearningPath,
    caseStudies: sc200CaseStudies as CaseStudy[],
  },
  "pl-300": {
    outline: pl300Outline as Outline,
    questions: pl300Questions as Question[],
    flashcards: pl300Flashcards as Flashcard[],
    studyGuide: pl300StudyGuide as StudyGuideDomain[],
    learningPath: pl300Path as ExamLearningPath,
    caseStudies: pl300CaseStudies as CaseStudy[],
  },
  "az-104": {
    outline: az104Outline as Outline,
    questions: az104Questions as Question[],
    flashcards: az104Flashcards as Flashcard[],
    studyGuide: az104StudyGuide as StudyGuideDomain[],
    learningPath: az104Path as ExamLearningPath,
    caseStudies: az104CaseStudies as CaseStudy[],
  },
  "dp-900": {
    outline: dp900Outline as Outline,
    questions: dp900Questions as Question[],
    flashcards: dp900Flashcards as Flashcard[],
    studyGuide: dp900StudyGuide as StudyGuideDomain[],
    learningPath: dp900Path as ExamLearningPath,
  },
  "sc-900": {
    outline: sc900Outline as Outline,
    questions: sc900Questions as Question[],
    flashcards: sc900Flashcards as Flashcard[],
    studyGuide: sc900StudyGuide as StudyGuideDomain[],
    learningPath: sc900Path as ExamLearningPath,
  },
  "sc-300": {
    outline: sc300Outline as Outline,
    questions: sc300Questions as Question[],
    flashcards: sc300Flashcards as Flashcard[],
    studyGuide: sc300StudyGuide as StudyGuideDomain[],
    learningPath: sc300Path as ExamLearningPath,
    caseStudies: sc300CaseStudies as CaseStudy[],
  },
  "sc-401": {
    outline: sc401Outline as Outline,
    questions: sc401Questions as Question[],
    flashcards: sc401Flashcards as Flashcard[],
    studyGuide: sc401StudyGuide as StudyGuideDomain[],
    learningPath: sc401Path as ExamLearningPath,
    caseStudies: sc401CaseStudies as CaseStudy[],
  },
  "sc-500": {
    outline: sc500Outline as Outline,
    questions: sc500Questions as Question[],
    flashcards: sc500Flashcards as Flashcard[],
    studyGuide: sc500StudyGuide as StudyGuideDomain[],
    learningPath: sc500Path as ExamLearningPath,
    caseStudies: sc500CaseStudies as CaseStudy[],
  },
  "pl-900": {
    outline: pl900Outline as Outline,
    questions: pl900Questions as Question[],
    flashcards: pl900Flashcards as Flashcard[],
    studyGuide: pl900StudyGuide as StudyGuideDomain[],
    learningPath: pl900Path as ExamLearningPath,
  },
};

// Runs once at module load in development. The content files are
// hand-maintained JSON and a mistyped `teaches` produces a link that silently
// goes nowhere; better to shout about it the first time the app starts.
if (process.env.NODE_ENV !== "production") {
  const problems = validateContent();
  if (problems.length > 0) {
    console.error(
      `[content] ${problems.length} integrity problem(s):\n  ${problems.join("\n  ")}`,
    );
  }
}

export function getCatalogEntry(examCode: string): CatalogEntry | undefined {
  return catalog.find((c) => c.code === examCode);
}

export function getExamContent(examCode: string): ExamContent | undefined {
  return examRegistry[examCode];
}

/** The scenario a question is asked against, if it belongs to a case study. */
export function getCaseStudyForQuestion(
  question: Question,
): CaseStudy | undefined {
  if (!question.caseStudyId) return undefined;
  return getExamContent(question.examCode)?.caseStudies?.find(
    (c) => c.id === question.caseStudyId,
  );
}

export function getExamCodesWithContent(): string[] {
  return Object.keys(examRegistry);
}

export function getDomainName(examCode: string, domainId: string): string {
  const content = getExamContent(examCode);
  return (
    content?.outline.domains.find((d) => d.id === domainId)?.name ?? domainId
  );
}

export function getQuestionsByDomain(
  examCode: string,
  domainId: string | "all",
): Question[] {
  const questions = getExamContent(examCode)?.questions ?? [];
  if (domainId === "all") return questions;
  return questions.filter((q) => q.domain === domainId);
}

export function getFlashcardsByDomain(
  examCode: string,
  domainId: string | "all",
): Flashcard[] {
  const flashcards = getExamContent(examCode)?.flashcards ?? [];
  if (domainId === "all") return flashcards;
  return flashcards.filter((f) => f.domain === domainId);
}

/** Which exam a flashcard belongs to, given only its id. */
export function findFlashcardExamCode(cardId: string): string | undefined {
  for (const [examCode, content] of Object.entries(examRegistry)) {
    if (content.flashcards.some((f) => f.id === cardId)) return examCode;
  }
  return undefined;
}

export function getStudyGuideForDomain(
  examCode: string,
  domainId: string,
): StudyGuideDomain | undefined {
  return getExamContent(examCode)?.studyGuide.find(
    (s) => s.domainId === domainId,
  );
}

/** Every section of an exam, flattened, with its owning domain. */
export function getSections(
  examCode: string,
): { section: StudyGuideSection; domainId: string }[] {
  const guide = getExamContent(examCode)?.studyGuide ?? [];
  return guide.flatMap((d) =>
    d.sections.map((section) => ({ section, domainId: d.domainId })),
  );
}

export function getSection(
  examCode: string,
  sectionId: string,
): { section: StudyGuideSection; domainId: string } | undefined {
  return getSections(examCode).find((s) => s.section.id === sectionId);
}

/**
 * Where to send someone who just missed a question.
 *
 * Prefers the exact section the question is mapped to, and falls back to the
 * domain anchor when `teaches` is absent — which is what the app did before
 * section mapping existed. So an incomplete mapping degrades gracefully
 * instead of producing dead links.
 */
export function studyHrefForQuestion(question: Question): string {
  const anchor = question.teaches ?? question.domain;
  return `/exams/${question.examCode}/study#${anchor}`;
}

/**
 * Flashcards worth surfacing right after this question is missed.
 *
 * Practice mode inserts vocabulary in the moment of failure, so relevance
 * matters more than coverage: a card qualifies when one of the terms on its
 * front actually appears in the question, its options, or its explanation.
 * Fronts are often composites ("LRS / ZRS / GRS", "public vs private
 * endpoint"), so they are split into phrases before matching. When nothing
 * matches, one card from the same skills area still gets shown — the domain
 * is the vocabulary neighbourhood even when no term lines up exactly.
 */
export function relatedFlashcardsForQuestion(
  question: Question,
  limit = 2,
): Flashcard[] {
  const cards = getExamContent(question.examCode)?.flashcards ?? [];
  const inDomain = cards.filter((c) => c.domain === question.domain);
  if (inDomain.length === 0) return [];

  // Every answer shape contributes whatever text it has. A matching question
  // has no `options` but its pairs are exactly the vocabulary this is looking
  // for, so pulling the words out per kind finds more cards than skipping
  // anything that is not four options would.
  const answerText: string[] = (() => {
    switch (question.kind) {
      case undefined:
      case "single":
      case "multi":
        return question.options;
      case "order":
        return question.items;
      case "match":
        return question.pairs.flatMap((p) => [p.term, p.definition]);
      case "yesno":
        return question.statements.map((s) => s.text);
      case "dropdown":
        return question.segments.flatMap((s) =>
          "blankId" in s ? s.options : [s.text],
        );
    }
  })();

  const haystack = [question.question, ...answerText, question.explanation]
    .join(" ")
    .toLowerCase();

  const mentioned = inDomain.filter((card) =>
    card.front
      .split(/\s+vs\.?\s+|[\/,()]/i)
      .map((phrase) => phrase.trim().toLowerCase())
      .filter((phrase) => phrase.length >= 4)
      .some((phrase) => haystack.includes(phrase)),
  );

  return (mentioned.length > 0 ? mentioned : inDomain.slice(0, 1)).slice(
    0,
    limit,
  );
}

/**
 * Microsoft Learn citation for a question's topic. We can't deep-link into
 * Learn per question without hand-maintaining thousands of URLs, but Learn's
 * own search on the taught section's heading lands on the right module in
 * practice — and never rots the way a hardcoded path would.
 */
export function learnSearchUrlForQuestion(question: Question): string {
  return `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(
    teachingLabelForQuestion(question),
  )}`;
}

/** Human-readable label for whatever a question points at. */
export function teachingLabelForQuestion(question: Question): string {
  if (question.teaches) {
    const found = getSection(question.examCode, question.teaches);
    if (found) return found.section.heading;
  }
  return getDomainName(question.examCode, question.domain);
}

/**
 * Dev-only integrity check on the content files.
 *
 * The `teaches` pointers and section ids are hand-maintained across four JSON
 * files, and a typo in either produces a link that silently goes nowhere. This
 * turns that into a loud failure at startup instead.
 */
export function validateContent(): string[] {
  const problems: string[] = [];

  for (const [examCode, content] of Object.entries(examRegistry)) {
    const sectionIds = new Set<string>();
    for (const domain of content.studyGuide) {
      for (const section of domain.sections) {
        if (!section.id) {
          problems.push(`${examCode}: section "${section.heading}" has no id`);
          continue;
        }
        if (sectionIds.has(section.id)) {
          problems.push(`${examCode}: duplicate section id "${section.id}"`);
        }
        sectionIds.add(section.id);
      }
    }

    const domainIds = new Set(content.outline.domains.map((d) => d.id));
    for (const question of content.questions) {
      if (!domainIds.has(question.domain)) {
        problems.push(
          `${examCode}: question ${question.id} has unknown domain "${question.domain}"`,
        );
      }
      if (question.teaches && !sectionIds.has(question.teaches)) {
        problems.push(
          `${examCode}: question ${question.id} teaches "${question.teaches}", which is not a section id`,
        );
      }

      /*
       * Shape checks per kind.
       *
       * TypeScript proves the union is satisfied at compile time, but every
       * question is JSON cast to `Question` at the module boundary — so an
       * index out of range or a `correctOrder` that is not a permutation
       * type-checks fine and then grades as unanswerable at run time. These
       * are the mistakes hand-authoring actually makes.
       */
      const bad = (why: string) =>
        problems.push(`${examCode}: question ${question.id} ${why}`);

      switch (question.kind) {
        case undefined:
        case "single":
          if (
            question.correctIndex < 0 ||
            question.correctIndex >= question.options.length
          ) {
            bad("has a correctIndex outside its options");
          }
          break;
        case "multi":
          if (question.correctIndexes.length === 0) bad("has no correct answer");
          if (
            new Set(question.correctIndexes).size !==
            question.correctIndexes.length
          ) {
            bad("repeats an index in correctIndexes");
          }
          if (
            question.correctIndexes.some(
              (i) => i < 0 || i >= question.options.length,
            )
          ) {
            bad("has a correctIndexes entry outside its options");
          }
          break;
        case "order": {
          const sorted = [...question.correctOrder].sort((a, b) => a - b);
          const expected = question.items.map((_, i) => i);
          if (sorted.join() !== expected.join()) {
            bad("has a correctOrder that is not a permutation of its items");
          }
          break;
        }
        case "match":
          if (question.pairs.length < 2) bad("needs at least two pairs");
          break;
        case "yesno":
          if (question.statements.length < 2) bad("needs at least two statements");
          break;
        case "dropdown": {
          const blanks = question.segments.filter(
            (s): s is Extract<typeof s, { blankId: string }> => "blankId" in s,
          );
          if (blanks.length === 0) bad("has no blanks");
          if (new Set(blanks.map((b) => b.blankId)).size !== blanks.length) {
            bad("repeats a blankId");
          }
          for (const blank of blanks) {
            if (
              blank.correctIndex < 0 ||
              blank.correctIndex >= blank.options.length
            ) {
              bad(`has blank "${blank.blankId}" pointing outside its options`);
            }
          }
          break;
        }
      }

      if (
        question.caseStudyId &&
        !content.caseStudies?.some((c) => c.id === question.caseStudyId)
      ) {
        bad(`belongs to unknown case study "${question.caseStudyId}"`);
      }
    }

    /**
     * No two questions in a bank may ask the same thing.
     *
     * This matters more as banks grow. A bank of 60 for a 60-question paper is
     * the whole paper, so a duplicate is merely wasteful; a bank of 240 exists
     * so that repeat sittings differ, and duplicates quietly undo that — the
     * paper stops discriminating between someone who knows the material and
     * someone who has memorised the bank. Nothing else catches this: a
     * duplicate type-checks, grades correctly and passes the coverage gate.
     *
     * Compared on normalised stem text, which catches copy-paste and
     * re-punctuation without the false positives a fuzzy match would bring.
     */
    const stems = new Map<string, string>();
    for (const question of content.questions) {
      const key = question.question
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const first = stems.get(key);
      if (first) {
        problems.push(
          `${examCode}: question ${question.id} repeats the stem of ${first}`,
        );
      } else {
        stems.set(key, question.id);
      }
    }

    for (const caseStudy of content.caseStudies ?? []) {
      if (!domainIds.has(caseStudy.domain)) {
        problems.push(
          `${examCode}: case study ${caseStudy.id} has unknown domain "${caseStudy.domain}"`,
        );
      }
      if (caseStudy.tabs.length === 0) {
        problems.push(`${examCode}: case study ${caseStudy.id} has no tabs`);
      }
      // A case study nothing points at renders nowhere, which is silent.
      if (!content.questions.some((q) => q.caseStudyId === caseStudy.id)) {
        problems.push(
          `${examCode}: case study ${caseStudy.id} has no questions`,
        );
      }
    }
  }

  return problems;
}
