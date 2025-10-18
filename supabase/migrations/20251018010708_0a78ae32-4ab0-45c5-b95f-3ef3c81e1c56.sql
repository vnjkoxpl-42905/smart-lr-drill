-- Create concept_library table for core LSAT concepts
CREATE TABLE concept_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_name text NOT NULL UNIQUE,
  reasoning_type text,
  category text,
  explanation text NOT NULL,
  keywords text[],
  application text,
  examples text,
  related_concepts text[],
  created_at timestamptz DEFAULT now()
);

-- Create question_type_strategies table for question type mastery
CREATE TABLE question_type_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL UNIQUE,
  category text NOT NULL,
  stem_keywords text[],
  reading_strategy text NOT NULL,
  answer_strategy text NOT NULL,
  correct_answer_patterns text,
  wrong_answer_patterns text,
  prephrase_goal text,
  related_reasoning_types text[],
  difficulty_indicators text,
  created_at timestamptz DEFAULT now()
);

-- Create reasoning_type_guidance table for reasoning pattern mastery
CREATE TABLE reasoning_type_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoning_type text NOT NULL UNIQUE,
  description text NOT NULL,
  key_indicators text[],
  common_flaws text[],
  strengthen_tactics text,
  weaken_tactics text,
  relevant_question_types text[],
  examples text,
  created_at timestamptz DEFAULT now()
);

-- Create tactical_patterns table for specific tactics
CREATE TABLE tactical_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL,
  pattern_type text NOT NULL,
  reasoning_type text,
  question_types text[],
  description text NOT NULL,
  formula text,
  application text,
  examples text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE concept_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_type_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_type_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_patterns ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required)
CREATE POLICY "Knowledge is public" ON concept_library FOR SELECT USING (true);
CREATE POLICY "Strategies are public" ON question_type_strategies FOR SELECT USING (true);
CREATE POLICY "Guidance is public" ON reasoning_type_guidance FOR SELECT USING (true);
CREATE POLICY "Patterns are public" ON tactical_patterns FOR SELECT USING (true);

-- Populate concept_library with core LSAT concepts
INSERT INTO concept_library (concept_name, reasoning_type, category, explanation, keywords, application, related_concepts) VALUES
('Alternative Explanation', 'Causation', 'tactic', 'A different causal story that could explain the puzzling fact without the author''s proposed cause. Includes reverse causality (effect causes cause) and third factors (separate cause explains both).', ARRAY['reverse causality', 'third factor', 'confounding variable', 'correlation not causation'], 'Use to weaken causal arguments by showing the effect could happen without the proposed cause, or showing a different explanation fits the facts.', ARRAY['Reverse Causality', 'Third Factor']),

('No Cause No Effect (NCE)', 'Causation', 'tactic', 'Strengthens causal claims by showing that when the cause is absent, the effect is also absent. Demonstrates covariation between cause and effect.', ARRAY['covariation', 'no cause no effect', 'absence', 'when cause absent effect absent'], 'Use to strengthen causal arguments by demonstrating the cause and effect vary together. Shows the effect depends on the cause.', ARRAY['Covariation', 'Strengthen Causation']),

('Cause without Effect', 'Causation', 'tactic', 'Weakens causal claims by showing the proposed cause occurred but the effect did not. Breaks the proposed causal link.', ARRAY['cause present effect absent', 'Cw/oE'], 'Use to weaken causal arguments by showing instances where the cause happened but the effect did not follow.', ARRAY['Weaken Causation']),

('Effect without Cause', 'Causation', 'tactic', 'Weakens causal claims by showing the effect occurred but the proposed cause did not. Suggests the cause is not necessary for the effect.', ARRAY['effect present cause absent', 'Ew/oC'], 'Use to weaken causal arguments by showing the effect can occur without the proposed cause.', ARRAY['Weaken Causation']),

('Key Difference-Maker', 'Comparison', 'tactic', 'The key factor that explains a discrepancy between two groups or situations. The difference that makes a difference in explaining puzzling comparisons.', ARRAY['comparison', 'discrepancy', 'key difference', 'relevant difference'], 'Use in Paradox/Resolve questions to identify what factor explains why two similar situations had different outcomes.', ARRAY['Comparison Reasoning']),

