import { fireEvent, render, screen } from "@testing-library/react";
import { PracticeTab } from "./PracticeTab";
import type { Practice } from "@/types/learn";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

const practice: Practice = {
  questions: [
    { type: "mcq", question: "Q1?", options: ["a", "b", "c", "d"], correctIndex: 1, answer: "b", explanation: "e", topic: "T1", difficulty: "easy" },
    { type: "short_answer", question: "Q2?", answer: "x", explanation: "e", topic: "T2", difficulty: "medium" },
  ],
};

describe("PracticeTab", () => {
  it("shows the first question when practice is present on mount", () => {
    render(<PracticeTab practice={practice} setId="s1" loading={false} onGenerate={() => {}} />);
    expect(screen.getByText("Q1?")).toBeInTheDocument();
  });

  it("generates a quiz at the picked difficulty from the empty state", () => {
    const onGenerate = vi.fn();
    render(<PracticeTab practice={null} setId="s1" loading={false} onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole("button", { name: "hard" }));
    expect(onGenerate).toHaveBeenCalledWith("hard");
  });

  it("resets to question 1 when a new set of the same length arrives", () => {
    const { rerender } = render(<PracticeTab practice={practice} setId="s1" loading={false} onGenerate={() => {}} />);
    fireEvent.click(screen.getByText("b"));
    fireEvent.click(screen.getByText("Next question"));
    expect(screen.getByText("Q2?")).toBeInTheDocument();
    const next = { questions: practice.questions.map((q) => ({ ...q, question: `New ${q.question}` })) };
    rerender(<PracticeTab practice={next} setId="s1" loading={false} onGenerate={() => {}} />);
    expect(screen.getByText("New Q1?")).toBeInTheDocument();
  });
});
