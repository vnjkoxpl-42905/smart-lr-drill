import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { questionBank, LRQuestion } from '@/lib/questionLoader';
import { AdaptiveEngine, AttemptRecord, StudentAbility } from '@/lib/adaptiveEngine';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Highlighter } from 'lucide-react';
import { toast } from 'sonner';

const Drill = () => {
  const navigate = useNavigate();
  const [engine] = useState(() => new AdaptiveEngine());
  const [currentQuestion, setCurrentQuestion] = useState<LRQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [ability, setAbility] = useState<StudentAbility>({ overall: 3, byQType: {} });
  const [questionNumber, setQuestionNumber] = useState(1);

  // Load next question
  const loadNextQuestion = () => {
    const pool = questionBank.getAllQuestions();
    const next = engine.selectNextQuestion(pool, ability);
    
    if (next) {
      setCurrentQuestion(next);
      setSelectedAnswer(null);
      setShowSolution(false);
      setStartTime(Date.now());
    } else {
      toast.error('No questions available');
    }
  };

  useEffect(() => {
    loadNextQuestion();
  }, []);

  const handleSubmit = () => {
    if (!currentQuestion || !selectedAnswer) return;

    const timeMs = Date.now() - startTime;
    const correct = selectedAnswer === currentQuestion.correctAnswer;

    const attempt: AttemptRecord = {
      qid: currentQuestion.qid,
      correct,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      difficulty: currentQuestion.difficulty,
      timestamp: new Date(),
    };

    engine.recordAttempt(attempt);
    const newAttempts = [...attempts, attempt];
    setAttempts(newAttempts);
    setAbility(engine.calculateAbility(newAttempts));
    setShowSolution(true);

    if (correct) {
      toast.success('Correct!');
    } else {
      toast.error('Incorrect');
    }
  };

  const handleNext = () => {
    setQuestionNumber(questionNumber + 1);
    loadNextQuestion();
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading questions...</p>
      </div>
    );
  }

  const choices = ['A', 'B', 'C', 'D', 'E'] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-6">
              <div className="text-sm text-muted-foreground">
                Question {questionNumber}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>{currentQuestion.qtype}</span>
              </div>
              <div className="text-sm px-3 py-1 rounded-full bg-secondary">
                Level {currentQuestion.difficulty}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 space-y-8">
          {/* Stimulus */}
          {currentQuestion.stimulus && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Highlighter className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-sm text-muted-foreground">Stimulus</h3>
              </div>
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {currentQuestion.stimulus}
              </p>
            </div>
          )}

          {/* Question Stem */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Question</h3>
            <p className="text-base font-medium leading-relaxed">
              {currentQuestion.questionStem}
            </p>
          </div>

          {/* Answer Choices */}
          <div className="space-y-3">
            {choices.map((choice) => {
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === currentQuestion.correctAnswer;
              const showCorrect = showSolution && isCorrect;
              const showIncorrect = showSolution && isSelected && !isCorrect;

              return (
                <button
                  key={choice}
                  onClick={() => !showSolution && setSelectedAnswer(choice)}
                  disabled={showSolution}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${isSelected && !showSolution ? 'border-primary bg-secondary' : 'border-border'}
                    ${showCorrect ? 'border-green-500 bg-green-50' : ''}
                    ${showIncorrect ? 'border-red-500 bg-red-50' : ''}
                    ${!showSolution ? 'hover:border-muted-foreground cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <div className="flex gap-4">
                    <span className="font-semibold text-primary">{choice}.</span>
                    <span className="flex-1">{currentQuestion.answerChoices[choice]}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            {!showSolution ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                size="lg"
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} size="lg">
                Next Question
              </Button>
            )}
          </div>

          {/* Solution */}
          {showSolution && (
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Solution</h3>
                <span className="text-sm text-muted-foreground">
                  Correct Answer: {currentQuestion.correctAnswer}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Time: {Math.round((Date.now() - startTime) / 1000)}s • 
                Current Ability: {ability.overall.toFixed(1)}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Drill;
