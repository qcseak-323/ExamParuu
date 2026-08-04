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
};

export type Flashcard = {
  id: string;
  examCode: string;
  domain: string;
  front: string;
  back: string;
};

export type StudyGuideSection = {
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

/** Account-backed progress, as returned by the sync server actions. */
export type RemoteProgress = {
  attempts: QuizAttempt[];
  flashcards: Record<string, FlashcardStatus>;
};

export type CatalogStatus = "GA" | "beta" | "retiring";

export type CatalogEntry = {
  code: string;
  title: string;
  family: string;
  msLevel: MsLevel;
  status: CatalogStatus;
  durationMinutes: number | null;
  passingScore: number | null;
  summary: string;
  hasContent: boolean;
  catalogVerifiedAt: string | null;
  sourceUrl: string | null;
};
