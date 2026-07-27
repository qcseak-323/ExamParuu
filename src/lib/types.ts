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
  domain: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Flashcard = {
  id: string;
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
  timestamp: number;
  domainFilter: string;
  numQuestions: number;
  correctCount: number;
  results: QuizResultEntry[];
};

export type FlashcardStatus = "known" | "learning";
