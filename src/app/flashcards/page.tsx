import { Suspense } from "react";
import FlashcardsClient from "@/components/FlashcardsClient";

export const metadata = {
  title: "Flashcards — ExamReady DP-600",
};

export default function FlashcardsPage() {
  return (
    <Suspense fallback={null}>
      <FlashcardsClient />
    </Suspense>
  );
}
