import type { QuizQuestion } from "./quiz-types";

// Template-based question generation for common subjects
// Each template produces varied questions based on the course name

interface QuestionTemplate {
  keywords: string[];
  generate: (course: string) => QuizQuestion[];
}

const mathTemplates: QuizQuestion[] = [
  {
    id: 1, question: "What is the derivative of x²?", options: ["2x", "x²", "2", "x"], correctIndex: 0,
    hint: "Use the power rule: bring the exponent down and reduce by one.", topic: "Derivatives", difficulty: "easy",
  },
  {
    id: 2, question: "What is ∫ 2x dx?", options: ["x² + C", "2x² + C", "x + C", "2 + C"], correctIndex: 0,
    hint: "Integration is the reverse of differentiation.", topic: "Integration", difficulty: "easy",
  },
  {
    id: 3, question: "What is the limit of (sin x)/x as x → 0?", options: ["1", "0", "∞", "undefined"], correctIndex: 0,
    hint: "This is a famous limit — think L'Hôpital or squeeze theorem.", topic: "Limits", difficulty: "medium",
  },
  {
    id: 4, question: "Which rule is used to differentiate f(g(x))?", options: ["Chain rule", "Product rule", "Quotient rule", "Power rule"], correctIndex: 0,
    hint: "It involves an 'outer' and 'inner' function.", topic: "Derivatives", difficulty: "medium",
  },
  {
    id: 5, question: "What is the second derivative test used for?", options: ["Determining concavity", "Finding limits", "Computing integrals", "Solving equations"], correctIndex: 0,
    hint: "It tells you about the shape of the curve at critical points.", topic: "Applications of Derivatives", difficulty: "medium",
  },
  {
    id: 6, question: "What is ∫₀¹ x² dx?", options: ["1/3", "1/2", "1", "2/3"], correctIndex: 0,
    hint: "Evaluate the antiderivative at the bounds.", topic: "Definite Integrals", difficulty: "hard",
  },
  {
    id: 7, question: "The Taylor series of eˣ centered at 0 is:", options: ["Σ xⁿ/n!", "Σ xⁿ", "Σ nxⁿ", "Σ x/n"], correctIndex: 0,
    hint: "Each term divides by a factorial.", topic: "Series", difficulty: "hard",
  },
  {
    id: 8, question: "What does the Fundamental Theorem of Calculus connect?", options: ["Differentiation and integration", "Limits and series", "Algebra and geometry", "Probability and statistics"], correctIndex: 0,
    hint: "It bridges two major branches of calculus.", topic: "Core Theorems", difficulty: "easy",
  },
  {
    id: 9, question: "If f'(x) = 0 at x = a, what is x = a?", options: ["A critical point", "An inflection point", "A discontinuity", "An asymptote"], correctIndex: 0,
    hint: "The slope of the tangent line is zero.", topic: "Critical Points", difficulty: "medium",
  },
  {
    id: 10, question: "What is the integral of 1/x?", options: ["ln|x| + C", "x⁻¹ + C", "1 + C", "x + C"], correctIndex: 0,
    hint: "This is a special case — the power rule doesn't apply here.", topic: "Integration", difficulty: "hard",
  },
];