('Contrapositive', 'Conditional Logic', 'principle', 'If A→B, then ~B→~A. The logically equivalent statement formed by negating and reversing a conditional. The only valid way to "reverse" a conditional.', ARRAY['contrapositive', 'negate and reverse', 'flip and negate'], 'Use to make valid inferences from conditional statements. When you know the necessary condition is false, you can conclude the sufficient condition is false.', ARRAY['Conditional Logic', 'Valid Inference']),

('Illegal Reversal', 'Conditional Logic', 'flaw', 'The famous flaw of confusing necessary and sufficient conditions. Reading a conditional backward: If A→B, incorrectly concluding B→A.', ARRAY['backward', 'confusing necessary sufficient', 'affirm consequent'], 'Recognize this flaw in Flaw questions. The author assumes that because B happened (necessary), A must have happened (sufficient). But B could happen without A.', ARRAY['Conditional Flaw', 'Necessary vs Sufficient']),

('Illegal Negation', 'Conditional Logic', 'flaw', 'Incorrectly negating both sides of a conditional without reversing: If A→B, incorrectly concluding ~A→~B.', ARRAY['negate both sides', 'deny antecedent'], 'Recognize this flaw. Just because A doesn''t happen doesn''t mean B won''t happen. B could happen for other reasons.', ARRAY['Conditional Flaw']),

('Missing Link Connector', 'All', 'tactic', 'Connects a gap between evidence and conclusion by linking two previously unconnected concepts. Classic Necessary Assumption pattern.', ARRAY['gap', 'missing link', 'connect terms'], 'In Necessary/Sufficient Assumption questions, identify new terms in the conclusion not mentioned in evidence. The answer will connect them.', ARRAY['Assumption Strategy']),

('Causal Defender', 'Causation', 'tactic', 'Defends a causal argument against an unstated objection, typically by ruling out alternative explanations or strengthening the causal link.', ARRAY['defend', 'rule out alternatives', 'block objection'], 'In Necessary Assumption questions with causal reasoning, the answer often defends against the objection that something else caused the effect.', ARRAY['Necessary Assumption', 'Causation']),

('Covariation', 'Causation', 'principle', 'The principle that a true cause should vary with its effect. When the cause increases/decreases, the effect should increase/decrease. When cause is absent, effect is absent.', ARRAY['vary together', 'correlation', 'dose-response'], 'Used to strengthen causal claims. The more the cause and effect move together, the stronger the causal claim.', ARRAY['No Cause No Effect', 'Strengthen Causation']);

-- Populate question_type_strategies
INSERT INTO question_type_strategies (question_type, category, stem_keywords, reading_strategy, answer_strategy, correct_answer_patterns, wrong_answer_patterns, prephrase_goal, related_reasoning_types) VALUES

('Flaw', 'Closed', ARRAY['vulnerable to criticism', 'flawed', 'questionable', 'reasoning error', 'fails to consider'], 
'Be the Anti-Conclusion''s Lawyer. About 40% commit Famous Flaws (conditional flaw, causation flaw, sampling flaw, etc). 60% commit unique flaws. Focus on finding what the author assumed or failed to consider.',
'Ask: Is this descriptively true? (Did they actually do this?) If yes, is it objectionable? (Is this actually a problem?)',
'Accurately describes the reasoning error in the argument. Points out an unjustified assumption or failure to consider relevant possibilities.',
'Not True (they didn''t assume that / didn''t fail to consider that), Not Objectionable (that assumption is reasonable / not considering that is fine), Out of Scope (describes something the argument didn''t do)',
'Try to predict the flaw before reading answers. What did they assume? What alternative explanation did they ignore? Did they confuse necessity and sufficiency?',
ARRAY['Causation', 'Conditional Logic', 'Sampling']),

