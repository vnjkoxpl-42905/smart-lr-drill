// Question loader - ingests JSON files and builds index

export interface LRQuestion {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  reasoningType?: string; // e.g., "Conditional", "Causal", "Comparison", or "Conditional + Causal"
  difficulty: number;
  stimulus?: string;
  questionStem: string;
  answerChoices: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  breakdown?: {
    conclusion: string;
    conclusionSimple: string;
    evidence: string[]; // 2-4 items
    justification: string; // ≤80 words
    objection: string; // ≤40 words
    prediction: string; // ≤60 words
    crucialInsight: string; // ≤30 words
  };
  answerChoiceExplanations?: {
    A: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    B: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    C: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    D: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    E: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
  };
}

export interface QuestionManifest {
  totalQuestions: number;
  byPT: Record<string, number>;
  byQType: Record<string, number>;
  byDifficulty: Record<number, number>;
  sections: Array<{
    pt: number;
    section: number;
    count: number;
    filename: string;
  }>;
}

const JSON_FILES = [
  // Original 10 files (PT101-PT106)
  '/data/PT106-S3-LR.json',
  '/data/PT105-S1-LR.json',
  '/data/PT104-S1-LR.json',
  '/data/PT101-S3-LR.json',
  '/data/PT103-S1-LR.json',
  '/data/PT104-S4-LR.json',
  '/data/PT101-S2-LR.json',
  '/data/PT105-S2-LR.json',
  '/data/PT106-S1-LR.json',
  '/data/PT103-S2-LR.json',
  // Second batch (PT107-PT120)
  '/data/PT107-S1-LR.json',
  '/data/PT107-S4-LR.json',
  '/data/PT108-S2-LR.json',
  '/data/PT108-S3-LR.json',
  '/data/PT109-S1-LR.json',
  '/data/PT109-S4-LR.json',
  '/data/PT110-S2-LR.json',
  '/data/PT111-S1-LR.json',
  '/data/PT120-S1-LR.json',
  '/data/PT120-S3-LR.json',
  // Third batch - expanding to mega database
  '/data/PT127-S1-LR.json',
  '/data/PT150-S2-LR.json',
  '/data/PT152-S1-LR.json',
  // Fourth batch - PT114-PT118
  '/data/PT114-S1-LR.json',
  '/data/PT114-S2-LR.json',
  '/data/PT115-S2-LR.json',
  '/data/PT115-S4-LR.json',
  '/data/PT116-S2-LR.json',
  '/data/PT116-S3-LR.json',
  '/data/PT117-S2-LR.json',
  '/data/PT117-S3-LR.json',
  '/data/PT117-S4-LR.json',
  '/data/PT118-S1-LR.json',
  '/data/PT118-S2-LR.json',
  '/data/PT118-S3-LR.json',
  '/data/PT118-S4-LR.json',
];

// Simple hash for qid generation
function hashQid(pt: number, section: number, qnum: number): string {
  return `PT${pt}-S${section}-Q${qnum}`;
}

// Normalize question type to canonical taxonomy
function normalizeQType(raw: string): string {
  const map: Record<string, string> = {
    'Must be True': 'Must Be True',
    'Flaw': 'Flaw',
    'Paradox': 'Paradox',
    'Strengthen': 'Strengthen',
    'Weaken': 'Weaken',
    'Necessary Assumption': 'Necessary Assumption',
    'Sufficient Assumption': 'Sufficient Assumption',
    'Main Conclusion': 'Main Point',
    'Main Point': 'Main Point',
    'Role': 'Role',
    'Method': 'Method of Reasoning',
    'Method of Reasoning': 'Method of Reasoning',
    'Parallel Flaw': 'Parallel Flaw',
    'Parallel': 'Parallel Reasoning',
    'Parallel Reasoning': 'Parallel Reasoning',
    'Principle-Conform': 'Principle',
    'Principle': 'Principle',
    'Most Supported': 'Most Strongly Supported',
    'Agree/Disagree': 'Point at Issue',
    'Point at Issue': 'Point at Issue',
  };
  return map[raw] || raw || 'Unknown';
}

export class QuestionBank {
  private questions: Map<string, LRQuestion> = new Map();
  private manifest: QuestionManifest = {
    totalQuestions: 0,
    byPT: {},
    byQType: {},
    byDifficulty: {},
    sections: [],
  };

  async load(): Promise<void> {
    for (const filename of JSON_FILES) {
      try {
        const response = await fetch(filename);
        if (!response.ok) continue;
        
        const raw = await response.json();
        if (!Array.isArray(raw)) continue;

        const pt = parseInt(filename.match(/PT(\d+)/)?.[1] || '0');
        const section = parseInt(filename.match(/S(\d+)/)?.[1] || '0');
        let count = 0;

        for (const item of raw) {
          const qnum = item.questionNumber || 0;
          const qid = hashQid(pt, section, qnum);

          // Validate
          if (!item.answerChoices || !item.correctAnswer || !item.questionStem) {
            console.warn(`Invalid question: ${qid}`);
            continue;
          }

          const difficulty = item.questionDifficulty || item.Question_Difficulty || 3;
          const qtype = normalizeQType(item.questionType || '');

          this.questions.set(qid, {
            qid,
            pt,
            section,
            qnum,
            qtype,
            reasoningType: item.reasoningType,
            difficulty,
            stimulus: item.stimulus,
            questionStem: item.questionStem,
            answerChoices: item.answerChoices,
            correctAnswer: item.correctAnswer,
            breakdown: item.breakdown,
            answerChoiceExplanations: item.answerChoiceExplanations,
          });

          count++;
        }

        if (count > 0) {
          this.manifest.sections.push({
            pt,
            section,
            count,
            filename,
          });
        }
      } catch (err) {
        console.error(`Failed to load ${filename}:`, err);
      }
    }

    // Build manifest
    this.manifest.totalQuestions = this.questions.size;
    
    for (const q of this.questions.values()) {
      this.manifest.byPT[`PT${q.pt}`] = (this.manifest.byPT[`PT${q.pt}`] || 0) + 1;
      this.manifest.byQType[q.qtype] = (this.manifest.byQType[q.qtype] || 0) + 1;
      this.manifest.byDifficulty[q.difficulty] = (this.manifest.byDifficulty[q.difficulty] || 0) + 1;
    }

    console.log('Question bank loaded:', this.manifest);
  }

  getManifest(): QuestionManifest {
    return this.manifest;
  }

  getQuestion(qid: string): LRQuestion | undefined {
    return this.questions.get(qid);
  }

  getAllQuestions(): LRQuestion[] {
    return Array.from(this.questions.values());
  }

  getQuestionsByFilter(filters: {
    qtypes?: string[];
    difficulties?: number[];
    pts?: number[];
  }): LRQuestion[] {
    return this.getAllQuestions().filter((q) => {
      if (filters.qtypes && filters.qtypes.length > 0 && !filters.qtypes.includes(q.qtype)) {
        return false;
      }
      if (filters.difficulties && filters.difficulties.length > 0 && !filters.difficulties.includes(q.difficulty)) {
        return false;
      }
      if (filters.pts && filters.pts.length > 0 && !filters.pts.includes(q.pt)) {
        return false;
      }
      return true;
    });
  }

  getSection(pt: number, section: number): LRQuestion[] {
    return this.getAllQuestions()
      .filter(q => q.pt === pt && q.section === section)
      .sort((a, b) => a.qnum - b.qnum);
  }

  shuffleQuestions(questions: LRQuestion[]): LRQuestion[] {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Singleton instance
export const questionBank = new QuestionBank();