const chemistryTemplates: QuizQuestion[] = [
  {
    id: 1, question: "What is the atomic number of Carbon?", options: ["6", "12", "8", "14"], correctIndex: 0,
    hint: "It's the number of protons, not the mass number.", topic: "Atomic Structure", difficulty: "easy",
  },
  {
    id: 2, question: "What type of bond involves sharing electrons?", options: ["Covalent", "Ionic", "Metallic", "Hydrogen"], correctIndex: 0,
    hint: "Atoms share rather than transfer electrons.", topic: "Chemical Bonds", difficulty: "easy",
  },
  {
    id: 3, question: "What is Avogadro's number approximately?", options: ["6.022 × 10²³", "3.14 × 10²³", "6.022 × 10²⁰", "1.602 × 10¹⁹"], correctIndex: 0,
    hint: "It defines the number of particles in one mole.", topic: "The Mole", difficulty: "medium",
  },
  {
    id: 4, question: "In a redox reaction, what happens to the oxidized species?", options: ["Loses electrons", "Gains electrons", "Gains protons", "Loses neutrons"], correctIndex: 0,
    hint: "OIL RIG — Oxidation Is Loss.", topic: "Redox Reactions", difficulty: "medium",
  },
  {
    id: 5, question: "What is the pH of a neutral solution at 25°C?", options: ["7", "0", "14", "1"], correctIndex: 0,
    hint: "Right in the middle of the pH scale.", topic: "Acids and Bases", difficulty: "easy",
  },
  {
    id: 6, question: "Which gas law relates pressure and volume at constant temperature?", options: ["Boyle's Law", "Charles's Law", "Avogadro's Law", "Dalton's Law"], correctIndex: 0,
    hint: "Pressure and volume are inversely proportional.", topic: "Gas Laws", difficulty: "medium",
  },
  {
    id: 7, question: "What is the hybridization of carbon in methane (CH₄)?", options: ["sp³", "sp²", "sp", "d²sp³"], correctIndex: 0,
    hint: "Four equivalent bonds around carbon.", topic: "Hybridization", difficulty: "hard",
  },
  {
    id: 8, question: "What does a catalyst do in a reaction?", options: ["Lowers activation energy", "Increases temperature", "Adds more reactant", "Changes equilibrium"], correctIndex: 0,
    hint: "It speeds things up without being consumed.", topic: "Kinetics", difficulty: "easy",
  },
  {
    id: 9, question: "Which element is the most electronegative?", options: ["Fluorine", "Oxygen", "Chlorine", "Nitrogen"], correctIndex: 0,
    hint: "It's at the top right of the periodic table (excluding noble gases).", topic: "Periodic Trends", difficulty: "medium",
  },
  {
    id: 10, question: "What is the electron configuration of Sodium (Na)?", options: ["1s² 2s² 2p⁶ 3s¹", "1s² 2s² 2p⁶", "1s² 2s² 2p⁶ 3s²", "1s² 2s² 2p⁵"], correctIndex: 0,
    hint: "Sodium has 11 electrons total.", topic: "Electron Configuration", difficulty: "hard",
  },
];

const writingTemplates: QuizQuestion[] = [
  {
    id: 1, question: "What is the purpose of a thesis statement?", options: ["To present the main argument", "To summarize the conclusion", "To list sources", "To introduce the author"], correctIndex: 0,
    hint: "It's usually one sentence that guides the entire essay.", topic: "Essay Structure", difficulty: "easy",
  },
  {
    id: 2, question: "What does 'cite your sources' mean?", options: ["Give credit to original authors", "Write a longer essay", "Use more adjectives", "Add a bibliography only"], correctIndex: 0,
    hint: "It's about academic honesty and avoiding plagiarism.", topic: "Citations", difficulty: "easy",
  },
  {
    id: 3, question: "Which sentence is in active voice?", options: ["The dog bit the man.", "The man was bitten by the dog.", "The biting was done by the dog.", "It was bitten."], correctIndex: 0,
    hint: "The subject performs the action directly.", topic: "Grammar", difficulty: "medium",
  },
  {
    id: 4, question: "What is a 'hook' in essay writing?", options: ["An attention-grabbing opening", "The final sentence", "A footnote", "A transition word"], correctIndex: 0,
    hint: "It's meant to reel the reader in.", topic: "Introductions", difficulty: "easy",
  },
  {
    id: 5, question: "What does 'MLA format' primarily govern?", options: ["Citation and formatting style", "Font size only", "Paper length", "Topic selection"], correctIndex: 0,
    hint: "It's a style guide used in humanities.", topic: "Formatting", difficulty: "medium",
  },
  {
    id: 6, question: "Which is an example of a logical fallacy?", options: ["Ad hominem", "Thesis statement", "Topic sentence", "Peer review"], correctIndex: 0,
    hint: "It attacks the person, not the argument.", topic: "Argumentation", difficulty: "hard",
  },
  {
    id: 7, question: "What is the role of a topic sentence?", options: ["Introduces the paragraph's main idea", "Concludes the essay", "Lists references", "Provides a counterargument"], correctIndex: 0,
    hint: "It's usually the first sentence of a body paragraph.", topic: "Paragraph Structure", difficulty: "easy",
  },
  {
    id: 8, question: "Which transition word shows contrast?", options: ["However", "Furthermore", "Similarly", "Additionally"], correctIndex: 0,
    hint: "It signals a shift in direction.", topic: "Transitions", difficulty: "medium",
  },
  {
    id: 9, question: "What is 'peer review' in academic writing?", options: ["Evaluation by fellow scholars", "Self-editing", "Teacher grading", "Publishing online"], correctIndex: 0,
    hint: "Your peers read and critique your work.", topic: "Academic Process", difficulty: "medium",
  },
  {
    id: 10, question: "What makes an argument 'persuasive'?", options: ["Strong evidence and logical reasoning", "Long paragraphs", "Many quotations", "Emotional language only"], correctIndex: 0,
    hint: "Ethos, pathos, and logos.", topic: "Rhetoric", difficulty: "hard",
  },
];

