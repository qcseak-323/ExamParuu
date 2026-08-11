import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import QuestionCard from "@/components/question/QuestionCard";
import AudioProvider from "@/components/AudioProvider";
import type { Question } from "@/lib/types";

/**
 * Every answer shape a Microsoft paper uses, in isolation.
 *
 * The Proving lives behind `requireTrainer`, so this is the only way to look
 * at these. It is also the only place the drag, keyboard and tap paths can be
 * exercised before content carrying a `kind` exists.
 *
 * `AudioProvider` is required because every body calls `useSfx`.
 */

function Harness({ question }: { question: Question }) {
  return (
    <AudioProvider>
      <div className="pixel-panel" style={{ maxWidth: 720, padding: "1.5rem" }}>
        <QuestionCard question={question} onAnswered={() => {}} />
      </div>
    </AudioProvider>
  );
}

const meta = {
  title: "Screens/Question kinds",
  component: Harness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  id: "demo",
  examCode: "az-104",
  domain: "manage-storage",
  explanation:
    "Only the read-access variants expose a secondary endpoint. Plain GRS replicates but the copy cannot be read until a failover.",
};

/** The historic shape — no `kind` field at all, which must still work. */
export const Single: Story = {
  args: {
    question: {
      ...base,
      question:
        "An application must keep reading its data even if an entire region becomes unavailable. Which redundancy option should you choose?",
      options: ["RA-GRS", "GRS", "ZRS", "LRS"],
      correctIndex: 0,
    } as Question,
  },
};

export const Multi: Story = {
  args: {
    question: {
      ...base,
      kind: "multi",
      question:
        "Which two prerequisites must be enabled on the source account before object replication can be configured? Choose two.",
      options: ["Change feed", "Blob versioning", "Soft delete", "Archive tier"],
      correctIndexes: [0, 1],
    } as Question,
  },
};

export const Order: Story = {
  args: {
    question: {
      ...base,
      kind: "order",
      question:
        "Put the steps of a safe attack-surface-reduction rollout in order.",
      items: [
        "Set the rules to block",
        "Set the rules to audit",
        "Review the ASR reports",
        "Add exclusions for false positives",
      ],
      correctOrder: [1, 2, 3, 0],
    } as Question,
  },
};

export const Match: Story = {
  args: {
    question: {
      ...base,
      kind: "match",
      question: "Match each redundancy option to what it protects against.",
      pairs: [
        { term: "LRS", definition: "A single disk or rack failure" },
        { term: "ZRS", definition: "The loss of one availability zone" },
        { term: "GRS", definition: "The loss of an entire region" },
      ],
    } as Question,
  },
};

export const YesNo: Story = {
  args: {
    question: {
      ...base,
      kind: "yesno",
      question:
        "A ReadOnly lock is applied to a storage account. Judge each statement.",
      statements: [
        { text: "Listing the account access keys still works.", correct: false },
        { text: "Reading a blob still works.", correct: true },
        { text: "Deleting the account is blocked.", correct: true },
      ],
    } as Question,
  },
};

/** The only format with no prior equivalent in the app. */
export const Dropdown: Story = {
  args: {
    question: {
      ...base,
      kind: "dropdown",
      question: "Complete the statement about blob access tiers.",
      segments: [
        { text: "The " },
        {
          blankId: "tier",
          options: ["cool", "cold", "archive"],
          correctIndex: 2,
        },
        { text: " tier is offline and must be " },
        {
          blankId: "action",
          options: ["rehydrated", "replicated", "versioned"],
          correctIndex: 0,
        },
        { text: " before a blob can be read." },
      ],
    } as Question,
  },
};

/** Storm Watch — the verdict colours must hold on the dark panel. */
export const StormWatch: Story = {
  args: { ...Multi.args },
  globals: { theme: "dark" },
};
