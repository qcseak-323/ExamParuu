import catalogData from "../../content/catalog.json";

import dp600Outline from "../../content/dp-600/outline.json";
import dp600Questions from "../../content/dp-600/questions.json";
import dp600Flashcards from "../../content/dp-600/flashcards.json";
import dp600StudyGuide from "../../content/dp-600/study-guide.json";

import ab900Outline from "../../content/ab-900/outline.json";
import ab900Questions from "../../content/ab-900/questions.json";
import ab900Flashcards from "../../content/ab-900/flashcards.json";
import ab900StudyGuide from "../../content/ab-900/study-guide.json";

import type {
  Outline,
  Question,
  Flashcard,
  StudyGuideDomain,
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
};

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
