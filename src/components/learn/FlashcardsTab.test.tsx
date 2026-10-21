import { render, screen } from "@testing-library/react";
import { FlashcardsTab } from "./FlashcardsTab";

describe("FlashcardsTab", () => {
  it("renders the first card when cards are present on mount", () => {
    const flashcards = { cards: [{ front: "What is ATP?", back: "Energy currency", topic: "Cells" }] };
    render(<FlashcardsTab flashcards={flashcards} loading={false} onGenerate={() => {}} />);
    expect(screen.getByText("What is ATP?")).toBeInTheDocument();
    expect(screen.getByText("Cells")).toBeInTheDocument();
  });
});
