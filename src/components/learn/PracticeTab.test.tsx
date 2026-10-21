import { render, screen } from "@testing-library/react";
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
});
