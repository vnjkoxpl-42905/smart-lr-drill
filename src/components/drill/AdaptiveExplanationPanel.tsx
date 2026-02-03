import * as React from "react";
import { cn } from "@/lib/utils";
import type { LRQuestion } from "@/lib/questionLoader";

interface ExplanationSection {
  title: string;
  content: string;
}

interface AdaptiveExplanationPanelProps {
  question: LRQuestion;
  selectedAnswer: string;
  isVisible: boolean;
}

export function AdaptiveExplanationPanel({
  question,
  selectedAnswer,
  isVisible,
}: AdaptiveExplanationPanelProps) {
  if (!isVisible) return null;

  // Parse breakdown or generate structured explanation from available data
  const getStructuredExplanation = (): ExplanationSection[] => {
    const sections: ExplanationSection[] = [];
    const breakdown = question.breakdown;
    const answerKey = selectedAnswer as 'A' | 'B' | 'C' | 'D' | 'E';
    const answerExplanation = question.answerChoiceExplanations?.[answerKey];

    // 1. Conclusion
    sections.push({
      title: "Conclusion",
      content: breakdown?.conclusionSimple || breakdown?.conclusion || 
        "The argument presents a main claim supported by premises."
    });

    // 2. Evidence
    const evidence = breakdown?.evidence;
    sections.push({
      title: "Evidence",
      content: evidence && evidence.length > 0 
        ? evidence.slice(0, 2).join("; ") 
        : "Key facts or premises support the conclusion."
    });

    // 3. Reasoning pattern
    const reasoningType = question.reasoningType || question.qtype || "";
    sections.push({
      title: "Reasoning Pattern",
      content: formatReasoningType(reasoningType)
    });

    // 4. Key assumption / gap
    sections.push({
      title: "Key Assumption / Gap",
      content: breakdown?.crucialInsight || 
        "The argument assumes its premises fully support the conclusion."
    });

    // 5. Why this choice works
    const whyCorrect = answerExplanation?.whyCorrect;
    sections.push({
      title: "Why This Choice Works",
      content: whyCorrect?.slice(0, 200) ||
        `Choice (${selectedAnswer}) correctly addresses the reasoning in the stimulus.`
    });

    return sections;
  };

  const sections = getStructuredExplanation();

  return (
    <div className="mt-6 p-4 bg-muted/30 border border-border rounded-lg space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Explanation
      </h4>
      <div className="space-y-2.5">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            <span className="text-xs font-medium text-primary">
              {section.title}:
            </span>
            <p className="text-sm text-foreground leading-relaxed pl-2">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatReasoningType(type: string): string {
  const typeMap: Record<string, string> = {
    "Strengthen": "Conditional/Causal — find evidence that supports the conclusion",
    "Weaken": "Causal/Comparative — find evidence that undermines the conclusion",
    "Necessary Assumption": "Logical gap — identify what must be true for the argument to hold",
    "Sufficient Assumption": "Missing link — find what, if true, guarantees the conclusion",
    "Flaw": "Logical error — identify the reasoning mistake",
    "Main Conclusion": "Structural — identify what the argument is trying to prove",
    "Must Be True": "Deductive — what necessarily follows from the premises",
    "Most Strongly Supported": "Inductive — what is best supported by the evidence",
    "Paradox": "Reconciliation — explain an apparent contradiction",
    "Method of Reasoning": "Structural — describe how the argument proceeds",
    "Parallel Reasoning": "Pattern matching — find similar logical structure",
    "Role": "Functional — identify the purpose of a statement",
  };

  const normalized = type.replace(/-/g, " ").replace(/_/g, " ");
  for (const [key, value] of Object.entries(typeMap)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return type || "Logical reasoning pattern";
}