('Necessary Assumption', 'Closed', ARRAY['depends on assuming', 'requires assuming', 'presupposes', 'relies on assumption'],
'Hunt for the Gap between evidence and conclusion. Look for either: (1) Missing Link - new terms in conclusion not in evidence, or (2) Causal Defender - ruling out alternative explanations.',
'Use the Negation Test: Negate the answer choice. Does the argument fall apart? If yes, it''s necessary. The correct answer connects gaps or defends against objections.',
'Either connects previously unlinked concepts (Missing Link) or defends the argument against an unstated objection (Causal Defender). When negated, destroys the argument.',
'Too Strong (goes beyond what''s needed - remember this is necessary not sufficient), Irrelevant (doesn''t connect to the gap), Reverses Logic (gets the direction backward)',
'Identify the gap: What''s in the conclusion that wasn''t in the evidence? What objection could be raised against the argument?',
ARRAY['Causation', 'Conditional Logic', 'All']),

('Strengthen', 'Open', ARRAY['strengthen', 'support', 'provides evidence', 'most helps'],
'Read actively looking for the argument''s weak spots - what could go wrong? What alternative explanations exist? What assumptions were made?',
'Assume each answer is true. Ask: Does this make the conclusion more likely? Does it address a weakness or assumption in the argument?',
'For causal arguments: NCE, eliminate alternative explanations, show mechanism. For gaps: connects evidence to conclusion. For generalizations: representative sample.',
'Irrelevant (doesn''t touch the argument''s weak point), Weakens instead, Too Weak (doesn''t help enough), Addresses wrong assumption',
'What is the author assuming? What could go wrong with this argument? What would make the conclusion more likely?',
ARRAY['Causation', 'Comparison', 'All']),

('Weaken', 'Open', ARRAY['weaken', 'undermine', 'cast doubt', 'calls into question'],
'Be the Anti-Conclusion''s Lawyer. What''s wrong with this argument? What alternative explanation could there be? What did they fail to consider?',
'Assume each answer is true. Ask: Does this make the conclusion less likely? Does it point out a flaw or alternative explanation?',
'For causal arguments: Cw/oE, Ew/oC, provide alternative explanation. For gaps: shows the connection doesn''t hold. For generalizations: unrepresentative sample.',
'Irrelevant (doesn''t attack the argument), Strengthens instead, Too Weak (doesn''t hurt the argument enough)',
'What alternative explanation could there be? What assumption could be false? What would make the conclusion less likely?',
ARRAY['Causation', 'Comparison', 'All']),

('Must Be True', 'Closed', ARRAY['must be true', 'properly inferred', 'follows logically'],
'Treat the stimulus as 100% true. Look for facts, rules, and conditionals. See if conditionals chain or if facts trigger conditionals.',
'Be extremely conservative. The answer must be 100% certain based on the stimulus. If there''s any possibility it''s false, eliminate it.',
'Restates information from stimulus, combines facts, or uses valid conditional logic (triggering or chaining). Never goes beyond what''s stated.',
'Too Strong (claims more than stimulus proves), Reverses Logic (illegal reversal of conditional), Could Be True But Not Must Be True, Opposite',
'Look for conditional chains, facts that trigger rules, or direct combinations of stated facts.',
ARRAY['Conditional Logic', 'All']),

('Sufficient Assumption', 'Open', ARRAY['conclusion follows logically if which', 'assumption would justify', 'conclusion properly drawn if'],
'Find the gap between evidence and conclusion. The answer will completely fill that gap, making the argument airtight.',
'The correct answer, when added to the premises, will guarantee the conclusion. Often bridges gap between evidence and conclusion using conditional logic.',
'Creates an airtight logical connection, typically A→B where A is evidence and B is conclusion. Makes the argument win.',
'Too Weak (helps but doesn''t guarantee), Reverses Logic, Irrelevant',
'Identify the exact gap. What would make this conclusion 100% proven? Often involves connecting terms.',
ARRAY['Conditional Logic', 'All']),

('Paradox', 'Open', ARRAY['resolve', 'explain', 'reconcile', 'account for discrepancy'],
'Identify the two facts that seem to conflict. Don''t try to resolve it yourself - just understand what seems contradictory.',
'The correct answer explains how both facts can be true simultaneously. Often identifies a Key Difference-Maker between two groups or situations.',
'Provides additional information that shows why the seemingly contradictory facts both make sense. Identifies the key difference or mechanism.',
'Explains only one fact (not both), Deepens the paradox, Irrelevant information',
'What exactly seems contradictory? Why do these facts seem incompatible? What difference would explain this?',
ARRAY['Causation', 'Comparison', 'Curious Fact']),

