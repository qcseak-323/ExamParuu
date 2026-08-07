import catalogData from "../../content/catalog.json";

import dp600Outline from "../../content/dp-600/outline.json";
import dp600Questions from "../../content/dp-600/questions.json";
import dp600Flashcards from "../../content/dp-600/flashcards.json";
import dp600StudyGuide from "../../content/dp-600/study-guide.json";

import ab900Outline from "../../content/ab-900/outline.json";
import ab900Questions from "../../content/ab-900/questions.json";
import ab900Flashcards from "../../content/ab-900/flashcards.json";
import ab900StudyGuide from "../../content/ab-900/study-guide.json";

import az900Outline from "../../content/az-900/outline.json";
import az900Questions from "../../content/az-900/questions.json";
import az900Flashcards from "../../content/az-900/flashcards.json";
import az900StudyGuide from "../../content/az-900/study-guide.json";

import type {
  Outline,
  Question,
  Flashcard,
  StudyGuideDomain,
  StudyGuideSection,
  CatalogEntry,
} from "./types";

export const catalog = catalogData as CatalogEntry[];

type ExamContent = {
  outline: Outline;
  questions: Question[];
  flashcards: Flashcard[];
  studyGuide: StudyGuideDomain[];
};

const examRegistry: Record<string, ExamContent> = {
  "dp-600": {
    outline: dp600Outline as Outline,
    questions: dp600Questions as Question[],
    flashcards: dp600Flashcards as Flashcard[],
    studyGuide: dp600StudyGuide as StudyGuideDomain[],
  },
  "ab-900": {
    outline: ab900Outline as Outline,
    questions: ab900Questions as Question[],
    flashcards: ab900Flashcards as Flashcard[],
    studyGuide: ab900StudyGuide as StudyGuideDomain[],
  },
  "az-900": {
    outline: az900Outline as Outline,
    questions: az900Questions as Question[],
    flashcards: az900Flashcards as Flashcard[],
    studyGuide: az900StudyGuide as StudyGuideDomain[],
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
    }
  }

  return problems;
}
