import { Suspense } from "react";
import QuizClient from "@/components/QuizClient";

export const metadata = {
  title: "Practice Quiz — ExamReady DP-600",
};

export default function QuizPage() {
  return (
    <Suspense fallback={null}>
      <QuizClient />
    </Suspense>
  );
}