('Main Conclusion', 'Closed', ARRAY['main conclusion', 'main point'],
'Identify claims that sound like conclusions (opinions, recommendations, predictions). Use Why/So tests: Why does author believe this? So what follows from this?',
'The main conclusion is what everything else supports. It''s the ultimate point. Everything else is evidence for it or intermediate conclusions toward it.',
'The statement that everything else in the argument supports, either directly or through intermediate conclusions.',
'Intermediate conclusion (supports main conclusion rather than being supported by everything), Premise (evidence), Too Strong/Weak',
'What is the author''s ultimate point? What is everything else building toward?',
ARRAY['All']),

('Method', 'Closed', ARRAY['argumentative strategy', 'proceeds by', 'uses technique'],
'Focus on how the argument works, not whether it works. What rhetorical move did the author make? What structure did they use?',
'Must be descriptively accurate about the argument''s structure and method. Describe what the author actually did.',
'Accurately describes the argumentative technique: analogies, counterexamples, attacking source, questioning assumptions, etc.',
'Not True (they didn''t do this), Describes content not method, Too vague or too specific',
'How did the author make their point? What technique or structure did they use?',
ARRAY['All']),

('Parallel', 'Closed', ARRAY['parallel', 'most similar reasoning', 'same pattern'],
'Diagram the argument structure abstractly: A→B, conclude B→A (for flaws). Or: All X are Y, Some X are Z, conclude Some Y are Z.',
'Match the abstract logical structure. For valid arguments, match the valid form. For flaws, match the specific flaw type.',
'Has identical logical structure to the stimulus argument. Same moves, same pattern, same flaw (if Parallel Flaw).',
'Different logical structure, Different flaw type, Different number of terms',
'What is the abstract pattern? If it''s a flaw, what specific flaw?',
ARRAY['Conditional Logic', 'All']),

('Role', 'Closed', ARRAY['role', 'function', 'claim plays role'],
'Identify the claim in question. Is it a conclusion (what''s being proven)? A premise (evidence)? An intermediate conclusion (both supported and supporting)?',
'Trace the logical relationships. What supports the claim in question? What does it support?',
'Accurately describes whether the claim is: main conclusion, intermediate conclusion, premise, background, opposing view being rebutted, etc.',
'Reverses support relationship, Confuses conclusion with premise, Describes different claim',
'Is this claim supported by other claims? Does it support other claims? Both?',
ARRAY['All']),

('Most Supported', 'Closed', ARRAY['most supported', 'best illustrated', 'example of principle'],
'Similar to Must Be True but allows for "most likely" rather than "certain." Still be conservative.',
'Look for the answer most strongly supported by the stimulus. It doesn''t have to be 100% certain, but should be the best supported option.',
'Strongly supported by stimulus information, though may not be absolutely certain. Better supported than all other options.',
'Too Strong (goes beyond what''s supported), Unsupported (not in stimulus), Worse supported than another option',
'What does the stimulus most strongly suggest? What''s the best supported inference?',
ARRAY['All']),

('Principle-Strengthen', 'Open', ARRAY['principle if valid', 'principle most helps'],
'Identify the gap or assumption. The principle will state a general rule that, if true, supports the conclusion.',
'The correct principle acts as a bridge or rule that makes the conclusion follow. Usually stated in conditional form.',
'A general rule that connects the evidence to the conclusion, making the argument stronger.',
'Too specific (not a general principle), Irrelevant principle, Principle that doesn''t help the argument',
'What general rule would justify this reasoning? What principle bridges the gap?',
ARRAY['Conditional Logic', 'All']);

-- Populate reasoning_type_guidance
INSERT INTO reasoning_type_guidance (reasoning_type, description, key_indicators, common_flaws, strengthen_tactics, weaken_tactics, relevant_question_types, examples) VALUES