const genericTemplates: QuizQuestion[] = [
  {
    id: 1, question: "What is the best first step when studying a new topic?", options: ["Get an overview of key concepts", "Memorize all details", "Skip to practice problems", "Read the glossary"], correctIndex: 0,
    hint: "Start with the big picture before details.", topic: "Study Skills", difficulty: "easy",
  },
  {
    id: 2, question: "Which study technique involves teaching material to someone else?", options: ["The Feynman Technique", "Pomodoro", "SQ3R", "Cornell Notes"], correctIndex: 0,
    hint: "Named after a famous physicist.", topic: "Study Techniques", difficulty: "easy",
  },
  {
    id: 3, question: "What is spaced repetition?", options: ["Reviewing material at increasing intervals", "Studying for hours without breaks", "Reading once before an exam", "Highlighting everything"], correctIndex: 0,
    hint: "The gaps between reviews get longer over time.", topic: "Memory", difficulty: "medium",
  },
  {
    id: 4, question: "What does 'active recall' involve?", options: ["Testing yourself from memory", "Re-reading notes", "Highlighting text", "Listening to lectures"], correctIndex: 0,
    hint: "You're pulling information out, not just reviewing it.", topic: "Study Techniques", difficulty: "medium",
  },
  {
    id: 5, question: "Which is more effective for long-term retention?", options: ["Distributed practice", "Massed practice (cramming)", "Passive reading", "Copying notes"], correctIndex: 0,
    hint: "Spreading study over time beats cramming.", topic: "Learning Science", difficulty: "easy",
  },
  {
    id: 6, question: "What is the Pomodoro Technique?", options: ["25 min work, 5 min break cycles", "Study all night", "Only study in the morning", "Read for 2 hours straight"], correctIndex: 0,
    hint: "Named after a tomato-shaped timer.", topic: "Productivity", difficulty: "easy",
  },
  {
    id: 7, question: "What is elaborative interrogation?", options: ["Asking 'why' and 'how' about facts", "Memorizing word for word", "Skimming quickly", "Using flashcards only"], correctIndex: 0,
    hint: "It deepens understanding by questioning.", topic: "Study Techniques", difficulty: "hard",
  },
  {
    id: 8, question: "What is interleaving in studying?", options: ["Mixing different topics or types of problems", "Studying one topic exhaustively", "Taking long breaks", "Only reviewing easy material"], correctIndex: 0,
    hint: "Variety in practice improves learning.", topic: "Learning Science", difficulty: "hard",
  },
  {
    id: 9, question: "Why is sleep important for learning?", options: ["Memory consolidation occurs during sleep", "It doesn't affect learning", "It only helps physical health", "You dream about topics"], correctIndex: 0,
    hint: "Your brain processes and stores information while you rest.", topic: "Cognitive Science", difficulty: "medium",
  },
  {
    id: 10, question: "What is a concept map?", options: ["A visual diagram linking related ideas", "A geographic map", "A list of definitions", "A timeline"], correctIndex: 0,
    hint: "It shows how concepts connect to each other visually.", topic: "Note Taking", difficulty: "medium",
  },
];

function shuffleOptions(q: QuizQuestion): QuizQuestion {
  const indices = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const newCorrectIndex = indices.indexOf(q.correctIndex);
  return {
    ...q,
    options: indices.map((i) => q.options[i]),
    correctIndex: newCorrectIndex,
  };
}

export function generateQuestions(course: string, count: number = 10): QuizQuestion[] {
  const lower = course.toLowerCase();

  let pool: QuizQuestion[];
  if (lower.includes("calc") || lower.includes("math") || lower.includes("algebra") || lower.includes("trig")) {
    pool = mathTemplates;
  } else if (lower.includes("chem")) {
    pool = chemistryTemplates;
  } else if (lower.includes("writ") || lower.includes("essay") || lower.includes("english") || lower.includes("lit")) {
    pool = writingTemplates;
  } else {
    pool = genericTemplates;
  }

  // Shuffle pool and take up to count
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((q, i) => shuffleOptions({ ...q, id: i + 1 }));
}

export function sortByDifficulty(questions: QuizQuestion[]): QuizQuestion[] {
  const order = { easy: 0, medium: 1, hard: 2 };
  return [...questions].sort((a, b) => order[a.difficulty] - order[b.difficulty]);
}
