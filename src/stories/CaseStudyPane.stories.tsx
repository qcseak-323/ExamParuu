import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CaseStudyPane from "@/components/question/CaseStudyPane";
import AudioProvider from "@/components/AudioProvider";
import { getExamContent } from "@/lib/content";
import type { CaseStudy } from "@/lib/types";

/**
 * The scenario pane the Proving shows above a case study's questions.
 *
 * It lives behind `requireTrainer` on the exam route, so this is the only
 * place it can be looked at or driven — the same reason `QuestionCard` has a
 * story. `AudioProvider` is required because the tab strip calls `useSfx`.
 *
 * The content is the real AZ-104 case rather than a fixture, so the story
 * fails loudly if the case is renamed or its tabs are restructured.
 */

const contoso = getExamContent("az-104")?.caseStudies?.[0];
if (!contoso) throw new Error("az-104 has no case study to render");

function Harness({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <AudioProvider>
      <div style={{ maxWidth: 720 }}>
        <CaseStudyPane caseStudy={caseStudy} questionCount={5} />
      </div>
    </AudioProvider>
  );
}

const meta = {
  title: "Screens/Case study pane",
  component: Harness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Contoso: Story = {
  args: { caseStudy: contoso },
};

/**
 * A two-tab case, to check the arrow keys still wrap when there is nowhere
 * much to go — `move()` takes the modulus of the tab count, and a count of
 * two is where an off-by-one in that wrap would show.
 */
export const TwoTabs: Story = {
  args: {
    caseStudy: {
      ...contoso,
      id: "cs-two-tabs",
      tabs: contoso.tabs.slice(0, 2),
    },
  },
};