('Causation', 
'Author claims X causes Y based on correlation or observation. Watch for alternative explanations, including reverse causality (Y causes X) and third factors (Z causes both X and Y).',
ARRAY['causes', 'leads to', 'results in', 'because of', 'due to', 'responsible for', 'brings about', 'produces', 'explains why'],
ARRAY['Alternative Explanation (including Reverse Causality and Third Factor)', 'Confusing Correlation with Causation', 'Failing to consider other possible causes'],
'Show No Cause No Effect (covariation), eliminate alternative explanations, show mechanism that connects cause to effect, show cause precedes effect temporally',
'Show Cause without Effect (cause present, effect absent), show Effect without Cause (effect present, cause absent), provide alternative explanation (reverse causality or third factor)',
ARRAY['Strengthen', 'Weaken', 'Necessary Assumption', 'Flaw', 'Paradox', 'Sufficient Assumption'],
'Correlation between ice cream sales and drowning deaths does not mean ice cream causes drowning. Third factor (summer heat) causes both.'),

('Conditional Logic', 
'Arguments using if/then rules or statements of necessity/sufficiency. Watch for illegal reversals (if A→B, incorrectly concluding B→A) and illegal negations (if A→B, incorrectly concluding ~A→~B). Only valid moves are: (1) affirm sufficient → conclude necessary, (2) deny necessary → deny sufficient (contrapositive).',
ARRAY['if', 'then', 'only if', 'unless', 'without', 'until', 'requires', 'necessary', 'sufficient', 'whenever', 'all', 'every', 'any', 'each', 'must', 'only', 'guarantees'],
ARRAY['Illegal Reversal (confusing necessary and sufficient)', 'Illegal Negation', 'Confusing And/Or in complex conditionals'],
'Chain conditionals together (if A→B and B→C, then A→C), use contrapositive correctly, affirm the sufficient condition or deny the necessary condition',
'Show the rule doesn''t apply to this case, show exceptions exist, show the conditional was used illegally (reversed or negated improperly)',
ARRAY['Must Be True', 'Sufficient Assumption', 'Flaw', 'Parallel', 'Parallel Flaw', 'Principle-Strengthen', 'Method'],
'If admitted to Yale, then scored high on LSAT (Yale→High LSAT). Contrapositive: If did not score high on LSAT, then not admitted to Yale (~High LSAT→~Yale). ILLEGAL: If scored high on LSAT, then admitted to Yale (reversal).'),

('Comparison', 
'Comparing two groups, situations, or time periods. Watch for the Key Difference-Maker - the relevant difference that explains why outcomes differed. Unrepresentative samples can also be an issue.',
ARRAY['compared to', 'more than', 'less than', 'unlike', 'whereas', 'in contrast', 'however', 'different from', 'similar to'],
ARRAY['Assuming compared groups are alike in all relevant respects', 'Ignoring the Key Difference-Maker', 'Unrepresentative sample'],
'Show the compared groups are similar in relevant respects (making comparison fair), eliminate alternative explanations for the difference, show the sample is representative',
'Show there''s a Key Difference-Maker (relevant difference) between the groups that explains the outcome, show the sample is unrepresentative or biased, show the groups differ in important ways',
ARRAY['Strengthen', 'Weaken', 'Necessary Assumption', 'Flaw', 'Paradox', 'Method'],
'Village A has more crime than Village B. But Village A is larger and has more poverty - these are Key Difference-Makers that explain the crime difference without needing to invoke other causes.'),

('Curious Fact', 
'Presenting a puzzling observation or surprising statistic that seems to need explanation. Often appears in Paradox/Resolve questions. The answer will provide information that makes the surprising fact make sense.',
ARRAY['surprisingly', 'puzzling', 'unexpected', 'despite', 'although', 'even though', 'yet', 'however'],
ARRAY['Failing to recognize what exactly is puzzling', 'Proposing explanation that only explains one fact but not the apparent contradiction'],
'Not applicable - Curious Fact is a reasoning type that appears in certain question types, not something you strengthen',
'Not applicable - Curious Fact is a reasoning type that appears in certain question types, not something you weaken',
ARRAY['Paradox', 'Most Supported', 'Principle-Conform'],
'Although the town installed speed cameras, traffic accidents increased. (The Paradox: cameras should reduce accidents. Resolution might be: cameras only installed at already-dangerous intersections.)'),

