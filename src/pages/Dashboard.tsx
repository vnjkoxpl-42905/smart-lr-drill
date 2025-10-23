import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Target, Clock, Flag, XCircle } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const Dashboard = () => {
  const navigate = useNavigate();
  const { manifest, isLoading } = useQuestionBank();
  const reviewTools = useScrollAnimation();
  const overviewCards = useScrollAnimation();
  const questionBank = useScrollAnimation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Failed to load question bank</p>
      </div>
    );
  }

  const qtypes = Object.entries(manifest.byQType).sort((a, b) => b[1] - a[1]);
  const difficulties = Object.entries(manifest.byDifficulty).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-lg sm:text-xl font-semibold">Dashboard</h1>
            <div className="w-16 sm:w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-6xl space-y-6 sm:space-y-8">
        {/* Review Tools */}
        <div 
          ref={reviewTools.ref}
          className={`grid sm:grid-cols-2 gap-4 sm:gap-6 transition-all duration-700 ${
            reviewTools.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Card 
            className="p-4 sm:p-6 hover:shadow-lg sm:hover:scale-[1.02] sm:hover:-translate-y-1 transition-all duration-200 cursor-pointer active:scale-95 min-h-[72px]"
            onClick={() => navigate('/flagged')}
          >
            <div className="flex items-center gap-3">
              <Flag className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Flagged Questions</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Review questions you marked during practice
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 sm:p-6 hover:shadow-lg sm:hover:scale-[1.02] sm:hover:-translate-y-1 transition-all duration-200 cursor-pointer active:scale-95 min-h-[72px]"
            onClick={() => navigate('/waj')}
          >
            <div className="flex items-center gap-3">
              <XCircle className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Wrong Answer Journal</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Track and learn from incorrect answers
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Overview Cards */}
        <div 
          ref={overviewCards.ref}
          className={`grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 transition-all duration-700 delay-150 ${
            overviewCards.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Card className="p-4 sm:p-6 space-y-2 hover:shadow-md sm:hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{manifest.totalQuestions}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Questions</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 space-y-2 hover:shadow-md sm:hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">0</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Questions Attempted</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 space-y-2 hover:shadow-md sm:hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">--</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Time</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Question Bank Manifest */}
        <div 
          ref={questionBank.ref}
          className={`space-y-4 sm:space-y-6 transition-all duration-700 delay-300 ${
            questionBank.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-xl sm:text-2xl font-semibold">Question Bank</h2>
          
          {/* By Section */}
          <Card className="p-4 sm:p-6 hover:shadow-md transition-all duration-200">
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">By Section</h3>
            <div className="space-y-1 sm:space-y-2 max-h-[300px] overflow-y-auto">
              {manifest.sections.map((sec) => (
                <div key={`${sec.pt}-${sec.section}`} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-xs sm:text-sm">PT{sec.pt} - Section {sec.section}</span>
                  <span className="text-xs sm:text-sm font-medium">{sec.count} questions</span>
                </div>
              ))}
            </div>
          </Card>

          {/* By Question Type */}
          <Card className="p-4 sm:p-6 hover:shadow-md transition-all duration-200">
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">By Question Type</h3>
            <div className="space-y-1 sm:space-y-2 max-h-[300px] overflow-y-auto">
              {qtypes.map(([qtype, count]) => (
                <div key={qtype} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-xs sm:text-sm">{qtype}</span>
                  <span className="text-xs sm:text-sm font-medium">{count} questions</span>
                </div>
              ))}
            </div>
          </Card>

          {/* By Difficulty */}
          <Card className="p-4 sm:p-6 hover:shadow-md transition-all duration-200">
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">By Difficulty</h3>
            <div className="space-y-1 sm:space-y-2">
              {difficulties.map(([level, count]) => (
                <div key={level} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-xs sm:text-sm">Level {level}</span>
                  <span className="text-xs sm:text-sm font-medium">{count} questions</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
