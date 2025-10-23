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
  '/data/PT118-S1-LR.json',
  '/data/PT118-S4-LR.json',
  // Fifth batch - PT102
  '/data/PT102-S2-LR.json',
  '/data/PT102-S3-LR.json',
  // Sixth batch - PT112
  '/data/PT112-S1-LR.json',
  '/data/PT112-S3-LR.json',
  '/data/PT112-S4-LR.json',
  // Seventh batch - PT113
  '/data/PT113-S2-LR.json',
  '/data/PT113-S3-LR.json',
  '/data/PT113-S4-LR.json',
  // Eighth batch - PT119
  '/data/PT119-S2-LR.json',
  '/data/PT119-S3-LR.json',
  '/data/PT119-S4-LR.json',
  // Ninth batch - PT121
  '/data/PT121-S1-LR.json',
  '/data/PT121-S4-LR.json',
  // Tenth batch - PT122
  '/data/PT122-S1-LR.json',
  '/data/PT122-S2-LR.json',
  '/data/PT122-S4-LR.json',
  // Eleventh batch - PT123
  '/data/PT123-S2-LR.json',
  '/data/PT123-S3-LR.json',
  // Twelfth batch - PT124
  '/data/PT124-S1-LR.json',
  '/data/PT124-S2-LR.json',
  '/data/PT124-S3-LR.json',
  // Thirteenth batch - PT125
  '/data/PT125-S2-LR.json',
  '/data/PT125-S4-LR.json',
  // Fourteenth batch - PT126
  '/data/PT126-S1-LR.json',
  '/data/PT126-S3-LR.json',
  '/data/PT126-S4-LR.json',
  // Fifteenth batch - PT128
  '/data/PT128-S2-LR.json',
  '/data/PT128-S3-LR.json',
  // Sixteenth batch - PT129
  '/data/PT129-S1-LR.json',
  '/data/PT129-S2-LR.json',
  '/data/PT129-S3-LR.json',
  // Seventeenth batch - PT130
  '/data/PT130-S1-LR.json',
  '/data/PT130-S3-LR.json',
  // Eighteenth batch - PT131
  '/data/PT131-S1-LR.json',
  '/data/PT131-S2-LR.json',
  '/data/PT131-S3-LR.json',
  // Nineteenth batch - PT132
  '/data/PT132-S2-LR.json',
  '/data/PT132-S4-LR.json',
  // Twentieth batch - PT133
  '/data/PT133-S1-LR.json',
  '/data/PT133-S2-LR.json',
  '/data/PT133-S3-LR.json',
  // Twenty-first batch - PT134
  '/data/PT134-S1-LR.json',
  // Twenty-second batch - PT136, PT137, PT138, PT139
  '/data/PT136-S2-LR.json',
  '/data/PT136-S4-LR.json',
  '/data/PT137-S2-LR.json',
  '/data/PT137-S3-LR.json',
  '/data/PT137-S4-LR.json',
  '/data/PT138-S2-LR.json',
  '/data/PT139-S1-LR.json',
  '/data/PT139-S4-LR.json',
];

// Simple hash for qid generation
function hashQid(pt: number, section: number, qnum: number): string {
  return `PT${pt}-S${section}-Q${qnum}`;
}

// Canonical LR Question Type Taxonomy (grouped and ordered)
export const CANONICAL_QTYPES = {
  groups: [
    {
      name: 'ASSUMPTION / OBJECTION',
      types: [
        'Flaw',
        'Necessary Assumption',
        'Weaken',
        'Strengthen',
        'Sufficient Assumption',
        'Principle-Strengthen',
        'Evaluate'
      ]
    },
    {
      name: 'INFERENCE',
      types: [
        'Most Strongly Supported',
        'Must Be True',
        'Agree/Disagree',
        'Must Be False'
      ]
    },
    {
      name: 'MATCH',
      types: [
        'Method of Reasoning',
        'Main Conclusion',
        'Parallel Flaw',
        'Role',
        'Parallel Reasoning',
        'Principle-Conform'
      ]
    },
    {
      name: 'OTHER',
      types: ['Paradox']
    }
  ],
  // Flat list of all canonical types
  allTypes: [
    'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
    'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
    'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
    'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox'
  ]
};

// Comprehensive synonym mapping to canonical types
const TYPE_SYNONYMS: Record<string, string> = {
  // Flaw variants
  'Flaw': 'Flaw',
  'Flaw in Reasoning': 'Flaw',
  'Error in Reasoning': 'Flaw',
  
  // Assumption variants
  'Necessary Assumption': 'Necessary Assumption',
  'Assumption': 'Necessary Assumption',
  'Sufficient Assumption': 'Sufficient Assumption',
  
  // Strengthen/Weaken variants
  'Strengthen': 'Strengthen',
  'Weaken': 'Weaken',
  'Justify the Exception': 'Strengthen',
  
  // Principle variants
  'Principle-Strengthen': 'Principle-Strengthen',
  'Principle: Strengthen': 'Principle-Strengthen',
  'Principle: Justify': 'Principle-Strengthen',
  'Principle-Conform': 'Principle-Conform',
  'Principle: Conform': 'Principle-Conform',
  'Principle: Underlying': 'Principle-Conform',
  'Principle': 'Principle-Conform',
  
  // Evaluation
  'Evaluate': 'Evaluate',
  'Evaluate the Argument': 'Evaluate',
  
  // Inference variants
  'Most Strongly Supported': 'Most Strongly Supported',
  'Most Supported': 'Most Strongly Supported',
  'Main Point': 'Main Conclusion',
  'Main Conclusion': 'Main Conclusion',
  'Must Be True': 'Must Be True',
  'Must be True': 'Must Be True',
  'Must Be False': 'Must Be False',
  
  // Agreement/Disagreement
  'Agree/Disagree': 'Agree/Disagree',
  'Point at Issue': 'Agree/Disagree',
  'Point of Agreement': 'Agree/Disagree',
  'Disagree': 'Agree/Disagree',
  
  // Method and Role
  'Method of Reasoning': 'Method of Reasoning',
  'Method': 'Method of Reasoning',
  'Role': 'Role',
  'Role in the Argument': 'Role',
  
  // Parallel
  'Parallel Reasoning': 'Parallel Reasoning',
  'Parallel': 'Parallel Reasoning',
  'Parallel Flaw': 'Parallel Flaw',
  
  // Paradox
  'Paradox': 'Paradox',
  'Resolve the Paradox': 'Paradox',
  'Explain the Discrepancy': 'Paradox',
};