('Famous Flaws', 
'Recurring flaw patterns that appear frequently on the LSAT. Key ones: (1) Necessary vs Sufficient (conditional flaw), (2) Causation flaws (alt explanations), (3) Sampling flaws (unrepresentative), (4) Ad Hominem (attack source not argument), (5) Equivocation (term shift), (6) False Dichotomy (only two options when more exist).',
ARRAY['varies by flaw type'],
ARRAY['Necessary vs Sufficient Flaw', 'Alternative Explanation not considered (causation)', 'Unrepresentative Sample', 'Ad Hominem', 'Equivocation', 'False Dichotomy', 'Absence of Evidence used as Evidence of Absence'],
'Not applicable - these are flaws to recognize, not argument patterns to strengthen',
'Not applicable - these are flaws to recognize, not argument patterns to weaken',
ARRAY['Flaw', 'Parallel Flaw', 'Method', 'Necessary Assumption'],
'Necessary vs Sufficient: "Getting into Yale requires a high LSAT score. John has a high LSAT score. Therefore, John will get into Yale." (Flaw: Having necessary condition doesn''t guarantee sufficient condition.)');

-- Populate tactical_patterns
INSERT INTO tactical_patterns (pattern_name, pattern_type, reasoning_type, question_types, description, formula, application, examples) VALUES

('No Cause No Effect (NCE)', 'strengthen', 'Causation', ARRAY['Strengthen', 'Necessary Assumption'],
'Demonstrates that when the cause is absent, the effect is also absent. Supports covariation and causal relationship.',
'When ~Cause, then ~Effect. Shows cause and effect vary together.',
'Use when you need to strengthen a causal claim. Shows the effect depends on the cause by demonstrating covariation.',
'Claim: Exercise causes better mood. NCE: People who don''t exercise don''t have improved mood.'),

('Cause without Effect (Cw/oE)', 'weaken', 'Causation', ARRAY['Weaken'],
'Shows the proposed cause occurred but the effect did not, undermining the causal claim.',
'Cause present AND Effect absent. Breaks the causal link.',
'Use to weaken causal arguments by showing instances where cause happened without the effect following.',
'Claim: Caffeine causes increased alertness. Cw/oE: John drank coffee (cause) but felt no more alert (effect absent).'),

('Effect without Cause (Ew/oC)', 'weaken', 'Causation', ARRAY['Weaken'],
'Shows the effect occurred but the proposed cause did not, suggesting the cause is not necessary for the effect.',
'Effect present AND Cause absent. Shows effect can occur without the proposed cause.',
'Use to weaken causal arguments by showing the effect occurs even when the cause is absent.',
'Claim: Rain causes traffic jams. Ew/oC: There was a traffic jam (effect) but it didn''t rain (cause absent).'),

('Alternative Explanation', 'weaken', 'Causation', ARRAY['Weaken', 'Flaw', 'Paradox'],
'Provides a different causal story that could explain the facts without the author''s proposed cause. Includes reverse causality and third factors.',
'Instead of X causes Y, maybe Y causes X (reverse) or Z causes both X and Y (third factor).',
'Use to weaken causal arguments or resolve paradoxes by showing a different explanation fits the facts equally well or better.',
'Claim: Reading causes good vocabulary. Alt Explanation: Maybe good vocabulary causes more reading (reverse). Or maybe educated parents cause both reading and vocabulary (third factor).'),

('Missing Link Connector', 'assumption', NULL, ARRAY['Necessary Assumption', 'Sufficient Assumption'],
'Connects a gap between the evidence and conclusion by linking two previously unconnected concepts. Classic assumption pattern.',
'Evidence mentions A, Conclusion mentions B. Connect A→B or show A and B are related.',
'When there''s an obvious gap between terms in evidence and conclusion. Look for new concepts in the conclusion that weren''t in the premises.',
'Evidence: John is good at math. Conclusion: John will be a good engineer. Gap: Math skills and engineering success are unconnected. Missing Link: Being good at math is necessary/helpful for being a good engineer.'),

('Causal Defender', 'assumption', 'Causation', ARRAY['Necessary Assumption'],
'Defends a causal argument against an unstated objection by ruling out alternative explanations or other problems.',
'Rules out the objection that something else caused the effect, or that the correlation is coincidental.',
'In Necessary Assumption questions with causal reasoning, the answer often eliminates alternative explanations or shows the causal link is real.',
'Argument: Ice cream sales cause drowning (bad causal claim). Causal Defender would need to rule out: It''s not that summer heat causes both ice cream sales and drowning.'),

