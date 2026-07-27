import outlineData from "../../content/dp-600/outline.json";
import questionsData from "../../content/dp-600/questions.json";
import flashcardsData from "../../content/dp-600/flashcards.json";
import studyGuideData from "../../content/dp-600/study-guide.json";
import type {
  Outline,
  Question,
  Flashcard,
  StudyGuideDomain,
} from "./types";

export const outline = outlineData as Outline;
export const questions = questionsData as Question[];
export const flashcards = flashcardsData as Flashcard[];
export const studyGuide = studyGuideData as StudyGuideDomain[];

export function getDomainName(domainId: string): string {
  return outline.domains.find((d) => d.id === domainId)?.name ?? domainId;
}

export function getQuestionsByDomain(domainId: string | "all"): Question[] {
  if (domainId === "all") return questions;
  return questions.filter((q) => q.domain === domainId);
}

export function getFlashcardsByDomain(domainId: string | "all"): Flashcard[] {
  if (domainId === "all") return flashcards;
  return flashcards.filter((f) => f.domain === domainId);
}

export function getStudyGuideForDomain(
  domainId: string,
): StudyGuideDomain | undefined {
  return studyGuide.find((s) => s.domainId === domainId);
}