// Infer question type from question stem using regex patterns
function inferTypeFromStem(stem: string): string {
  const lower = stem.toLowerCase();
  
  // Paradox patterns
  if (lower.includes('explain') && (lower.includes('discrepancy') || lower.includes('paradox') || 
      lower.includes('apparent conflict') || lower.includes('seemingly contradictory'))) {
    return 'Paradox';
  }
  
  // Weaken patterns
  if (lower.includes('weaken') || lower.includes('undermines') || lower.includes('casts doubt') ||
      lower.includes('calls into question')) {
    return 'Weaken';
  }
  
  // Strengthen patterns
  if (lower.includes('strengthen') || lower.includes('supports') || lower.includes('justifies')) {
    return 'Strengthen';
  }
  
  // Flaw patterns
  if (lower.includes('flaw') || lower.includes('error') || lower.includes('vulnerable to criticism')) {
    return 'Flaw';
  }
  
  // Assumption patterns
  if (lower.includes('assumption') && (lower.includes('requires') || lower.includes('depends'))) {
    return 'Necessary Assumption';
  }
  if (lower.includes('assumption') && lower.includes('if assumed')) {
    return 'Sufficient Assumption';
  }
  
  // Must Be True / Most Supported
  if (lower.includes('must be true') || lower.includes('properly inferred')) {
    return 'Must Be True';
  }
  if (lower.includes('most (strongly )?supported') || lower.includes('most justifies')) {
    return 'Most Strongly Supported';
  }
  
  // Main Conclusion
  if (lower.includes('main (point|conclusion)') || lower.includes('expresses the (main )?conclusion')) {
    return 'Main Conclusion';
  }
  
  // Method of Reasoning
  if (lower.includes('proceeds by') || lower.includes('method') || lower.includes('technique of argumentation')) {
    return 'Method of Reasoning';
  }
  
  // Role
  if (lower.includes('role') || lower.includes('claim.*figures')) {
    return 'Role';
  }
  
  // Parallel
  if (lower.includes('parallel') && lower.includes('flaw')) {
    return 'Parallel Flaw';
  }
  if (lower.includes('parallel') || lower.includes('most similar') || lower.includes('same pattern')) {
    return 'Parallel Reasoning';
  }
  
  // Principle
  if (lower.includes('principle') && (lower.includes('justify') || lower.includes('support'))) {
    return 'Principle-Strengthen';
  }
  if (lower.includes('principle') && (lower.includes('conform') || lower.includes('illustrate'))) {
    return 'Principle-Conform';
  }
  
  // Agree/Disagree
  if (lower.includes('disagree') || lower.includes('point.*issue') || lower.includes('dispute')) {
    return 'Agree/Disagree';
  }
  
  // Evaluate
  if (lower.includes('evaluate') || lower.includes('useful to know')) {
    return 'Evaluate';
  }
  
  return 'Unknown';
}

// Robust normalization with synonym mapping and stem inference
function normalizeQType(raw: string, questionStem?: string): string {
  if (!raw || raw.trim() === '') {
    if (questionStem) return inferTypeFromStem(questionStem);
    return 'Unknown';
  }
  
  const trimmed = raw.trim();
  
  // Check if it's already a canonical type
  if (CANONICAL_QTYPES.allTypes.includes(trimmed)) {
    return trimmed;
  }
  
  // Check synonym map
  if (TYPE_SYNONYMS[trimmed]) {
    return TYPE_SYNONYMS[trimmed];
  }
  
  // Check if it looks like corrupted data (starts with article, contains speaker tags, or is a sentence fragment)
  const isCorrupted = /^(A |An |The |Advertisement|[A-Z][a-z]+ (said|argued|claims))/.test(trimmed) ||
                      trimmed.length > 50 ||
                      /\s{2,}/.test(trimmed);
  
  if (isCorrupted && questionStem) {
    const inferred = inferTypeFromStem(questionStem);
    if (inferred !== 'Unknown') {
      return inferred;
    }
  }
  
  // Last resort: return as-is and log
  console.warn(`Unknown question type encountered: "${trimmed}"`);
  return 'Unknown';
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
          const qtype = normalizeQType(item.questionType || '', item.questionStem);

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

    // Log summary with unknown types
    const unknownCount = this.manifest.byQType['Unknown'] || 0;
    const uniqueTypes = Object.keys(this.manifest.byQType).length;
    console.log('Question bank loaded:', {
      total: this.manifest.totalQuestions,
      uniqueTypes,
      unknownCount,
      types: Object.keys(this.manifest.byQType).sort()
    });
    
    if (unknownCount > 0) {
      const unknownQuestions = Array.from(this.questions.values())
        .filter(q => q.qtype === 'Unknown')
        .slice(0, 5);
      console.warn(`Found ${unknownCount} questions with unknown types. Sample:`, 
        unknownQuestions.map(q => ({ qid: q.qid, stem: q.questionStem.substring(0, 80) })));
    }
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