('Key Difference-Maker', 'resolve', 'Comparison', ARRAY['Paradox', 'Weaken', 'Strengthen'],
'The relevant difference between two groups/situations that explains the discrepancy in outcomes.',
'Group A and Group B had different outcomes. The Key DM explains why - it''s the relevant difference between them.',
'Use in Paradox questions involving comparisons. The difference that explains why seemingly similar situations had different outcomes.',
'Village A has more crime than Village B (puzzling if they seem similar). Key DM: Village A is much larger and has more poverty - these differences explain the crime difference.'),

('Contrapositive Logic', 'inference', 'Conditional Logic', ARRAY['Must Be True', 'Sufficient Assumption', 'Method'],
'If A→B, then ~B→~A. The only valid way to "reverse" a conditional by negating both sides and flipping.',
'A→B becomes ~B→~A. This is logically equivalent and always valid.',
'Use to make valid inferences from conditional statements. When you know the necessary condition is false, conclude the sufficient is false.',
'Rule: All admitted students scored high (Admitted→High Score). Contrapositive: Anyone who didn''t score high wasn''t admitted (~High Score→~Admitted).'),

('Conditional Chaining', 'inference', 'Conditional Logic', ARRAY['Must Be True', 'Sufficient Assumption'],
'Combining multiple conditional rules to derive a new conditional relationship by connecting them.',
'If A→B and B→C, then A→C. Connect when same idea appears on opposite sides (or opposite ideas on same sides).',
'When you have multiple conditional rules, look to chain them together to derive new inferences.',
'A→B, B→C, C→D chains to A→D. If A happens, D must happen.'),

('Illegal Reversal Recognition', 'flaw', 'Conditional Logic', ARRAY['Flaw', 'Parallel Flaw'],
'Recognizing when an argument commits the Necessary vs Sufficient flaw by reading a conditional backward.',
'Rule is A→B. Author observes B and concludes A. (Illegal because B can happen without A.)',
'Recognize this is the #1 Famous Flaw. Author confuses necessary and sufficient conditions.',
'Rule: NYC→USA (If in NYC, then in USA). Author sees someone in USA and concludes they''re in NYC. (Illegal Reversal - many other places in USA besides NYC.)'),

('Sampling Flaw Recognition', 'flaw', NULL, ARRAY['Flaw', 'Weaken', 'Necessary Assumption'],
'Recognizing when a sample is unrepresentative or biased, making generalizations invalid.',
'Sample has characteristic X. Conclusion: Whole population has X. Flaw: Sample is unrepresentative.',
'Watch for polling only certain types of people, or samples that differ from the target population in relevant ways.',
'Surveyed 1000 country club members about income. Concluded: Americans are wealthy. (Flaw: country club members are unrepresentative - much wealthier than typical Americans.)'),

('Term Shift Recognition', 'flaw', NULL, ARRAY['Flaw', 'Necessary Assumption', 'Parallel Flaw'],
'Recognizing when a term changes meaning between premise and conclusion (equivocation).',
'Evidence uses "successful" to mean financially profitable. Conclusion uses "successful" to mean artistically meaningful. Different meanings.',
'Watch for terms that could have multiple meanings, or when premise and conclusion seem to use same word differently.',
'Banks are financial institutions (institutions = organizations). Schools are educational institutions (institutions = established practices). Concluded: Banks and schools are the same type of thing. (Term shift on "institution".)');

CREATE INDEX idx_concept_library_reasoning_type ON concept_library(reasoning_type);
CREATE INDEX idx_concept_library_category ON concept_library(category);
CREATE INDEX idx_question_type_strategies_type ON question_type_strategies(question_type);
CREATE INDEX idx_reasoning_type_guidance_type ON reasoning_type_guidance(reasoning_type);
CREATE INDEX idx_tactical_patterns_type ON tactical_patterns(pattern_type);
CREATE INDEX idx_tactical_patterns_reasoning ON tactical_patterns(reasoning_type);