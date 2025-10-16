import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Brain, Target, TrendingUp, Zap } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            PRP — LR SmartDrill
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Adaptive LSAT Logical Reasoning practice that learns from your mistakes
            and serves the next best question to boost accuracy and timing.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate('/drill')}>
              Start Smart Drill
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')}>
              View Dashboard
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 max-w-6xl mx-auto">
          <Card className="p-6 space-y-4 border-2">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Adaptive Learning</h3>
            <p className="text-sm text-muted-foreground">
              Algorithm picks the next question based on your weakest question types and difficulty level.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Focused Practice</h3>
            <p className="text-sm text-muted-foreground">
              One question at a time with instant feedback, detailed solutions, and reading tools.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Track Progress</h3>
            <p className="text-sm text-muted-foreground">
              Dashboard shows accuracy, timing, and grayscale heatmaps by question type and difficulty.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Real LSAT Questions</h3>
            <p className="text-sm text-muted-foreground">
              Practice with official LSAT LR questions from PT101-PT106, organized and optimized.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing;
